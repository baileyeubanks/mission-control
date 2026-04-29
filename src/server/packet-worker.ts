import { randomUUID } from "node:crypto";
import type { PacketService } from "./packet-service";

export interface PacketWorkerOptions {
  pollMs?: number;
  leaseMs?: number;
  workerId?: string;
  logger?: Pick<Console, "info" | "error">;
}

export class PacketWorker {
  private readonly pollMs: number;

  private readonly leaseMs: number;

  private readonly workerId: string;

  private readonly logger: Pick<Console, "info" | "error">;

  private timer: NodeJS.Timeout | null = null;

  private ticking = false;

  constructor(private readonly service: PacketService, options: PacketWorkerOptions = {}) {
    this.pollMs = options.pollMs ?? 2000;
    this.leaseMs = options.leaseMs ?? 30_000;
    this.workerId = options.workerId ?? `packet-worker-${randomUUID()}`;
    this.logger = options.logger ?? console;
  }

  start(): void {
    if (this.timer) return;

    this.logger.info(`[packet-worker] starting ${this.workerId}`);
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollMs);

    void this.tick();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;

    try {
      await this.service.requeueExpiredLeases();
      const packet = await this.service.processNextPacket(this.workerId, this.leaseMs);
      if (packet) {
        this.logger.info(`[packet-worker] ${packet.kind} -> ${packet.status} (${packet.id})`);
      }
    } catch (error) {
      this.logger.error("[packet-worker] tick failed", error);
    } finally {
      this.ticking = false;
    }
  }
}
