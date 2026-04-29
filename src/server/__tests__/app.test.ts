import request from "supertest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { MemoryPacketStore } from "../packet-store";
import { PacketService } from "../packet-service";
import type { JsonModelRequest, PacketModelClient, TextModelRequest } from "../model-client";

class SuccessfulModelClient implements PacketModelClient {
  async generateText(_request: TextModelRequest): Promise<string> {
    return "Summary ready.";
  }

  async generateJson(_request: JsonModelRequest): Promise<unknown> {
    return { assignments: [] };
  }
}

class FailingModelClient implements PacketModelClient {
  async generateText(_request: TextModelRequest): Promise<string> {
    throw new Error("Model offline.");
  }

  async generateJson(_request: JsonModelRequest): Promise<unknown> {
    throw new Error("Model offline.");
  }
}

describe("packet API", () => {
  it("exposes Mission Control bootstrap and runtime contracts", async () => {
    const service = new PacketService(new MemoryPacketStore(), new SuccessfulModelClient());
    const app = createApp({ packetService: service });

    const bootstrapResponse = await request(app).get("/api/mission-control/bootstrap");
    expect(bootstrapResponse.status).toBe(200);
    expect(bootstrapResponse.body.product.name).toBe("Mission Control");
    expect(bootstrapResponse.body.product.rootStatus).toBe("legacy-donor-contract-label");
    expect(bootstrapResponse.body.accounts.map((account: { id: string }) => account.id)).toEqual([
      "astro-cleaning-services",
      "content-co-op",
    ]);
    expect(bootstrapResponse.body.services.packets).toBe("enabled");
    expect(bootstrapResponse.body.rollout.id).toBe("mega-value-plan-11");
    expect(bootstrapResponse.body.rollouts.map((rollout: { id: string }) => rollout.id)).toEqual([
      "mega-value-plan-12",
      "mega-value-plan-11",
      "mega-value-plan-10",
      "mega-value-plan-9",
      "mega-value-plan-8",
      "mega-value-plan-7",
      "mega-value-plan-5",
      "mega-rollout-4",
    ]);
    expect(bootstrapResponse.body.valueLoops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "value-loop-acs-cash",
          status: "active",
        }),
        expect.objectContaining({
          id: "value-loop-runtime-proof",
          status: "blocked",
        }),
        expect.objectContaining({
          id: "value-loop-dispatch-control",
          status: "active",
        }),
      ]),
    );
    expect(bootstrapResponse.body.agentLanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "agent-lane-codex-patch",
          status: "active",
        }),
        expect.objectContaining({
          id: "agent-lane-connectors",
          status: "queued",
        }),
      ]),
    );
    expect(bootstrapResponse.body.readModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "readmodel-acs-quote-to-cash",
          domainId: "quotes",
          status: "read-only",
        }),
        expect.objectContaining({
          id: "readmodel-acs-dispatch-snapshot",
          domainId: "dispatch",
        }),
      ]),
    );
    expect(bootstrapResponse.body.rollout.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "acs-deep-context",
          status: "ready",
        }),
      ]),
    );

    const runtimeResponse = await request(app).get("/api/mission-control/runtimes");
    expect(runtimeResponse.status).toBe(200);
    expect(runtimeResponse.body.data_source).toBe("static_recovery_contract");
    expect(runtimeResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "mission-control-shell",
          port: 4300,
          authorityClass: "canonical-shell",
        }),
      ]),
    );

    const rolloutResponse = await request(app).get("/api/mission-control/rollout");
    expect(rolloutResponse.status).toBe(200);
    expect(rolloutResponse.body.data.centerOfGravity).toBe("Read-only adapter spine before mutation");

    const rolloutsResponse = await request(app).get("/api/mission-control/rollouts");
    expect(rolloutsResponse.status).toBe(200);
    expect(rolloutsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "mega-value-plan-12", status: "queued" }),
        expect.objectContaining({ id: "mega-value-plan-11", status: "active" }),
        expect.objectContaining({ id: "mega-value-plan-10", status: "done" }),
        expect.objectContaining({ id: "mega-value-plan-9", status: "done" }),
        expect.objectContaining({ id: "mega-value-plan-8", status: "done" }),
        expect.objectContaining({ id: "mega-value-plan-7", status: "done" }),
        expect.objectContaining({ id: "mega-value-plan-5", status: "done" }),
        expect.objectContaining({ id: "mega-rollout-4", status: "done" }),
      ]),
    );

    const valueLoopsResponse = await request(app).get("/api/mission-control/value-loops");
    expect(valueLoopsResponse.status).toBe(200);
    expect(valueLoopsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "value-loop-acs-cash", route: "/admin/inbox" }),
        expect.objectContaining({ id: "value-loop-cco-delivery", route: "/admin/inbox?account=content-co-op" }),
        expect.objectContaining({ id: "value-loop-quote-proposal", route: "/admin/quotes" }),
        expect.objectContaining({ id: "value-loop-invoice-authority", route: "/admin/invoices" }),
        expect.objectContaining({ id: "value-loop-dispatch-control", route: "/admin/dispatch" }),
      ]),
    );

    const agentLanesResponse = await request(app).get("/api/mission-control/agent-lanes");
    expect(agentLanesResponse.status).toBe(200);
    expect(agentLanesResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "agent-lane-codex-patch", route: "/admin/packets" }),
        expect.objectContaining({ id: "agent-lane-browser-proof", route: "/admin/health" }),
      ]),
    );

    const readModelsResponse = await request(app).get("/api/mission-control/read-models?domain=quotes");
    expect(readModelsResponse.status).toBe(200);
    expect(readModelsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "readmodel-acs-quote-to-cash", domainId: "quotes" }),
        expect.objectContaining({ id: "readmodel-cco-brief-estimate", domainId: "quotes" }),
      ]),
    );

    const operatorRegistryResponse = await request(app).get("/api/mission-control/operator-registry");
    expect(operatorRegistryResponse.status).toBe(200);
    expect(operatorRegistryResponse.body.data.report_status).toMatch(/available|missing/);
    expect(operatorRegistryResponse.body.data.registry_path).toBe(
      "/Users/baileyeubanks/Desktop/Projects/platform/operator-registry.json",
    );
    expect(operatorRegistryResponse.body.data.registry_lane_count).toBeGreaterThan(0);

    const acsQuoteHandoffResponse = await request(app).get("/api/mission-control/acs-quote-handoff-v1");
    expect(acsQuoteHandoffResponse.status).toBe(200);
    expect(acsQuoteHandoffResponse.body.data.v1_decision).toContain("ACS quote-to-admin handoff");
    expect(acsQuoteHandoffResponse.body.data.contract).toEqual(
      expect.objectContaining({
        schema: "acs.quote-handoff.v1",
        status: "frozen_for_read_only_v1",
        canonicalWritePath: "supabase_first",
      }),
    );
    expect(acsQuoteHandoffResponse.body.data.sample_handoff).toEqual(
      expect.objectContaining({
        schema: "acs.quote-handoff.v1",
        companyAccount: "astro-cleaning-services",
        source: expect.objectContaining({
          sourceEntityId: "public-quote-demo-001",
        }),
        estimate: expect.objectContaining({
          totalCents: 28000,
        }),
        backendTargets: expect.objectContaining({
          astroAdminRoute: "/api/quotes",
          firebaseMirrorCollection: "disabled_until_promoted",
        }),
      }),
    );
    expect(acsQuoteHandoffResponse.body.data.adapter_proof).toEqual(
      expect.objectContaining({
        status: "read_only_mapping_ready",
        normalizer: "normalizeAcsPublicQuoteToHandoffV1",
        output_schema: "acs.quote-handoff.v1",
      }),
    );
    expect(acsQuoteHandoffResponse.body.data.target_write_preview).toEqual(
      expect.objectContaining({
        status: "prepared_not_submitted",
        target_route: "/api/quotes",
        body: expect.objectContaining({
          service_type: "standard",
          estimated_total: 280,
          payload: expect.objectContaining({
            source: "acs.quote-handoff.v1",
            source_handoff_id: "acs-handoff-local-001",
          }),
        }),
      }),
    );
    expect(acsQuoteHandoffResponse.body.data.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "public-intake-source" }),
        expect.objectContaining({ id: "admin-target" }),
        expect.objectContaining({ id: "ai-studio-admin-donor" }),
        expect.objectContaining({ id: "firebase-donor" }),
      ]),
    );
  });

  it("exposes runtime proof and local handoff conversion", async () => {
    const service = new PacketService(new MemoryPacketStore(), new SuccessfulModelClient());
    const recoveryStoreDir = mkdtempSync(path.join(tmpdir(), "mission-control-handoffs-"));
    const app = createApp({ packetService: service, recoveryStoreDir });

    const proofResponse = await request(app).get("/api/mission-control/runtime-proof");
    expect(proofResponse.status).toBe(200);
    expect(proofResponse.body.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runtimeId: "mission-control-shell",
        }),
      ]),
    );

    const handoffResponse = await request(app).get("/api/mission-control/handoffs");
    expect(handoffResponse.status).toBe(200);
    expect(handoffResponse.body.data_source).toBe("local_recovery_store");
    expect(handoffResponse.body.handoffs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "handoff-acs-quote-001",
          handoff_type: "acs_quote_intake",
        }),
        expect.objectContaining({
          id: "handoff-cco-brief-001",
          handoff_type: "cco_creative_brief",
        }),
      ]),
    );

    const convertResponse = await request(app).post("/api/mission-control/handoffs/handoff-cco-brief-001/convert");
    expect(convertResponse.status).toBe(200);
    expect(convertResponse.body.handoff.status).toBe("converted");
    expect(convertResponse.body.handoff.converted_artifacts.project_candidate_id).toBe("project-cco-brief-local-001");
  });

  it("exposes root audit artifacts and persists local approval decisions", async () => {
    const service = new PacketService(new MemoryPacketStore(), new SuccessfulModelClient());
    const recoveryStoreDir = mkdtempSync(path.join(tmpdir(), "mission-control-approvals-"));
    const app = createApp({ packetService: service, recoveryStoreDir });

    const auditResponse = await request(app).get("/api/root-audit/status");
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.ecosystem.summary.repos_found).toBeGreaterThanOrEqual(0);
    expect(auditResponse.body.interactions.summary.p0_breaks).toBeGreaterThanOrEqual(0);

    const approvalResponse = await request(app).post("/api/mission-control/approvals/approval-acs-production-touch/decision").send({
      decision: "approved",
      decided_by: "test-operator",
      note: "Approved in isolated recovery store.",
    });
    expect(approvalResponse.status).toBe(200);
    expect(approvalResponse.body.ok).toBe(true);
    expect(approvalResponse.body.data.status).toBe("approved");

    const listResponse = await request(app).get("/api/mission-control/approvals");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "approval-acs-production-touch",
          status: "approved",
        }),
      ]),
    );

    const eventsResponse = await request(app).get("/api/mission-control/events");
    expect(eventsResponse.status).toBe(200);
    expect(eventsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "event-approval-acs-production-touch-approved",
          eventType: "approval.approved",
        }),
      ]),
    );
  });

  it("wires Root quote PDF export and quote-to-invoice authority", async () => {
    const service = new PacketService(new MemoryPacketStore(), new SuccessfulModelClient());
    const recoveryStoreDir = mkdtempSync(path.join(tmpdir(), "mission-control-billing-"));
    const app = createApp({ packetService: service, recoveryStoreDir });

    const createQuoteResponse = await request(app).post("/api/root/quotes").send({
      kind: "quote",
      companyAccount: "astro-cleaning-services",
      client: {
        name: "Test Homeowner",
        email: "test@example.com",
        address: "Houston, TX",
      },
      source: "manual",
      title: "Move-out cleaning",
      scopeSummary: "Move-out cleaning with interior cabinet wipe-down.",
      lineItems: [
        {
          name: "Move-out clean",
          description: "Whole-home reset",
          quantity: 1,
          unitPriceCents: 32500,
          taxable: false,
          category: "cleaning",
        },
      ],
      terms: "Operator approval required before sending.",
    });
    expect(createQuoteResponse.status).toBe(201);
    expect(createQuoteResponse.body.ok).toBe(true);
    expect(createQuoteResponse.body.data.documentNumber).toContain("ACS-Q-");

    const quoteId = createQuoteResponse.body.data.id as string;
    const approveResponse = await request(app).post(`/api/root/quotes/${quoteId}/approve`);
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.data.status).toBe("ready_to_send");
    expect(approveResponse.body.data.approvalStatus).toBe("approved");

    const exportResponse = await request(app).post(`/api/root/quotes/${quoteId}/export-pdf`);
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.body.data.artifact.artifactType).toBe("pdf");

    const quotePdfResponse = await request(app).get(`/api/root/quotes/${quoteId}/pdf`);
    expect(quotePdfResponse.status).toBe(200);
    expect(quotePdfResponse.headers["content-type"]).toContain("application/pdf");

    const convertResponse = await request(app).post(`/api/root/quotes/${quoteId}/convert-to-invoice`);
    expect(convertResponse.status).toBe(200);
    expect(convertResponse.body.data.quote.status).toBe("invoiced");
    expect(convertResponse.body.data.invoice.invoiceNumber).toContain("INV-");

    const invoiceId = convertResponse.body.data.invoice.id as string;
    const issueBeforeFinalizeResponse = await request(app).post(`/api/root/invoices/${invoiceId}/issue`);
    expect(issueBeforeFinalizeResponse.status).toBe(409);
    expect(issueBeforeFinalizeResponse.body.error.code).toBe("INVOICE_ARTIFACT_REQUIRED");

    const finalizeResponse = await request(app).post(`/api/root/invoices/${invoiceId}/finalize-artifacts`);
    expect(finalizeResponse.status).toBe(200);
    expect(finalizeResponse.body.data.invoice.issueStatus).toBe("approved_to_issue");

    const issueResponse = await request(app).post(`/api/root/invoices/${invoiceId}/issue`);
    expect(issueResponse.status).toBe(200);
    expect(issueResponse.body.data.issueStatus).toBe("issued");
    expect(issueResponse.body.data.paymentStatus).toBe("unpaid");

    const paymentResponse = await request(app).post(`/api/root/invoices/${invoiceId}/record-payment`).send({
      amountCents: 32500,
      note: "Verified manual payment in test.",
    });
    expect(paymentResponse.status).toBe(200);
    expect(paymentResponse.body.data.paymentStatus).toBe("paid");

    const stripeResponse = await request(app).post(`/api/root/invoices/${invoiceId}/payment-link`);
    expect(stripeResponse.status).toBe(501);
    expect(stripeResponse.body.error.code).toBe("STRIPE_NOT_CONFIGURED");
  });

  it("accepts local client portal quote decisions without external sends", async () => {
    const service = new PacketService(new MemoryPacketStore(), new SuccessfulModelClient());
    const recoveryStoreDir = mkdtempSync(path.join(tmpdir(), "mission-control-client-portal-"));
    const app = createApp({ packetService: service, recoveryStoreDir });

    const createResponse = await request(app).post("/api/root/quotes").send({
      kind: "proposal",
      companyAccount: "content-co-op",
      client: {
        name: "Client Portal Test",
        email: "client@example.com",
      },
      title: "Portal proposal",
      scopeSummary: "A proposal visible in the CCO client portal.",
      lineItems: [{ name: "Production sprint", quantity: 1, unitPriceCents: 120000, category: "production" }],
      terms: "Client can approve or request changes.",
    });

    const proposalId = createResponse.body.data.id as string;
    const changesResponse = await request(app).post(`/api/root/quotes/${proposalId}/request-changes`).send({
      note: "Please add one revision cycle.",
    });
    expect(changesResponse.status).toBe(200);
    expect(changesResponse.body.data.status).toBe("changes_requested");
    expect(changesResponse.body.data.approvalStatus).toBe("requested");

    const approvalResponse = await request(app).post(`/api/root/quotes/${proposalId}/client-approve`);
    expect(approvalResponse.status).toBe(200);
    expect(approvalResponse.body.data.status).toBe("accepted");
    expect(approvalResponse.body.data.approvalStatus).toBe("approved");
  });

  it("accepts expanded advisory packet kinds with local fallback", async () => {
    const service = new PacketService(new MemoryPacketStore(), new SuccessfulModelClient());
    const app = createApp({ packetService: service });

    const response = await request(app).post("/api/packets").send({
      kind: "runtime_repair_plan",
      sourceSurface: "runtime",
      entityType: "runtime",
      entityId: "mission-control-shell",
      requestedBy: "operator",
      input: {
        text: "Mission Control must boot locally on 4300 before any public deployment.",
      },
      idempotencyKey: "api-runtime-repair-plan",
    });

    expect(response.status).toBe(202);
    expect(response.body.status).toBe("queued");
  });

  it("creates packets asynchronously and returns current state", async () => {
    const service = new PacketService(new MemoryPacketStore(), new SuccessfulModelClient());
    const app = createApp({ packetService: service });

    const createResponse = await request(app).post("/api/packets").send({
      kind: "thread_summarize",
      sourceSurface: "inbox",
      entityType: "thread",
      entityId: "job-1",
      requestedBy: "user-1",
      input: {
        messages: [{ sender: "Customer", content: "Can you summarize this thread?" }],
      },
      idempotencyKey: "api-create",
    });

    expect(createResponse.status).toBe(202);
    expect(createResponse.body.status).toBe("queued");

    const packetId = createResponse.body.packetId as string;
    const getResponse = await request(app).get(`/api/packets/${packetId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.packet.kind).toBe("thread_summarize");
    expect(getResponse.body.packet.status).toBe("queued");
  });

  it("retries only failed packets and cancels only queued packets", async () => {
    const store = new MemoryPacketStore();
    const failingService = new PacketService(store, new FailingModelClient());
    const app = createApp({ packetService: failingService });

    const failed = await failingService.createPacket({
      kind: "thread_reply_draft",
      sourceSurface: "inbox",
      entityType: "thread",
      entityId: "job-2",
      requestedBy: "user-1",
      input: {
        messages: [{ sender: "Customer", content: "Do you have my updated ETA?" }],
      },
      idempotencyKey: "api-failed",
    });

    const firstRun = await store.acquireNextQueuedPacket("worker-1", 30_000, new Date("2026-04-11T10:00:00.000Z"));
    if (!firstRun) throw new Error("Expected queued packet.");
    await store.markFailed(firstRun.id, "worker-1", { message: "operator review required" }, new Date("2026-04-11T10:00:00.000Z"));

    const secondRun = await store.acquireNextQueuedPacket("worker-1", 30_000, new Date("2026-04-11T10:01:00.000Z"));
    if (!secondRun) throw new Error("Expected retryable packet.");
    await store.markFailed(secondRun.id, "worker-1", { message: "operator review required" }, new Date("2026-04-11T10:01:00.000Z"));

    const thirdRun = await store.acquireNextQueuedPacket("worker-1", 30_000, new Date("2026-04-11T10:02:00.000Z"));
    if (!thirdRun) throw new Error("Expected final retry packet.");
    await store.markFailed(thirdRun.id, "worker-1", { message: "operator review required" }, new Date("2026-04-11T10:02:00.000Z"));

    const retryResponse = await request(app).post(`/api/packets/${failed.packet.id}/retry`);
    expect(retryResponse.status).toBe(200);
    expect(retryResponse.body.packet.status).toBe("queued");

    const queued = await failingService.createPacket({
      kind: "thread_summarize",
      sourceSurface: "inbox",
      entityType: "thread",
      entityId: "job-3",
      requestedBy: "user-1",
      input: {
        messages: [{ sender: "Customer", content: "I need a summary." }],
      },
      idempotencyKey: "api-cancel",
    });

    const cancelResponse = await request(app).post(`/api/packets/${queued.packet.id}/cancel`);
    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.packet.status).toBe("cancelled");

    const invalidRetry = await request(app).post(`/api/packets/${queued.packet.id}/retry`);
    expect(invalidRetry.status).toBe(409);
  });
});
