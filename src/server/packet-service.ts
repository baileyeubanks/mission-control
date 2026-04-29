import type { Packet, PacketCreateInput, PacketKind, PacketListQuery } from "../lib/packets";
import type { PacketModelClient } from "./model-client";
import { PACKET_REGISTRY, type PacketHandlerDefinition, type PacketInputMap, type PacketOutputMap } from "./packet-registry";
import type { PacketStore } from "./packet-store";

export class PacketValidationError extends Error {}

function toRecord(value: unknown): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

export class PacketService {
  constructor(
    private readonly store: PacketStore,
    private readonly modelClient: PacketModelClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createPacket(input: PacketCreateInput): Promise<{ packet: Packet; created: boolean }> {
    const definition = PACKET_REGISTRY[input.kind];
    const validation = definition.validateInput(input.input);
    if (validation.ok === false) {
      throw new PacketValidationError(validation.error);
    }

    const existing = await this.store.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return { packet: existing, created: false };
    }

    const packet = await this.store.createPacket(
      {
        kind: input.kind,
        source_surface: input.sourceSurface,
        entity_type: input.entityType || null,
        entity_id: input.entityId || null,
        requested_by: input.requestedBy || null,
        input_json: toRecord(validation.value),
        idempotency_key: input.idempotencyKey,
        model: definition.model,
        max_attempts: 3,
      },
      this.now(),
    );

    await this.store.appendEvent(
      packet.id,
      "packet_created",
      {
        kind: packet.kind,
        source_surface: packet.source_surface,
        entity_type: packet.entity_type,
        entity_id: packet.entity_id,
      },
      this.now(),
    );

    return { packet, created: true };
  }

  async getPacket(packetId: string): Promise<Packet | null> {
    return this.store.getPacket(packetId);
  }

  async listPackets(query: PacketListQuery): Promise<Packet[]> {
    return this.store.listPackets({
      ...query,
      limit: query.limit ?? 50,
    });
  }

  async retryPacket(packetId: string): Promise<Packet | null> {
    const packet = await this.store.retryPacket(packetId, this.now());
    if (!packet) return null;

    await this.store.appendEvent(packet.id, "packet_retried", { status: packet.status }, this.now());
    return packet;
  }

  async cancelPacket(packetId: string): Promise<Packet | null> {
    const packet = await this.store.cancelPacket(packetId, this.now());
    if (!packet) return null;

    await this.store.appendEvent(packet.id, "packet_cancelled", { status: packet.status }, this.now());
    return packet;
  }

  async requeueExpiredLeases(): Promise<Packet[]> {
    const packets = await this.store.requeueExpiredLeases(this.now());
    for (const packet of packets) {
      await this.store.appendEvent(packet.id, "packet_requeued", { reason: "lease_expired" }, this.now());
    }
    return packets;
  }

  async processNextPacket(leaseOwner: string, leaseMs: number): Promise<Packet | null> {
    const packet = await this.store.acquireNextQueuedPacket(leaseOwner, leaseMs, this.now());
    if (!packet) return null;

    await this.store.appendEvent(
      packet.id,
      "packet_started",
      {
        lease_owner: leaseOwner,
        attempt_count: packet.attempt_count,
      },
      this.now(),
    );

    const definition = PACKET_REGISTRY[packet.kind];

    try {
      const output = await this.executeHandler(packet.kind, definition, packet.input_json);
      const updated = await this.store.markSucceeded(packet.id, leaseOwner, output, this.now());
      if (!updated) return null;

      await this.store.appendEvent(
        updated.id,
        "packet_succeeded",
        {
          attempt_count: updated.attempt_count,
          status: updated.status,
        },
        this.now(),
      );

      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Packet execution failed.";
      const updated = await this.store.markFailed(
        packet.id,
        leaseOwner,
        {
          message,
          kind: packet.kind,
        },
        this.now(),
      );

      if (!updated) return null;

      await this.store.appendEvent(
        updated.id,
        updated.status === "queued" ? "packet_retry_scheduled" : "packet_failed",
        {
          attempt_count: updated.attempt_count,
          status: updated.status,
          message,
        },
        this.now(),
      );

      return updated;
    }
  }

  private async executeHandler<K extends PacketKind>(
    _kind: K,
    definition: PacketHandlerDefinition<K>,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const typedInput = input as unknown as PacketInputMap[K];
    try {
      if (definition.outputMode === "json") {
        const raw = await this.modelClient.generateJson({
          model: definition.model,
          prompt: definition.buildPrompt(typedInput),
          responseSchema: definition.responseSchema,
        });

        return toRecord(definition.normalizeOutput(raw));
      }

      const raw = await this.modelClient.generateText({
        model: definition.model,
        prompt: definition.buildPrompt(typedInput),
      });

      return toRecord(definition.normalizeOutput(raw));
    } catch (error) {
      console.warn(
        `[packet-service] external model unavailable for ${definition.kind}; using local advisory fallback`,
        error instanceof Error ? error.message : error,
      );
      return toRecord(definition.fallbackOutput(typedInput));
    }
  }
}
