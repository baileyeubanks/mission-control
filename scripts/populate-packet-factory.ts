import type { CanonicalInboxThread, CanonicalJobRecord } from "../src/lib/canonical-types";
import { createPacketIdempotencyKey } from "../src/lib/packets";
import { loadRuntimeEnv } from "../src/server/load-env";
import { listCanonicalInboxThreads, listCanonicalSchedule } from "../src/server/canonical-data";
import { getModelClientFromEnv } from "../src/server/model-client";
import { PacketService } from "../src/server/packet-service";
import { SupabasePacketStore } from "../src/server/packet-store";
import { getSupabaseAdminFromEnv } from "../src/server/supabase-admin";

async function main(): Promise<void> {
  loadRuntimeEnv();
  const admin = getSupabaseAdminFromEnv();
  if (!admin) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const service = new PacketService(new SupabasePacketStore(admin), getModelClientFromEnv());
  const [threads, schedule] = await Promise.all([
    listCanonicalInboxThreads(admin, 10),
    listCanonicalSchedule(admin),
  ]);

  let createdCount = 0;
  let processedCount = 0;

  for (const thread of threads) {
    const packetMessages = thread.messages.map((message) => ({
      sender: message.sender,
      content: message.content,
    }));

    const packets = [
      {
        kind: "thread_summarize" as const,
        input: { messages: packetMessages },
      },
      {
        kind: "thread_reply_draft" as const,
        input: {
          messages: packetMessages,
          tone: thread.sourceKind === "creative_brief" ? "Consultative, direct, scope-aware" : "Professional, concise, approval-aware",
        },
      },
      {
        kind: "intake_extract" as const,
        input: {
          text: packetMessages.map((message) => `${message.sender}: ${message.content}`).join("\n"),
          channel: thread.channel,
        },
      },
    ];

    for (const packet of packets) {
      const result = await service.createPacket({
        kind: packet.kind,
        sourceSurface: "bootstrap",
        entityType: "thread",
        entityId: thread.packetEntityId,
        requestedBy: null,
        input: packet.input,
        idempotencyKey: createPacketIdempotencyKey(packet.kind, "thread", thread.packetEntityId, packet.input),
      });
      if (result.created) createdCount += 1;
    }
  }

  for (const job of selectJobBootstrapSet(schedule.jobs)) {
    const input = {
      jobDetails: {
        id: job.id,
        title: job.title,
        state: job.status,
        scheduledStart: job.scheduledStart,
        scheduledEnd: job.scheduledEnd,
        accessNotes: job.accessNotes,
        client: job.clientName || job.clientEmail || "Unassigned",
        serviceAddress: job.serviceAddress,
      },
      notes: "Generated from current operational state. Advisory-only outbound draft.",
    };

    const result = await service.createPacket({
      kind: "draft_job_update",
      sourceSurface: "bootstrap",
      entityType: "job",
      entityId: job.id,
      requestedBy: null,
      input,
      idempotencyKey: createPacketIdempotencyKey("draft_job_update", "job", job.id, input),
    });

    if (result.created) createdCount += 1;
  }

  if (schedule.jobs.length > 0 && schedule.crews.length > 0) {
    const input = {
      jobs: schedule.jobs.slice(0, 25).map((job) => ({
        id: job.id,
        title: job.title,
        state: job.status,
        scheduledStart: job.scheduledStart,
        scheduledEnd: job.scheduledEnd,
        serviceAddress: job.serviceAddress || job.accessNotes,
      })),
      crews: schedule.crews.map((crew) => ({
        id: crew.id,
        name: crew.displayName,
        availability: "Current route allocation requires operator confirmation.",
      })),
    };

    const result = await service.createPacket({
      kind: "schedule_optimize",
      sourceSurface: "bootstrap",
      entityType: "schedule_board",
      entityId: "global",
      requestedBy: null,
      input,
      idempotencyKey: createPacketIdempotencyKey("schedule_optimize", "schedule_board", "global", input),
    });

    if (result.created) createdCount += 1;
  }

  for (let index = 0; index < 200; index += 1) {
    const packet = await service.processNextPacket("bootstrap-worker", 30_000);
    if (!packet) break;
    processedCount += 1;
  }

  console.log(`[packet-bootstrap] created=${createdCount} processed=${processedCount} threads=${threads.length} jobs=${schedule.jobs.length} crews=${schedule.crews.length}`);
}

function selectJobBootstrapSet(jobs: CanonicalJobRecord[]): CanonicalJobRecord[] {
  return jobs
    .filter((job) => !["paid", "cancelled"].includes(job.status))
    .filter((job) => !isInternalJob(job))
    .slice(0, 18);
}

function isInternalJob(job: CanonicalJobRecord): boolean {
  const email = String(job.clientEmail || "").trim().toLowerCase();
  const name = String(job.clientName || "").trim().toLowerCase();
  return (
    email === "bailey@contentco-op.com" ||
    email === "caio@astrocleanings.com" ||
    email === "blaze@contentco-op.com" ||
    email === "noreply@astrocleanings.com" ||
    name === "bailey eubanks" ||
    name === "caio gustin" ||
    name === "blaze"
  );
}

void main().catch((error) => {
  console.error("[packet-bootstrap] failed", error);
  process.exit(1);
});
