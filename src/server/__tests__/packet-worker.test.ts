import { describe, expect, it, vi } from "vitest";
import { PacketService } from "../packet-service";
import { MemoryPacketStore } from "../packet-store";
import { PacketWorker } from "../packet-worker";
import type { JsonModelRequest, PacketModelClient, TextModelRequest } from "../model-client";

class ExplodingSuccessStore extends MemoryPacketStore {
  async markSucceeded(
    _packetId: string,
    _leaseOwner: string,
    _output: Record<string, unknown>,
    _now: Date,
  ): Promise<null> {
    throw new Error("Persistence failure.");
  }
}

class SuccessfulModelClient implements PacketModelClient {
  async generateText(_request: TextModelRequest): Promise<string> {
    return "Customer update draft is ready.";
  }

  async generateJson(_request: JsonModelRequest): Promise<unknown> {
    return {
      assignments: [{ crewId: "crew-1", jobIds: ["job-1"], reasoning: "Recovered after lease expiry." }],
    };
  }
}

describe("PacketWorker", () => {
  it("retries failures until the max attempt limit and then marks the packet failed", async () => {
    let currentTime = new Date("2026-04-11T15:00:00.000Z");
    const service = new PacketService(new ExplodingSuccessStore(), new SuccessfulModelClient(), () => currentTime);
    const worker = new PacketWorker(service, {
      workerId: "worker-fail",
      leaseMs: 1_000,
      logger: { info: vi.fn(), error: vi.fn() },
    });

    const created = await service.createPacket({
      kind: "thread_reply_draft",
      sourceSurface: "inbox",
      entityType: "thread",
      entityId: "job-1",
      requestedBy: "user-1",
      input: {
        messages: [{ sender: "Customer", content: "Please confirm arrival." }],
      },
      idempotencyKey: "retry-packet",
    });

    await worker.tick();
    currentTime = new Date("2026-04-11T15:01:00.000Z");
    await worker.tick();
    currentTime = new Date("2026-04-11T15:02:00.000Z");
    await worker.tick();

    const stored = await service.getPacket(created.packet.id);
    expect(stored?.attempt_count).toBe(3);
    expect(stored?.status).toBe("failed");
    expect(stored?.error_json).toEqual({
      message: "Persistence failure.",
      kind: "thread_reply_draft",
    });
  });

  it("requeues expired leases and completes the recovered packet", async () => {
    let currentTime = new Date("2026-04-11T16:00:00.000Z");
    const store = new MemoryPacketStore();
    const service = new PacketService(store, new SuccessfulModelClient(), () => currentTime);
    const worker = new PacketWorker(service, {
      workerId: "worker-recover",
      leaseMs: 1_000,
      logger: { info: vi.fn(), error: vi.fn() },
    });

    const created = await service.createPacket({
      kind: "schedule_optimize",
      sourceSurface: "scheduling",
      entityType: "schedule_board",
      entityId: "global",
      requestedBy: "user-1",
      input: {
        jobs: [{ id: "job-1", title: "Move-out clean" }],
        crews: [{ id: "crew-1", name: "North Team" }],
      },
      idempotencyKey: "lease-recovery",
    });

    await store.acquireNextQueuedPacket("stale-worker", 1_000, currentTime);
    currentTime = new Date("2026-04-11T16:00:03.000Z");

    await worker.tick();

    const stored = await service.getPacket(created.packet.id);
    expect(stored?.status).toBe("succeeded");
    expect(stored?.attempt_count).toBe(2);
    expect(stored?.output_json).toEqual({
      assignments: [{ crewId: "crew-1", jobIds: ["job-1"], reasoning: "Recovered after lease expiry." }],
    });
  });
});
