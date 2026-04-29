import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Packet, PacketEvent, PacketKind, PacketListQuery } from "../lib/packets";

export interface CreatePacketRecord {
  kind: PacketKind;
  source_surface: string;
  entity_type: string | null;
  entity_id: string | null;
  requested_by: string | null;
  input_json: Record<string, unknown>;
  idempotency_key: string;
  model: string | null;
  max_attempts: number;
}

export interface PacketStore {
  findByIdempotencyKey(idempotencyKey: string): Promise<Packet | null>;
  createPacket(record: CreatePacketRecord, now: Date): Promise<Packet>;
  getPacket(packetId: string): Promise<Packet | null>;
  listPackets(query: PacketListQuery): Promise<Packet[]>;
  appendEvent(packetId: string, eventType: string, payload: Record<string, unknown> | null, now: Date): Promise<PacketEvent>;
  retryPacket(packetId: string, now: Date): Promise<Packet | null>;
  cancelPacket(packetId: string, now: Date): Promise<Packet | null>;
  acquireNextQueuedPacket(leaseOwner: string, leaseMs: number, now: Date): Promise<Packet | null>;
  markSucceeded(packetId: string, leaseOwner: string, output: Record<string, unknown>, now: Date): Promise<Packet | null>;
  markFailed(packetId: string, leaseOwner: string, error: Record<string, unknown>, now: Date): Promise<Packet | null>;
  requeueExpiredLeases(now: Date): Promise<Packet[]>;
}

type PacketRow = Record<string, any>;

function toPacket(row: PacketRow | null): Packet | null {
  if (!row) return null;

  return {
    id: String(row.id),
    kind: row.kind,
    status: row.status,
    source_surface: String(row.source_surface || ""),
    entity_type: row.entity_type ? String(row.entity_type) : null,
    entity_id: row.entity_id ? String(row.entity_id) : null,
    requested_by: row.requested_by ? String(row.requested_by) : null,
    input_json: row.input_json || {},
    output_json: row.output_json || null,
    error_json: row.error_json || null,
    idempotency_key: String(row.idempotency_key || ""),
    model: row.model ? String(row.model) : null,
    attempt_count: Number(row.attempt_count || 0),
    max_attempts: Number(row.max_attempts || 0),
    lease_owner: row.lease_owner ? String(row.lease_owner) : null,
    lease_expires_at: row.lease_expires_at ? String(row.lease_expires_at) : null,
    started_at: row.started_at ? String(row.started_at) : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function toPacketEvent(row: PacketRow): PacketEvent {
  return {
    id: String(row.id),
    packet_id: String(row.packet_id),
    event_type: String(row.event_type),
    payload_json: row.payload_json || null,
    created_at: String(row.created_at),
  };
}

function sortPacketsDescending(left: Packet, right: Packet): number {
  return right.created_at.localeCompare(left.created_at);
}

export class SupabasePacketStore implements PacketStore {
  constructor(private readonly client: SupabaseClient) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<Packet | null> {
    const { data, error } = await this.client
      .from("packets")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return toPacket(data);
  }

  async createPacket(record: CreatePacketRecord, now: Date): Promise<Packet> {
    const payload = {
      id: randomUUID(),
      kind: record.kind,
      status: "queued",
      source_surface: record.source_surface,
      entity_type: record.entity_type,
      entity_id: record.entity_id,
      requested_by: record.requested_by,
      input_json: record.input_json,
      output_json: null,
      error_json: null,
      idempotency_key: record.idempotency_key,
      model: record.model,
      attempt_count: 0,
      max_attempts: record.max_attempts,
      lease_owner: null,
      lease_expires_at: null,
      started_at: null,
      completed_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data, error } = await this.client.from("packets").insert(payload).select("*").single();
    if (error) throw error;
    const packet = toPacket(data);
    if (!packet) throw new Error("Failed to create packet.");
    return packet;
  }

  async getPacket(packetId: string): Promise<Packet | null> {
    const { data, error } = await this.client.from("packets").select("*").eq("id", packetId).maybeSingle();
    if (error) throw error;
    return toPacket(data);
  }

  async listPackets(query: PacketListQuery): Promise<Packet[]> {
    let request = this.client.from("packets").select("*").order("created_at", { ascending: false });

    if (query.entityType) request = request.eq("entity_type", query.entityType);
    if (query.entityId) request = request.eq("entity_id", query.entityId);
    if (query.status) request = request.eq("status", query.status);
    if (query.kind) request = request.eq("kind", query.kind);
    if (query.limit) request = request.limit(query.limit);

    const { data, error } = await request;
    if (error) throw error;
    return (data || []).map(toPacket).filter((packet): packet is Packet => Boolean(packet));
  }

  async appendEvent(
    packetId: string,
    eventType: string,
    payload: Record<string, unknown> | null,
    now: Date,
  ): Promise<PacketEvent> {
    const { data, error } = await this.client
      .from("packet_events")
      .insert({
        id: randomUUID(),
        packet_id: packetId,
        event_type: eventType,
        payload_json: payload,
        created_at: now.toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;
    return toPacketEvent(data);
  }

  async retryPacket(packetId: string, now: Date): Promise<Packet | null> {
    const packet = await this.getPacket(packetId);
    if (!packet || packet.status !== "failed") return null;

    const { data, error } = await this.client
      .from("packets")
      .update({
        status: "queued",
        lease_owner: null,
        lease_expires_at: null,
        started_at: null,
        completed_at: null,
        updated_at: now.toISOString(),
      })
      .eq("id", packetId)
      .eq("status", "failed")
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return toPacket(data);
  }

  async cancelPacket(packetId: string, now: Date): Promise<Packet | null> {
    const { data, error } = await this.client
      .from("packets")
      .update({
        status: "cancelled",
        lease_owner: null,
        lease_expires_at: null,
        completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", packetId)
      .in("status", ["queued", "running"])
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return toPacket(data);
  }

  async acquireNextQueuedPacket(leaseOwner: string, leaseMs: number, now: Date): Promise<Packet | null> {
    const { data, error } = await this.client
      .from("packets")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    const candidate = toPacket(data);
    if (!candidate) return null;

    const { data: updated, error: updateError } = await this.client
      .from("packets")
      .update({
        status: "running",
        attempt_count: candidate.attempt_count + 1,
        lease_owner: leaseOwner,
        lease_expires_at: new Date(now.getTime() + leaseMs).toISOString(),
        started_at: candidate.started_at || now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", candidate.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (updateError) throw updateError;
    return toPacket(updated);
  }

  async markSucceeded(packetId: string, leaseOwner: string, output: Record<string, unknown>, now: Date): Promise<Packet | null> {
    const { data, error } = await this.client
      .from("packets")
      .update({
        status: "succeeded",
        output_json: output,
        error_json: null,
        lease_owner: null,
        lease_expires_at: null,
        completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", packetId)
      .eq("status", "running")
      .eq("lease_owner", leaseOwner)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return toPacket(data);
  }

  async markFailed(packetId: string, leaseOwner: string, errorPayload: Record<string, unknown>, now: Date): Promise<Packet | null> {
    const packet = await this.getPacket(packetId);
    if (!packet || packet.status !== "running" || packet.lease_owner !== leaseOwner) {
      return null;
    }

    const nextStatus = packet.attempt_count < packet.max_attempts ? "queued" : "failed";
    const { data, error } = await this.client
      .from("packets")
      .update({
        status: nextStatus,
        error_json: errorPayload,
        lease_owner: null,
        lease_expires_at: null,
        completed_at: nextStatus === "failed" ? now.toISOString() : null,
        updated_at: now.toISOString(),
      })
      .eq("id", packetId)
      .eq("status", "running")
      .eq("lease_owner", leaseOwner)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return toPacket(data);
  }

  async requeueExpiredLeases(now: Date): Promise<Packet[]> {
    const { data, error } = await this.client
      .from("packets")
      .select("*")
      .eq("status", "running")
      .lt("lease_expires_at", now.toISOString());

    if (error) throw error;

    const expiredPackets = (data || []).map(toPacket).filter((packet): packet is Packet => Boolean(packet));
    const requeued: Packet[] = [];

    for (const packet of expiredPackets) {
      const { data: updated, error: updateError } = await this.client
        .from("packets")
        .update({
          status: "queued",
          lease_owner: null,
          lease_expires_at: null,
          updated_at: now.toISOString(),
        })
        .eq("id", packet.id)
        .eq("status", "running")
        .select("*")
        .maybeSingle();

      if (updateError) throw updateError;
      const nextPacket = toPacket(updated);
      if (nextPacket) requeued.push(nextPacket);
    }

    return requeued.sort(sortPacketsDescending);
  }
}

export class MemoryPacketStore implements PacketStore {
  private readonly packets = new Map<string, Packet>();

  private readonly events: PacketEvent[] = [];

  async findByIdempotencyKey(idempotencyKey: string): Promise<Packet | null> {
    return Array.from(this.packets.values()).find((packet) => packet.idempotency_key === idempotencyKey) || null;
  }

  async createPacket(record: CreatePacketRecord, now: Date): Promise<Packet> {
    const packet: Packet = {
      id: randomUUID(),
      kind: record.kind,
      status: "queued",
      source_surface: record.source_surface,
      entity_type: record.entity_type,
      entity_id: record.entity_id,
      requested_by: record.requested_by,
      input_json: record.input_json,
      output_json: null,
      error_json: null,
      idempotency_key: record.idempotency_key,
      model: record.model,
      attempt_count: 0,
      max_attempts: record.max_attempts,
      lease_owner: null,
      lease_expires_at: null,
      started_at: null,
      completed_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    this.packets.set(packet.id, packet);
    return packet;
  }

  async getPacket(packetId: string): Promise<Packet | null> {
    return this.packets.get(packetId) || null;
  }

  async listPackets(query: PacketListQuery): Promise<Packet[]> {
    let packets = Array.from(this.packets.values());
    if (query.entityType) packets = packets.filter((packet) => packet.entity_type === query.entityType);
    if (query.entityId) packets = packets.filter((packet) => packet.entity_id === query.entityId);
    if (query.status) packets = packets.filter((packet) => packet.status === query.status);
    if (query.kind) packets = packets.filter((packet) => packet.kind === query.kind);
    packets = packets.sort(sortPacketsDescending);
    return typeof query.limit === "number" ? packets.slice(0, query.limit) : packets;
  }

  async appendEvent(packetId: string, eventType: string, payload: Record<string, unknown> | null, now: Date): Promise<PacketEvent> {
    const event: PacketEvent = {
      id: randomUUID(),
      packet_id: packetId,
      event_type: eventType,
      payload_json: payload,
      created_at: now.toISOString(),
    };
    this.events.push(event);
    return event;
  }

  async retryPacket(packetId: string, now: Date): Promise<Packet | null> {
    const packet = this.packets.get(packetId);
    if (!packet || packet.status !== "failed") return null;
    const updated: Packet = {
      ...packet,
      status: "queued",
      lease_owner: null,
      lease_expires_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
    };
    this.packets.set(packetId, updated);
    return updated;
  }

  async cancelPacket(packetId: string, now: Date): Promise<Packet | null> {
    const packet = this.packets.get(packetId);
    if (!packet || !["queued", "running"].includes(packet.status)) return null;
    const updated: Packet = {
      ...packet,
      status: "cancelled",
      lease_owner: null,
      lease_expires_at: null,
      completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    this.packets.set(packetId, updated);
    return updated;
  }

  async acquireNextQueuedPacket(leaseOwner: string, leaseMs: number, now: Date): Promise<Packet | null> {
    const next = Array.from(this.packets.values())
      .filter((packet) => packet.status === "queued")
      .sort((left, right) => left.created_at.localeCompare(right.created_at))[0];

    if (!next) return null;

    const updated: Packet = {
      ...next,
      status: "running",
      attempt_count: next.attempt_count + 1,
      lease_owner: leaseOwner,
      lease_expires_at: new Date(now.getTime() + leaseMs).toISOString(),
      started_at: next.started_at || now.toISOString(),
      updated_at: now.toISOString(),
    };
    this.packets.set(updated.id, updated);
    return updated;
  }

  async markSucceeded(packetId: string, leaseOwner: string, output: Record<string, unknown>, now: Date): Promise<Packet | null> {
    const packet = this.packets.get(packetId);
    if (!packet || packet.status !== "running" || packet.lease_owner !== leaseOwner) return null;
    const updated: Packet = {
      ...packet,
      status: "succeeded",
      output_json: output,
      error_json: null,
      lease_owner: null,
      lease_expires_at: null,
      completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    this.packets.set(packetId, updated);
    return updated;
  }

  async markFailed(packetId: string, leaseOwner: string, errorPayload: Record<string, unknown>, now: Date): Promise<Packet | null> {
    const packet = this.packets.get(packetId);
    if (!packet || packet.status !== "running" || packet.lease_owner !== leaseOwner) return null;
    const nextStatus = packet.attempt_count < packet.max_attempts ? "queued" : "failed";
    const updated: Packet = {
      ...packet,
      status: nextStatus,
      error_json: errorPayload,
      lease_owner: null,
      lease_expires_at: null,
      completed_at: nextStatus === "failed" ? now.toISOString() : null,
      updated_at: now.toISOString(),
    };
    this.packets.set(packetId, updated);
    return updated;
  }

  async requeueExpiredLeases(now: Date): Promise<Packet[]> {
    const expired = Array.from(this.packets.values()).filter(
      (packet) => packet.status === "running" && packet.lease_expires_at && packet.lease_expires_at < now.toISOString(),
    );

    const requeued: Packet[] = [];
    for (const packet of expired) {
      const updated: Packet = {
        ...packet,
        status: "queued",
        lease_owner: null,
        lease_expires_at: null,
        updated_at: now.toISOString(),
      };
      this.packets.set(packet.id, updated);
      requeued.push(updated);
    }

    return requeued.sort(sortPacketsDescending);
  }
}
