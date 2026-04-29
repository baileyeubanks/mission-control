// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createPacketRequestMock = vi.hoisted(() => vi.fn());
const listPacketsMock = vi.hoisted(() => vi.fn());
const getCanonicalInboxMock = vi.hoisted(() => vi.fn());
const getCanonicalScheduleMock = vi.hoisted(() => vi.fn());
const convertMissionHandoffMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    isAuthReady: true,
    user: { id: "user-1", email: "operator@example.com" },
    role: "operator",
  }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/canonical-client", () => ({
  getCanonicalInbox: getCanonicalInboxMock,
  getCanonicalSchedule: getCanonicalScheduleMock,
}));

vi.mock("@/lib/packet-client", () => ({
  createPacketRequest: createPacketRequestMock,
  listPackets: listPacketsMock,
  newestPacketOfKind: (packets: Array<{ kind: string }>, kind: string) => packets.find((packet) => packet.kind === kind) || null,
  isPacketActive: (status: string) => status === "queued" || status === "running",
}));

vi.mock("@/lib/mission-control-client", () => ({
  convertMissionHandoff: convertMissionHandoffMock,
}));

import { Inbox } from "../Inbox";
import { Scheduling } from "../Scheduling";

describe("packet-driven UI", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getCanonicalInboxMock.mockReset();
    getCanonicalInboxMock.mockResolvedValue([
      {
        threadId: "brief:brief-1",
        packetEntityId: "brief:brief-1",
        sourceKind: "creative_brief",
        channel: "website_form",
        title: "Northstar Logistics",
        counterpart: "Jordan Avery",
        preview: "Need a recruiting and sales positioning brief.",
        latestAt: "2026-04-11T10:00:00.000Z",
        outboundTarget: "+13465550199",
        messages: [
          {
            id: "msg-1",
            sender: "Jordan Avery",
            content: "Need a recruiting and sales positioning brief.",
            createdAt: "2026-04-11T10:00:00.000Z",
            direction: "inbound",
          },
        ],
      },
    ]);

    getCanonicalScheduleMock.mockReset();
    getCanonicalScheduleMock.mockResolvedValue({
      jobs: [
        {
          id: "job-1",
          title: "Move-out clean",
          status: "scheduled",
          scheduledStart: "2026-04-12T09:00:00.000Z",
          scheduledEnd: "2026-04-12T11:00:00.000Z",
          accessNotes: "North Austin",
          serviceAddress: "North Austin",
          clientName: "Jordan",
          clientEmail: "jordan@example.com",
          clientPhone: "5125550101",
          businessUnit: "ACS",
          assignedTeam: "A",
          totalPrice: 32500,
        },
        {
          id: "job-2",
          title: "Deep clean",
          status: "lead",
          scheduledStart: null,
          scheduledEnd: null,
          accessNotes: "South Austin",
          serviceAddress: "South Austin",
          clientName: "Taylor",
          clientEmail: "taylor@example.com",
          clientPhone: "5125550102",
          businessUnit: "ACS",
          assignedTeam: null,
          totalPrice: null,
        },
      ],
      crews: [
        { id: "crew-1", displayName: "North Team", role: "crew" },
        { id: "crew-2", displayName: "South Team", role: "crew" },
      ],
    });

    createPacketRequestMock.mockReset();
    createPacketRequestMock.mockResolvedValue({ packetId: "packet-1", status: "queued", created: true });
    convertMissionHandoffMock.mockReset();
    convertMissionHandoffMock.mockResolvedValue({
      id: "handoff-acs-quote-001",
      status: "blocked",
      converted_artifacts: { job_candidate_id: "job-acs-quote-local-001" },
    });

    listPacketsMock.mockReset();
    listPacketsMock.mockImplementation(async (query?: { entityType?: string }) => {
      if (query?.entityType === "thread") {
        return [
          {
            id: "packet-summary",
            kind: "thread_summarize",
            status: "succeeded",
            source_surface: "inbox",
            entity_type: "thread",
            entity_id: "brief:brief-1",
            requested_by: "user-1",
            input_json: {},
            output_json: { summary: "Client needs a recruiting and sales positioning brief." },
            error_json: null,
            idempotency_key: "summary",
            model: "gemini-2.5-flash",
            attempt_count: 1,
            max_attempts: 3,
            lease_owner: null,
            lease_expires_at: null,
            started_at: "2026-04-11T10:06:00.000Z",
            completed_at: "2026-04-11T10:06:05.000Z",
            created_at: "2026-04-11T10:06:00.000Z",
            updated_at: "2026-04-11T10:06:05.000Z",
          },
          {
            id: "packet-draft",
            kind: "thread_reply_draft",
            status: "succeeded",
            source_surface: "inbox",
            entity_type: "thread",
            entity_id: "brief:brief-1",
            requested_by: "user-1",
            input_json: {},
            output_json: { text: "We can help clarify that story. I’ll outline the next scope questions shortly." },
            error_json: null,
            idempotency_key: "draft",
            model: "gemini-2.5-flash",
            attempt_count: 1,
            max_attempts: 3,
            lease_owner: null,
            lease_expires_at: null,
            started_at: "2026-04-11T10:06:00.000Z",
            completed_at: "2026-04-11T10:06:05.000Z",
            created_at: "2026-04-11T10:06:00.000Z",
            updated_at: "2026-04-11T10:06:05.000Z",
          },
        ];
      }

      if (query?.entityType === "schedule_board") {
        return [
          {
            id: "packet-schedule",
            kind: "schedule_optimize",
            status: "succeeded",
            source_surface: "scheduling",
            entity_type: "schedule_board",
            entity_id: "global",
            requested_by: "user-1",
            input_json: {},
            output_json: {
              assignments: [{ crewId: "crew-1", jobIds: ["job-1"], reasoning: "North Team already owns the Austin route." }],
            },
            error_json: null,
            idempotency_key: "schedule",
            model: "gemini-2.5-flash",
            attempt_count: 1,
            max_attempts: 3,
            lease_owner: null,
            lease_expires_at: null,
            started_at: "2026-04-11T10:06:00.000Z",
            completed_at: "2026-04-11T10:06:05.000Z",
            created_at: "2026-04-11T10:06:00.000Z",
            updated_at: "2026-04-11T10:06:05.000Z",
          },
        ];
      }

      return [];
    });
  });

  it("queues inbox summary packets and renders the latest advisory output", async () => {
    const user = userEvent.setup();
    render(<Inbox />);

    await screen.findAllByText("Need a recruiting and sales positioning brief.");
    await screen.findByText("Client needs a recruiting and sales positioning brief.");

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(createPacketRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "thread_summarize",
          sourceSurface: "inbox",
          entityType: "thread",
          entityId: "brief:brief-1",
        }),
      );
    });

    expect(screen.getAllByText("succeeded").length).toBeGreaterThan(0);
  });

  it("converts local handoffs from the inbox without transmitting", async () => {
    const user = userEvent.setup();
    getCanonicalInboxMock.mockResolvedValue([
      {
        threadId: "handoff-acs-quote-001",
        packetEntityId: "handoff-acs-quote-001",
        sourceKind: "quote_event",
        channel: "astrocleanings.com quote engine",
        title: "ACS_QUOTE / Maya Thompson",
        counterpart: "Maya Thompson",
        preview: "Move-out clean request.",
        latestAt: "2026-04-23T15:00:00.000Z",
        outboundTarget: "+15125550140",
        handoffId: "handoff-acs-quote-001",
        handoffStatus: "new",
        nextAction: "Review quote, confirm crew readiness, then create job candidate.",
        dataSource: "local_recovery_store",
        readiness: {
          status: "blocked",
          summary: "Deep-clean certified crew required before dispatch.",
          blockers: ["Crew readiness signal pending."],
        },
        convertedArtifacts: {},
        messages: [
          {
            id: "msg-1",
            sender: "astrocleanings.com quote engine",
            content: "Move-out clean request.",
            createdAt: "2026-04-23T15:00:00.000Z",
            direction: "inbound",
          },
        ],
      },
    ]);

    render(<Inbox />);

    await screen.findByText("ACS quote handoff");
    await screen.findByText("Readiness: Blocked");
    screen.getByRole("link", { name: "Open jobs" });
    await screen.findByText("Review quote, confirm crew readiness, then create job candidate.");
    await user.click(screen.getByRole("button", { name: "Create job candidate" }));

    await waitFor(() => {
      expect(convertMissionHandoffMock).toHaveBeenCalledWith("handoff-acs-quote-001");
    });
    expect(createPacketRequestMock).not.toHaveBeenCalled();
  });

  it("queues schedule optimization packets and renders advisory assignments", async () => {
    const user = userEvent.setup();
    render(<Scheduling />);

    await screen.findByText("Optimization advisory");
    await screen.findByText("North Team already owns the Austin route.");

    await user.click(screen.getByRole("button", { name: "Queue_Optimize" }));

    await waitFor(() => {
      expect(createPacketRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "schedule_optimize",
          sourceSurface: "scheduling",
          entityType: "schedule_board",
        }),
      );
    });

    expect(screen.getAllByText("Move-out clean").length).toBeGreaterThan(0);
  });
});
