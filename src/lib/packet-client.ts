import type { Packet, PacketCreateInput, PacketKind, PacketListQuery, PacketStatus } from "./packets";

export async function createPacketRequest(input: PacketCreateInput): Promise<{ packetId: string; status: PacketStatus; created: boolean }> {
  const response = await fetch("/api/packets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as { packetId?: string; status?: PacketStatus; created?: boolean; error?: string };
  if (!response.ok || !payload.packetId || !payload.status) {
    throw new Error(payload.error || "Failed to create packet.");
  }

  return {
    packetId: payload.packetId,
    status: payload.status,
    created: Boolean(payload.created),
  };
}

export async function getPacket(packetId: string): Promise<Packet> {
  const response = await fetch(`/api/packets/${packetId}`);
  const payload = (await response.json()) as { packet?: Packet; error?: string };
  if (!response.ok || !payload.packet) {
    throw new Error(payload.error || "Failed to fetch packet.");
  }

  return payload.packet;
}

export async function listPackets(query: PacketListQuery = {}): Promise<Packet[]> {
  const params = new URLSearchParams();
  if (query.entityType) params.set("entityType", query.entityType);
  if (query.entityId) params.set("entityId", query.entityId);
  if (query.status) params.set("status", query.status);
  if (query.kind) params.set("kind", query.kind);
  if (typeof query.limit === "number") params.set("limit", String(query.limit));

  const response = await fetch(`/api/packets${params.toString() ? `?${params.toString()}` : ""}`);
  const payload = (await response.json()) as { packets?: Packet[]; error?: string };
  if (!response.ok || !Array.isArray(payload.packets)) {
    throw new Error(payload.error || "Failed to list packets.");
  }

  return payload.packets;
}

export async function retryPacketRequest(packetId: string): Promise<Packet> {
  const response = await fetch(`/api/packets/${packetId}/retry`, { method: "POST" });
  const payload = (await response.json()) as { packet?: Packet; error?: string };
  if (!response.ok || !payload.packet) {
    throw new Error(payload.error || "Failed to retry packet.");
  }

  return payload.packet;
}

export async function cancelPacketRequest(packetId: string): Promise<Packet> {
  const response = await fetch(`/api/packets/${packetId}/cancel`, { method: "POST" });
  const payload = (await response.json()) as { packet?: Packet; error?: string };
  if (!response.ok || !payload.packet) {
    throw new Error(payload.error || "Failed to cancel packet.");
  }

  return payload.packet;
}

export function isPacketActive(status: PacketStatus): boolean {
  return status === "queued" || status === "running";
}

export function newestPacketOfKind(packets: Packet[], kind: PacketKind): Packet | null {
  return packets.find((packet) => packet.kind === kind) || null;
}
