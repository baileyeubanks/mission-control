import { describe, expect, it } from "vitest";
import { MemoryPacketStore } from "../packet-store";
import { PacketService } from "../packet-service";
import type { JsonModelRequest, PacketModelClient, TextModelRequest } from "../model-client";

class StubModelClient implements PacketModelClient {
  async generateText(request: TextModelRequest): Promise<string> {
    if (request.prompt.includes("Summarize")) {
      return "Customer wants to reschedule for Friday.";
    }

    return "Thanks for the update. We will confirm once the crew window is locked.";
  }

  async generateJson(request: JsonModelRequest): Promise<unknown> {
    if (request.prompt.includes("Crews:")) {
      return {
        assignments: [{ crewId: "crew-1", jobIds: ["job-1"], reasoning: "Only available crew." }],
      };
    }

    return {
      name: "Taylor",
      businessScope: "Astro Cleanings",
      projectScope: "Move-out clean",
      suggestedItems: [{ description: "Move-out clean", rate: 320 }],
    };
  }
}

describe("PacketService", () => {
  it("reuses an existing packet for the same idempotency key", async () => {
    const service = new PacketService(new MemoryPacketStore(), new StubModelClient());

    const first = await service.createPacket({
      kind: "thread_reply_draft",
      sourceSurface: "inbox",
      entityType: "thread",
      entityId: "job-1",
      requestedBy: "user-1",
      input: {
        messages: [{ sender: "Customer", content: "Can you confirm the appointment?" }],
      },
      idempotencyKey: "thread_reply_draft:thread:job-1:abc",
    });

    const second = await service.createPacket({
      kind: "thread_reply_draft",
      sourceSurface: "inbox",
      entityType: "thread",
      entityId: "job-1",
      requestedBy: "user-1",
      input: {
        messages: [{ sender: "Customer", content: "Can you confirm the appointment?" }],
      },
      idempotencyKey: "thread_reply_draft:thread:job-1:abc",
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.packet.id).toBe(first.packet.id);
  });

  it("processes a queued packet and stores advisory output", async () => {
    const service = new PacketService(new MemoryPacketStore(), new StubModelClient());

    const created = await service.createPacket({
      kind: "thread_reply_draft",
      sourceSurface: "inbox",
      entityType: "thread",
      entityId: "job-2",
      requestedBy: "user-1",
      input: {
        messages: [{ sender: "Customer", content: "What time should I expect the crew?" }],
      },
      idempotencyKey: "thread_reply_draft:thread:job-2:def",
    });

    const processed = await service.processNextPacket("worker-1", 30_000);
    const stored = await service.getPacket(created.packet.id);

    expect(processed?.status).toBe("succeeded");
    expect(stored?.attempt_count).toBe(1);
    expect(stored?.output_json).toEqual({
      text: "Thanks for the update. We will confirm once the crew window is locked.",
    });
  });
});
