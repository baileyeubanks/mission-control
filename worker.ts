import { getModelClientFromEnv } from "./src/server/model-client";
import { PacketService } from "./src/server/packet-service";
import { SupabasePacketStore } from "./src/server/packet-store";
import { PacketWorker } from "./src/server/packet-worker";
import { loadRuntimeEnv } from "./src/server/load-env";
import { getSupabaseAdminFromEnv } from "./src/server/supabase-admin";

loadRuntimeEnv();
const admin = getSupabaseAdminFromEnv();

if (!admin) {
  throw new Error("Cannot start packet worker without SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const service = new PacketService(new SupabasePacketStore(admin), getModelClientFromEnv());
const worker = new PacketWorker(service, {
  pollMs: Number(process.env.PACKET_WORKER_POLL_MS || 2000),
  leaseMs: Number(process.env.PACKET_LEASE_MS || 30000),
  workerId: process.env.PACKET_WORKER_ID,
});

worker.start();

const shutdown = () => {
  worker.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
