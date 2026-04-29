import express, { type Express } from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import twilio from "twilio";
import fs from "node:fs";
import path from "path";
import { hasEnvKey, normalizeTwilioPayload } from "../lib/server-utils";
import type { CompanyAccountId, MissionHandoffStatus } from "../lib/mission-control";
import { isPacketKind, isPacketStatus, type PacketCreateInput } from "../lib/packets";
import { listCanonicalInboxThreads, listCanonicalJobs, listCanonicalSchedule } from "./canonical-data";
import { decideMissionApproval, listMissionApprovals, missionApprovalEvents } from "./approval-store";
import {
  convertMissionHandoff,
  createMissionHandoff,
  getMissionHandoff,
  listMissionHandoffs,
  missionHandoffsToInboxThreads,
  missionHandoffsToJobCandidates,
  missionHandoffsToTasks,
  updateMissionHandoffStatus,
} from "./handoff-store";
import { getModelClientFromEnv, isGeminiCliAvailable } from "./model-client";
const modelClient = getModelClientFromEnv();
import {
  BUSINESS_EVENTS,
  COMPANY_ACCOUNTS,
  ACTIVE_MISSION_ROLLOUT,
  MISSION_ADAPTER_GAPS,
  MISSION_AGENT_LANES,
  MISSION_INTEGRATION_FLOWS,
  MISSION_MODULES,
  MISSION_OPERATING_DOMAINS,
  MISSION_READ_MODELS,
  MISSION_TASKS,
  MISSION_ROLLOUTS,
  MISSION_VALUE_LOOPS,
  RUNTIME_SURFACES,
  getMissionControlBootstrap,
} from "./mission-control-data";
import { getRuntimeProof } from "./runtime-proof";
import { getAcsQuoteHandoffV1Payload } from "./acs-quote-handoff-v1";
import { getVideoOSStore } from "./video-os-store";
import { getInteractionWiringAudit, getRootAuditStatus, getRootAuthorityMap, getRootEcosystemAudit } from "./root-audit";
import {
  RootBillingError,
  approveRootQuote,
  clientApproveRootQuote,
  convertRootQuoteToInvoice,
  createRootInvoice,
  createRootInvoiceReminderDraft,
  createRootQuote,
  exportRootQuotePdf,
  finalizeRootInvoiceArtifacts,
  getRootInvoice,
  getRootInvoicePdf,
  getRootQuote,
  getRootQuotePdf,
  issueRootInvoice,
  listRootBillingDocuments,
  markRootQuoteSent,
  recordRootInvoicePayment,
  requestRootQuoteApproval,
  requestRootQuoteChanges,
  reviseRootInvoice,
  createRootInvoicePaymentLink,
  updateRootInvoice,
  updateRootQuote,
  voidRootInvoice,
} from "./root-billing-store";
import { PacketService, PacketValidationError } from "./packet-service";
import { SupabasePacketStore } from "./packet-store";
import { getSupabaseAdminFromEnv } from "./supabase-admin";
import { authMiddleware, optionalAuthMiddleware, type AuthenticatedRequest } from "./auth-middleware";
import { createStripeEmbeddedSession, constructStripeEvent } from "./stripe-service";
import {
  createBriefSession,
  getBriefSession,
  listBriefSessions,
  updateBriefPhase,
  updateBriefSession,
  submitBrief,
  enrichBriefWithAI,
  convertBriefToProposalReady,
  setBriefRelatedQuote,
  addAdminNote,
} from "./creative-brief-store";
import { listCatalogItems, createCatalogItem, updateCatalogItem, deleteCatalogItem } from "./catalog-store";
import { listBankStatements, listBankTransactions, parseCsvTransactions, matchTransactionToInvoice, reconcileTransaction, getBankStats, type BankTransaction } from "./bank-store";

interface AppOptions {
  packetService?: PacketService | null;
  recoveryStoreDir?: string;
}

function createDefaultPacketService(): PacketService | null {
  const admin = getSupabaseAdminFromEnv();
  if (!admin) return null;

  return new PacketService(new SupabasePacketStore(admin), getModelClientFromEnv());
}

function missionControlEnvelope<T>(data: T) {
  return {
    data_source: "static_recovery_contract",
    generated_at: new Date().toISOString(),
    data,
  };
}

const OPERATOR_REGISTRY_REPORT_PATH =
  "/Users/baileyeubanks/Desktop/Projects/platform/runtime/operator-registry/operator-report-latest.json";
const OPERATOR_REGISTRY_PATH = "/Users/baileyeubanks/Desktop/Projects/platform/operator-registry.json";

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function getOperatorRegistryPayload() {
  const report = readJsonFile<Record<string, unknown>>(OPERATOR_REGISTRY_REPORT_PATH);
  const registry = readJsonFile<Record<string, unknown>>(OPERATOR_REGISTRY_PATH);

  return {
    report_status: report ? "available" : "missing",
    report_path: OPERATOR_REGISTRY_REPORT_PATH,
    registry_path: OPERATOR_REGISTRY_PATH,
    report,
    registry_version: typeof registry?.version === "number" ? registry.version : null,
    registry_lane_count: Array.isArray(registry?.lanes) ? registry.lanes.length : 0,
  };
}

function rootBillingEnvelope<T>(data: T) {
  return {
    ok: true,
    data_source: "local_recovery_store",
    generated_at: new Date().toISOString(),
    data,
  };
}

function rootBillingError(error: unknown) {
  if (error instanceof RootBillingError) {
    return {
      statusCode: error.statusCode,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  console.error("Root billing operation failed:", error);
  return {
    statusCode: 500,
    body: {
      ok: false,
      error: {
        code: "ROOT_BILLING_OPERATION_FAILED",
        message: "Root billing operation failed.",
      },
    },
  };
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const packetService = options.packetService ?? createDefaultPacketService();
  const recoveryStoreDir = options.recoveryStoreDir;

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // CORS
  app.use(cors({
    origin: process.env.APP_URL ? [process.env.APP_URL, process.env.APP_URL.replace(/^https?:\/\//, '')] : true,
    credentials: true,
  }));

  // Request logging (production only)
  if (process.env.NODE_ENV === "production") {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Local dev: redirect root to /admin for instant access
  if (process.env.NODE_ENV !== "production") {
    app.get("/", (req, res, next) => {
      if (req.headers.accept?.includes("text/html") && req.path === "/") {
        return res.redirect("/admin");
      }
      next();
    });
  }

  app.get("/api/version", (_req, res) => {
    res.json({
      version: process.env.npm_package_version || "0.0.0",
      node: process.version,
      env: process.env.NODE_ENV || "development",
      commit: process.env.RENDER_GIT_COMMIT || "unknown",
    });
  });

  app.get("/api/health", async (_req, res) => {
    const supabaseConfigured = hasEnvKey("SUPABASE_URL") && hasEnvKey("SUPABASE_SERVICE_ROLE_KEY");
    const twilioConfigured =
      hasEnvKey("TWILIO_ACCOUNT_SID") && hasEnvKey("TWILIO_AUTH_TOKEN") && hasEnvKey("TWILIO_PHONE_NUMBER");
    const geminiConfigured = hasEnvKey("GEMINI_API_KEY") || hasEnvKey("GOOGLE_API_KEY") || isGeminiCliAvailable();

    // Real connectivity probes
    let supabaseStatus: string = supabaseConfigured ? "configured" : "missing_config";
    let supabaseLatencyMs: number | null = null;
    if (supabaseConfigured) {
      const admin = getSupabaseAdminFromEnv();
      if (admin) {
        const probeStart = Date.now();
        try {
          const { error } = await admin.from("user_profiles").select("id").limit(1);
          supabaseLatencyMs = Date.now() - probeStart;
          supabaseStatus = error ? `degraded (${error.message})` : "reachable";
        } catch (e) {
          supabaseStatus = `unreachable (${e instanceof Error ? e.message : "probe failed"})`;
        }
      }
    }

    // Real system metrics
    const os = await import("node:os");
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      system: {
        cpu_load_percent: Math.round((loadAvg[0] / os.cpus().length) * 100),
        memory_used_gb: (usedMem / 1024 / 1024 / 1024).toFixed(1),
        memory_total_gb: (totalMem / 1024 / 1024 / 1024).toFixed(1),
        memory_used_percent: Math.round((usedMem / totalMem) * 100),
        platform: os.platform(),
        node_version: process.version,
      },
      services: {
        supabase: supabaseStatus,
        twilio: twilioConfigured ? "configured" : "missing_config",
        gemini: geminiConfigured ? "configured" : "missing_config",
        packets: packetService ? "enabled" : "missing_config",
      },
      probes: {
        supabase_latency_ms: supabaseLatencyMs,
      },
    });
  });

  app.get("/api/mission-control/bootstrap", (_req, res) => {
    const handoffTasks = missionHandoffsToTasks(listMissionHandoffs(recoveryStoreDir));
    const bootstrap = getMissionControlBootstrap(Boolean(packetService));
    return res.json({
      ...bootstrap,
      data_source: handoffTasks.length > 0 ? "mixed" : bootstrap.data_source,
      tasks: [...handoffTasks, ...bootstrap.tasks],
    });
  });

  app.get("/api/mission-control/accounts", (_req, res) => {
    return res.json(missionControlEnvelope(COMPANY_ACCOUNTS));
  });

  app.get("/api/mission-control/modules", (_req, res) => {
    return res.json(missionControlEnvelope(MISSION_MODULES));
  });

  app.get("/api/mission-control/tasks", (_req, res) => {
    return res.json(missionControlEnvelope([...missionHandoffsToTasks(listMissionHandoffs(recoveryStoreDir)), ...MISSION_TASKS]));
  });

  app.get("/api/mission-control/approvals", (_req, res) => {
    return res.json(missionControlEnvelope(listMissionApprovals(recoveryStoreDir)));
  });

  app.get("/api/mission-control/events", (_req, res) => {
    return res.json(missionControlEnvelope([...missionApprovalEvents(recoveryStoreDir), ...BUSINESS_EVENTS]));
  });

  app.get("/api/mission-control/runtimes", (_req, res) => {
    return res.json(missionControlEnvelope(RUNTIME_SURFACES));
  });

  app.get("/api/mission-control/rollout", (_req, res) => {
    return res.json(missionControlEnvelope(ACTIVE_MISSION_ROLLOUT));
  });

  app.get("/api/mission-control/rollouts", (_req, res) => {
    return res.json(missionControlEnvelope(MISSION_ROLLOUTS));
  });

  app.get("/api/mission-control/value-loops", (_req, res) => {
    return res.json(missionControlEnvelope(MISSION_VALUE_LOOPS));
  });

  app.get("/api/mission-control/agent-lanes", (_req, res) => {
    return res.json(missionControlEnvelope(MISSION_AGENT_LANES));
  });

  app.get("/api/mission-control/operating-domains", (_req, res) => {
    return res.json(missionControlEnvelope(MISSION_OPERATING_DOMAINS));
  });

  app.get("/api/mission-control/integration-flows", (_req, res) => {
    return res.json(missionControlEnvelope(MISSION_INTEGRATION_FLOWS));
  });

  app.get("/api/mission-control/adapter-gaps", (_req, res) => {
    return res.json(missionControlEnvelope(MISSION_ADAPTER_GAPS));
  });

  app.get("/api/mission-control/read-models", (req, res) => {
    const domain = typeof req.query.domain === "string" ? req.query.domain : null;
    const account = typeof req.query.account === "string" ? req.query.account : null;
    const data = MISSION_READ_MODELS.filter(
      (record) => (!domain || record.domainId === domain) && (!account || record.accountId === account),
    );
    return res.json(missionControlEnvelope(data));
  });

  app.get("/api/mission-control/runtime-proof", async (_req, res) => {
    return res.json(await getRuntimeProof());
  });

  app.get("/api/mission-control/operator-registry", (_req, res) => {
    return res.json(missionControlEnvelope(getOperatorRegistryPayload()));
  });

  app.get("/api/mission-control/acs-quote-handoff-v1", (_req, res) => {
    return res.json(missionControlEnvelope(getAcsQuoteHandoffV1Payload()));
  });

  app.post("/api/mission-control/approvals/:id/decision", (req, res) => {
    const decision = typeof req.body?.decision === "string" ? req.body.decision : "";
    if (decision !== "approved" && decision !== "rejected") {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_APPROVAL_DECISION",
          message: "decision must be approved or rejected.",
        },
      });
    }

    const approval = decideMissionApproval(
      req.params.id,
      decision,
      typeof req.body?.decided_by === "string" ? req.body.decided_by : "local-operator",
      typeof req.body?.note === "string" ? req.body.note : "Local recovery decision.",
      recoveryStoreDir,
    );

    if (!approval) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "APPROVAL_NOT_FOUND",
          message: "Mission Control approval was not found.",
        },
      });
    }

    return res.json({
      ok: true,
      data: approval,
    });
  });

  app.get("/api/root-audit/status", (_req, res) => {
    return res.json(getRootAuditStatus());
  });

  app.get("/api/root-audit/ecosystem", (_req, res) => {
    return res.json(getRootEcosystemAudit());
  });

  app.get("/api/root-audit/authority-map", (_req, res) => {
    return res.json(getRootAuthorityMap());
  });

  app.get("/api/root-audit/interactions", (_req, res) => {
    return res.json(getInteractionWiringAudit());
  });

  app.get("/api/root/billing", (_req, res) => {
    return res.json(rootBillingEnvelope(listRootBillingDocuments(recoveryStoreDir)));
  });

  app.get("/api/root/quotes", (req, res) => {
    const account = typeof req.query.account === "string" ? req.query.account : null;
    const clientEmail = typeof req.query.clientEmail === "string" ? req.query.clientEmail.toLowerCase().trim() : null;
    const state = listRootBillingDocuments(recoveryStoreDir);
    const quotes = state.quotes.filter((quote) => {
      if (account && quote.companyAccount !== account) return false;
      if (clientEmail && quote.client.email?.toLowerCase().trim() !== clientEmail) return false;
      return true;
    });
    return res.json(rootBillingEnvelope(quotes));
  });

  app.post("/api/root/quotes", (req, res) => {
    try {
      const quote = createRootQuote(req.body, recoveryStoreDir);
      return res.status(201).json(rootBillingEnvelope(quote));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.get("/api/root/quotes/:id", (req, res) => {
    const quote = getRootQuote(req.params.id, recoveryStoreDir);
    if (!quote) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "QUOTE_NOT_FOUND",
          message: "Quote or proposal not found.",
        },
      });
    }
    return res.json(rootBillingEnvelope(quote));
  });

  app.patch("/api/root/quotes/:id", (req, res) => {
    try {
      const quote = updateRootQuote(req.params.id, req.body, recoveryStoreDir);
      return res.json(rootBillingEnvelope(quote));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/quotes/:id/approval-request", (req, res) => {
    try {
      const quote = requestRootQuoteApproval(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope(quote));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/quotes/:id/approve", (req, res) => {
    try {
      const quote = approveRootQuote(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope(quote));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/quotes/:id/render-preview", (req, res) => {
    try {
      const quote = Object.keys(req.body ?? {}).length > 0
        ? updateRootQuote(req.params.id, req.body, recoveryStoreDir)
        : getRootQuote(req.params.id, recoveryStoreDir);
      if (!quote) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "QUOTE_NOT_FOUND",
            message: "Quote or proposal not found.",
          },
        });
      }
      return res.json(rootBillingEnvelope({ id: quote.id, previewHtml: quote.previewHtml, documentVersion: quote.documentVersion }));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/quotes/:id/export-pdf", async (req, res) => {
    try {
      const result = await exportRootQuotePdf(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope({ quote: result.quote, artifact: result.artifact }));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.get("/api/root/quotes/:id/pdf", async (req, res) => {
    try {
      const result = await getRootQuotePdf(req.params.id, recoveryStoreDir);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${result.quote.documentNumber}.pdf"`);
      return res.send(result.pdf);
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/quotes/:id/mark-sent", (req, res) => {
    try {
      const quote = markRootQuoteSent(
        req.params.id,
        typeof req.body?.note === "string" ? req.body.note : undefined,
        recoveryStoreDir,
      );
      return res.json(rootBillingEnvelope(quote));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/quotes/:id/client-approve", (req, res) => {
    try {
      const quote = clientApproveRootQuote(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope(quote));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/quotes/:id/request-changes", (req, res) => {
    try {
      const quote = requestRootQuoteChanges(
        req.params.id,
        typeof req.body?.note === "string" ? req.body.note : undefined,
        recoveryStoreDir,
      );
      return res.json(rootBillingEnvelope(quote));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/quotes/:id/convert-to-invoice", (req, res) => {
    try {
      const result = convertRootQuoteToInvoice(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope(result));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.get("/api/root/invoices", (req, res) => {
    const account = typeof req.query.account === "string" ? req.query.account : null;
    const clientEmail = typeof req.query.clientEmail === "string" ? req.query.clientEmail.toLowerCase().trim() : null;
    const state = listRootBillingDocuments(recoveryStoreDir);
    const invoices = state.invoices.filter((invoice) => {
      if (account && invoice.companyAccount !== account) return false;
      if (clientEmail && invoice.client.email?.toLowerCase().trim() !== clientEmail) return false;
      return true;
    });
    return res.json(rootBillingEnvelope(invoices));
  });

  app.post("/api/root/invoices", (req, res) => {
    try {
      const invoice = createRootInvoice(req.body, recoveryStoreDir);
      return res.status(201).json(rootBillingEnvelope(invoice));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.get("/api/root/invoices/:id", (req, res) => {
    const invoice = getRootInvoice(req.params.id, recoveryStoreDir);
    if (!invoice) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "INVOICE_NOT_FOUND",
          message: "Invoice not found.",
        },
      });
    }
    return res.json(rootBillingEnvelope(invoice));
  });

  app.patch("/api/root/invoices/:id", (req, res) => {
    try {
      const invoice = updateRootInvoice(req.params.id, req.body, recoveryStoreDir);
      return res.json(rootBillingEnvelope(invoice));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/invoices/:id/finalize-artifacts", async (req, res) => {
    try {
      const result = await finalizeRootInvoiceArtifacts(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope({ invoice: result.invoice, artifact: result.artifact }));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.get("/api/root/invoices/:id/pdf", async (req, res) => {
    try {
      const result = await getRootInvoicePdf(req.params.id, recoveryStoreDir);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${result.invoice.invoiceNumber}.pdf"`);
      return res.send(result.pdf);
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/invoices/:id/issue", (req, res) => {
    try {
      const invoice = issueRootInvoice(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope(invoice));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/invoices/:id/payment-link", async (req, res) => {
    try {
      const result = await createRootInvoicePaymentLink(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope({ invoice: result.invoice, link: result.link }));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/invoices/:id/record-payment", (req, res) => {
    try {
      const invoice = recordRootInvoicePayment(
        req.params.id,
        Number(req.body?.amountCents),
        typeof req.body?.note === "string" ? req.body.note : undefined,
        recoveryStoreDir,
      );
      return res.json(rootBillingEnvelope(invoice));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/invoices/:id/reminder-draft", (req, res) => {
    try {
      const invoice = createRootInvoiceReminderDraft(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope(invoice));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/invoices/:id/revise", (req, res) => {
    try {
      const invoice = reviseRootInvoice(req.params.id, recoveryStoreDir);
      return res.json(rootBillingEnvelope(invoice));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/invoices/:id/void", (req, res) => {
    try {
      const invoice = voidRootInvoice(
        req.params.id,
        typeof req.body?.reason === "string" ? req.body.reason : undefined,
        recoveryStoreDir,
      );
      return res.json(rootBillingEnvelope(invoice));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/root/invoices/:id/embedded-checkout", async (req, res) => {
    try {
      const invoice = getRootInvoice(req.params.id, recoveryStoreDir);
      if (!invoice) return res.status(404).json({ ok: false, error: { code: "INVOICE_NOT_FOUND", message: "Invoice not found." } });
      if (invoice.issueStatus !== "issued") {
        return res.status(409).json({ ok: false, error: { code: "INVOICE_NOT_ISSUED", message: "Only issued invoices can generate checkout sessions." } });
      }
      const session = await createStripeEmbeddedSession(invoice.id, invoice.totalCents, invoice.title);
      return res.json(rootBillingEnvelope({ invoice, session }));
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(501).json({ ok: false, error: { code: "STRIPE_NOT_CONFIGURED", message: "Webhook secret not configured." } });
    }
    try {
      const event = await constructStripeEvent(req.body, req.headers["stripe-signature"] as string, webhookSecret);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as { metadata?: { invoiceId?: string }; amount_total?: number; id: string };
        if (session.metadata?.invoiceId) {
          recordRootInvoicePayment(session.metadata.invoiceId, (session.amount_total || 0) * 100, `Stripe checkout ${session.id}`, recoveryStoreDir);
        }
      }
      return res.json({ received: true });
    } catch (error) {
      const payload = rootBillingError(error);
      return res.status(payload.statusCode).json(payload.body);
    }
  });

  app.get("/api/catalog", (req, res) => {
    const account = typeof req.query.account === "string" ? req.query.account : undefined;
    return res.json({ ok: true, data: listCatalogItems(account as CompanyAccountId | undefined, recoveryStoreDir) });
  });

  app.post("/api/catalog", (req, res) => {
    try {
      const item = createCatalogItem(req.body, recoveryStoreDir);
      return res.status(201).json({ ok: true, data: item });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.patch("/api/catalog/:id", (req, res) => {
    try {
      const item = updateCatalogItem(req.params.id, req.body, recoveryStoreDir);
      return res.json({ ok: true, data: item });
    } catch (error) {
      return res.status(404).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.delete("/api/catalog/:id", (req, res) => {
    try {
      deleteCatalogItem(req.params.id, recoveryStoreDir);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(404).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.get("/api/bank/statements", (req, res) => {
    const account = typeof req.query.account === "string" ? req.query.account : undefined;
    return res.json({ ok: true, data: listBankStatements(account as CompanyAccountId | undefined, recoveryStoreDir) });
  });

  app.get("/api/bank/transactions", (req, res) => {
    const account = typeof req.query.account === "string" ? req.query.account : undefined;
    const statementId = typeof req.query.statementId === "string" ? req.query.statementId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    return res.json({ ok: true, data: listBankTransactions({ account: account as CompanyAccountId | undefined, statementId, status: status as BankTransaction["status"] | undefined }, recoveryStoreDir) });
  });

  app.post("/api/bank/upload", (req, res) => {
    try {
      const { csvText, companyAccount, fileName } = req.body;
      if (!csvText || !companyAccount || !fileName) {
        return res.status(400).json({ ok: false, error: { message: "Missing csvText, companyAccount, or fileName" } });
      }
      const result = parseCsvTransactions(csvText, companyAccount, fileName, recoveryStoreDir);
      return res.status(201).json({ ok: true, data: result });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.post("/api/bank/transactions/:id/match", (req, res) => {
    try {
      const txn = matchTransactionToInvoice(req.params.id, req.body.invoiceId, req.body.invoiceNumber, recoveryStoreDir);
      return res.json({ ok: true, data: txn });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.post("/api/bank/transactions/:id/reconcile", (req, res) => {
    try {
      const txn = reconcileTransaction(req.params.id, recoveryStoreDir);
      return res.json({ ok: true, data: txn });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.get("/api/bank/stats", (req, res) => {
    const account = typeof req.query.account === "string" ? req.query.account : undefined;
    return res.json({ ok: true, data: getBankStats(account as CompanyAccountId | undefined, recoveryStoreDir) });
  });

  app.get("/api/creative-briefs", optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
    const filterUserId = req.user?.id;
    return res.json({ ok: true, data: listBriefSessions(recoveryStoreDir, filterUserId) });
  });

  app.post("/api/creative-briefs", optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id ?? null;
      const session = createBriefSession(req.body.source ?? "website", userId, recoveryStoreDir);
      return res.status(201).json({ ok: true, data: session });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.get("/api/creative-briefs/:id", optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
    const session = getBriefSession(req.params.id, recoveryStoreDir);
    if (!session) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Brief session not found." } });
    // If authenticated, only allow access to own briefs (admins can see all via separate route)
    if (req.user && session.userId && session.userId !== req.user.id) {
      return res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "You do not have access to this brief." } });
    }
    return res.json({ ok: true, data: session });
  });

  app.patch("/api/creative-briefs/:id", optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const session = getBriefSession(req.params.id, recoveryStoreDir);
      if (req.user && session && session.userId && session.userId !== req.user.id) {
        return res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "You do not have access to this brief." } });
      }
      const updated = updateBriefSession(req.params.id, req.body, recoveryStoreDir);
      return res.json({ ok: true, data: updated });
    } catch (error) {
      return res.status(404).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.patch("/api/creative-briefs/:id/phase/:phase", (req, res) => {
    try {
      const phase = req.params.phase as Parameters<typeof updateBriefPhase>[1];
      const session = updateBriefPhase(req.params.id, phase, req.body, recoveryStoreDir);
      return res.json({ ok: true, data: session });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.post("/api/creative-briefs/:id/submit", optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const session = getBriefSession(req.params.id, recoveryStoreDir);
      if (req.user && session && session.userId && session.userId !== req.user.id) {
        return res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "You do not have access to this brief." } });
      }
      const updated = submitBrief(req.params.id, recoveryStoreDir);
      return res.json({ ok: true, data: updated });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.post("/api/creative-briefs/:id/enrich", optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!modelClient) {
        return res.status(501).json({ ok: false, error: { code: "AI_UNAVAILABLE", message: "Gemini model client not configured." } });
      }
      const session = getBriefSession(req.params.id, recoveryStoreDir);
      if (req.user && session && session.userId && session.userId !== req.user.id) {
        return res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "You do not have access to this brief." } });
      }
      const updated = await enrichBriefWithAI(req.params.id, modelClient, recoveryStoreDir);
      return res.json({ ok: true, data: updated });
    } catch (error) {
      return res.status(500).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.post("/api/creative-briefs/:id/convert-to-proposal", optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const session = getBriefSession(req.params.id, recoveryStoreDir);
      if (req.user && session && session.userId && session.userId !== req.user.id) {
        return res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "You do not have access to this brief." } });
      }
      const updated = convertBriefToProposalReady(req.params.id, recoveryStoreDir);
      return res.json({ ok: true, data: updated });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.post("/api/creative-briefs/:id/admin-note", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const session = getBriefSession(req.params.id, recoveryStoreDir);
      if (!session) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Brief session not found." } });
      const updated = addAdminNote(req.params.id, String(req.body.text), String(req.body.author ?? req.user?.email ?? "admin"), recoveryStoreDir);
      return res.json({ ok: true, data: updated });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.post("/api/creative-briefs/:id/link-quote", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const session = getBriefSession(req.params.id, recoveryStoreDir);
      if (!session) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Brief session not found." } });
      const updated = setBriefRelatedQuote(req.params.id, String(req.body.quoteId), recoveryStoreDir);
      return res.json({ ok: true, data: updated });
    } catch (error) {
      return res.status(400).json({ ok: false, error: { message: String(error) } });
    }
  });

  app.get("/api/mission-control/handoffs", (req, res) => {
    const account = typeof req.query.account === "string" ? req.query.account : null;
    const handoffs = listMissionHandoffs(recoveryStoreDir).filter((handoff) => !account || handoff.company_account === account);
    return res.json({
      data_source: "local_recovery_store",
      generated_at: new Date().toISOString(),
      handoffs,
    });
  });

  app.get("/api/mission-control/handoffs/:id", (req, res) => {
    const handoff = getMissionHandoff(req.params.id, recoveryStoreDir);
    if (!handoff) {
      return res.status(404).json({ error: "Mission Control handoff not found." });
    }
    return res.json({
      data_source: "local_recovery_store",
      generated_at: new Date().toISOString(),
      handoff,
    });
  });

  app.post("/api/mission-control/handoffs", (req, res) => {
    try {
      const handoff = createMissionHandoff(req.body, recoveryStoreDir);
      return res.status(201).json({
        data_source: "local_recovery_store",
        generated_at: new Date().toISOString(),
        handoff,
      });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid Mission Control handoff." });
    }
  });

  app.post("/api/mission-control/handoffs/:id/status", (req, res) => {
    const status = typeof req.body?.status === "string" ? req.body.status : "";
    if (!["new", "triaged", "converted", "blocked"].includes(status)) {
      return res.status(400).json({ error: "status must be new, triaged, converted, or blocked." });
    }
    const handoff = updateMissionHandoffStatus(req.params.id, status as MissionHandoffStatus, recoveryStoreDir);
    if (!handoff) {
      return res.status(404).json({ error: "Mission Control handoff not found." });
    }
    return res.json({
      data_source: "local_recovery_store",
      generated_at: new Date().toISOString(),
      handoff,
    });
  });

  app.post("/api/mission-control/handoffs/:id/convert", (req, res) => {
    const handoff = convertMissionHandoff(req.params.id, recoveryStoreDir);
    if (!handoff) {
      return res.status(404).json({ error: "Mission Control handoff not found." });
    }
    return res.json({
      data_source: "local_recovery_store",
      generated_at: new Date().toISOString(),
      handoff,
    });
  });

  app.get("/api/mission-control/inbox", async (_req, res) => {
    const handoffThreads = missionHandoffsToInboxThreads(listMissionHandoffs(recoveryStoreDir));
    const supabaseAdmin = getSupabaseAdminFromEnv();
    if (!supabaseAdmin) {
      return res.json({
        data_source: "local_recovery_store",
        generated_at: new Date().toISOString(),
        threads: handoffThreads,
      });
    }

    try {
      const threads = await listCanonicalInboxThreads(supabaseAdmin);
      return res.json({
        data_source: "mixed",
        generated_at: new Date().toISOString(),
        threads: [...handoffThreads, ...threads],
      });
    } catch (error) {
      console.error("Mission Control Supabase inbox lookup failed; returning local handoffs:", error);
      return res.json({
        data_source: "local_recovery_store",
        generated_at: new Date().toISOString(),
        threads: handoffThreads,
      });
    }
  });

  app.get("/api/auth/role", async (req, res) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }

    const supabaseAdmin = getSupabaseAdminFromEnv();
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Supabase is not configured." });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        throw error;
      }

      return res.json({ role: typeof data?.role === "string" ? data.role : null });
    } catch (error) {
      console.error("Role lookup failed:", error);
      return res.status(500).json({ error: "Failed to fetch operator role." });
    }
  });

  app.get("/api/canonical/inbox", async (_req, res) => {
    const supabaseAdmin = getSupabaseAdminFromEnv();
    const handoffThreads = missionHandoffsToInboxThreads(listMissionHandoffs(recoveryStoreDir));
    if (!supabaseAdmin) {
      return res.json({ threads: handoffThreads });
    }

    try {
      const threads = await listCanonicalInboxThreads(supabaseAdmin);
      return res.json({ threads: [...handoffThreads, ...threads] });
    } catch (error) {
      console.error("Canonical inbox lookup failed; returning local handoffs:", error);
      return res.json({ threads: handoffThreads });
    }
  });

  app.get("/api/canonical/schedule", async (_req, res) => {
    const supabaseAdmin = getSupabaseAdminFromEnv();
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Supabase is not configured." });
    }

    try {
      const payload = await listCanonicalSchedule(supabaseAdmin);
      return res.json(payload);
    } catch (error) {
      console.error("Canonical schedule lookup failed:", error);
      return res.status(500).json({ error: "Failed to load canonical schedule." });
    }
  });

  app.get("/api/canonical/jobs", async (_req, res) => {
    const supabaseAdmin = getSupabaseAdminFromEnv();
    const localJobCandidates = missionHandoffsToJobCandidates(listMissionHandoffs(recoveryStoreDir));
    if (!supabaseAdmin) {
      return res.json({ jobs: localJobCandidates });
    }

    try {
      const jobs = await listCanonicalJobs(supabaseAdmin);
      return res.json({ jobs: [...localJobCandidates, ...jobs] });
    } catch (error) {
      console.error("Canonical jobs lookup failed; returning local handoff candidates:", error);
      return res.json({ jobs: localJobCandidates });
    }
  });

  app.post("/api/contacts", authMiddleware, async (req: AuthenticatedRequest, res) => {
    const supabaseAdmin = getSupabaseAdminFromEnv();
    if (!supabaseAdmin) {
      return res.status(503).json({ ok: false, error: "Supabase not configured." });
    }

    const { name, email, phone, company, type = "lead", status = "Lead" } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ ok: false, error: "Name and email are required." });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .insert({
          name,
          full_name: name,
          display_name: name,
          email,
          phone: phone || null,
          company: company || null,
          type,
          status,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(201).json({ ok: true, data });
    } catch (error) {
      console.error("Contact creation failed:", error);
      return res.status(500).json({ ok: false, error: "Failed to create contact." });
    }
  });

  app.post("/api/packets", async (req, res) => {
    if (!packetService) {
      return res.status(503).json({ error: "Packet service is not configured." });
    }

    const payload = req.body as Partial<PacketCreateInput>;
    if (!payload || !isPacketKind(payload.kind) || typeof payload.sourceSurface !== "string" || typeof payload.idempotencyKey !== "string") {
      return res.status(400).json({ error: "kind, sourceSurface, and idempotencyKey are required." });
    }

    try {
      const result = await packetService.createPacket({
        kind: payload.kind,
        sourceSurface: payload.sourceSurface,
        entityType: typeof payload.entityType === "string" ? payload.entityType : null,
        entityId: typeof payload.entityId === "string" ? payload.entityId : null,
        requestedBy: typeof payload.requestedBy === "string" ? payload.requestedBy : null,
        input: payload.input,
        idempotencyKey: payload.idempotencyKey,
      });

      return res.status(202).json({
        packetId: result.packet.id,
        status: result.packet.status,
        created: result.created,
      });
    } catch (error) {
      if (error instanceof PacketValidationError) {
        return res.status(400).json({ error: error.message });
      }

      console.error("Packet create failed:", error);
      return res.status(500).json({ error: "Failed to create packet." });
    }
  });

  app.get("/api/packets", async (req, res) => {
    if (!packetService) {
      return res.status(503).json({ error: "Packet service is not configured." });
    }

    try {
      const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
      const packets = await packetService.listPackets({
        entityType: typeof req.query.entityType === "string" ? req.query.entityType : undefined,
        entityId: typeof req.query.entityId === "string" ? req.query.entityId : undefined,
        status: isPacketStatus(req.query.status) ? req.query.status : undefined,
        kind: isPacketKind(req.query.kind) ? req.query.kind : undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      });

      return res.json({ packets });
    } catch (error) {
      console.error("Packet list failed:", error);
      return res.status(500).json({ error: "Failed to list packets." });
    }
  });

  app.get("/api/packets/:id", async (req, res) => {
    if (!packetService) {
      return res.status(503).json({ error: "Packet service is not configured." });
    }

    try {
      const packet = await packetService.getPacket(req.params.id);
      if (!packet) {
        return res.status(404).json({ error: "Packet not found." });
      }

      return res.json({ packet });
    } catch (error) {
      console.error("Packet lookup failed:", error);
      return res.status(500).json({ error: "Failed to fetch packet." });
    }
  });

  app.post("/api/packets/:id/retry", async (req, res) => {
    if (!packetService) {
      return res.status(503).json({ error: "Packet service is not configured." });
    }

    try {
      const packet = await packetService.retryPacket(req.params.id);
      if (!packet) {
        return res.status(409).json({ error: "Only failed packets can be retried." });
      }

      return res.json({ packet });
    } catch (error) {
      console.error("Packet retry failed:", error);
      return res.status(500).json({ error: "Failed to retry packet." });
    }
  });

  app.post("/api/packets/:id/cancel", async (req, res) => {
    if (!packetService) {
      return res.status(503).json({ error: "Packet service is not configured." });
    }

    try {
      const packet = await packetService.cancelPacket(req.params.id);
      if (!packet) {
        return res.status(409).json({ error: "Only queued or running packets can be cancelled." });
      }

      return res.json({ packet });
    } catch (error) {
      console.error("Packet cancel failed:", error);
      return res.status(500).json({ error: "Failed to cancel packet." });
    }
  });

  app.post("/api/twilio/send", async (req, res) => {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        return res.status(500).json({ error: "Twilio credentials missing in environment" });
      }

      const client = twilio(accountSid, authToken);
      const payload = normalizeTwilioPayload(req.body);
      if (!payload?.to || !payload.message) {
        return res.status(400).json({ error: "Missing 'to' or 'message' in request body" });
      }

      const response = await client.messages.create({
        body: payload.message.length > 3200 ? payload.message.slice(0, 3200) : payload.message,
        from: fromNumber,
        to: payload.to,
      });

      return res.json({ success: true, messageId: response.sid });
    } catch (error) {
      console.error("Twilio error:", error);
      return res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/twilio/webhook", async (req, res) => {
    const { From, Body, MessageSid, To, ProfileName, NumMedia } = req.body as {
      From?: string;
      Body?: string;
      MessageSid?: string;
      To?: string;
      ProfileName?: string;
      NumMedia?: string;
    };

    try {
      if (typeof From !== "string" || !From.trim() || typeof Body !== "string" || !Body.trim()) {
        return res.status(400).send("Missing required 'From' or 'Body' fields");
      }

      const sender = From.trim();
      const message = Body.trim();
      const supabaseAdmin = getSupabaseAdminFromEnv();

      if (!supabaseAdmin) {
        console.warn("Webhook received but Supabase is not configured. Message logged to console only.");
        console.log(`INBOUND_SMS from=${sender} body=${message}`);
        return res.type("text/xml").send(new twilio.twiml.MessagingResponse().toString());
      }

      const normalizedDigits = sender.replace(/\D/g, "");
      const lookupCandidates = Array.from(new Set([sender, normalizedDigits, normalizedDigits.replace(/^1/, "")])).filter(Boolean);
      const contactFilters = lookupCandidates.flatMap((value) => [`phone.eq.${value}`, `secondary_phone.eq.${value}`]);
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .or(contactFilters.join(","))
        .limit(1)
        .maybeSingle();
      const senderId = (contact as { id?: string | null } | null)?.id ?? null;

      const idempotencyKey = typeof MessageSid === "string" && MessageSid.trim()
        ? MessageSid.trim()
        : `twilio:${sender}:${Date.now()}`;
      const { data: existingEvent } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("type", "inbound_client_message")
        .contains("payload", { idempotency_key: idempotencyKey })
        .limit(1)
        .maybeSingle();

      if (!existingEvent) {
        await supabaseAdmin.from("events").insert([
          {
            contact_id: senderId,
            type: "inbound_client_message",
            payload: {
              text: message,
              channel: "sms",
              metadata: {
                from: sender,
                to: typeof To === "string" ? To : null,
                provider: "twilio",
                message_sid: typeof MessageSid === "string" ? MessageSid : null,
                num_segments: null,
                media_count: typeof NumMedia === "string" ? NumMedia : null,
                profile_name: typeof ProfileName === "string" ? ProfileName : null,
              },
              direction: "inbound",
              contact_id: senderId,
              received_at: new Date().toISOString(),
              business_unit: "ACS",
              event_version: "v1",
              envelope_version: "acs-event-envelope-v1",
              idempotency_key: idempotencyKey,
              external_thread_id: sender,
            },
          },
        ] as any);
      }

      return res.type("text/xml").send(new twilio.twiml.MessagingResponse().toString());
    } catch (error) {
      console.error("Twilio Webhook Error:", error);
      return res.status(500).send("Error processing webhook");
    }
  });

  // Aether Video OS API routes
  const videoStore = getVideoOSStore();

  app.get("/api/video-os/bootstrap", (_req, res) => {
    res.json(videoStore.getBootstrap());
  });

  app.get("/api/video-os/projects", (_req, res) => {
    res.json({ data: videoStore.listProjects(), meta: { timestamp: new Date().toISOString() } });
  });

  app.get("/api/video-os/projects/:projectId", (req, res) => {
    const project = videoStore.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json({ data: project, meta: { projectId: req.params.projectId, timestamp: new Date().toISOString() } });
  });

  app.post("/api/video-os/projects", (req, res) => {
    const project = videoStore.createProject(req.body);
    res.status(201).json({ data: project, meta: { timestamp: new Date().toISOString() } });
  });

  app.patch("/api/video-os/projects/:projectId", (req, res) => {
    const project = videoStore.updateProject(req.params.projectId, req.body);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json({ data: project, meta: { projectId: req.params.projectId, timestamp: new Date().toISOString() } });
  });

  app.get("/api/video-os/projects/:projectId/assets", (req, res) => {
    res.json({ data: videoStore.listAssets(req.params.projectId), meta: { projectId: req.params.projectId, timestamp: new Date().toISOString() } });
  });

  app.post("/api/video-os/assets", (req, res) => {
    const asset = videoStore.createAsset(req.body);
    res.status(201).json({ data: asset, meta: { timestamp: new Date().toISOString() } });
  });

  app.get("/api/video-os/assets/:assetId/comments", (req, res) => {
    res.json({ data: videoStore.listComments(req.params.assetId), meta: { timestamp: new Date().toISOString() } });
  });

  app.post("/api/video-os/assets/:assetId/comments", (req, res) => {
    const comment = videoStore.createComment(req.params.assetId, req.body);
    res.status(201).json({ data: comment, meta: { timestamp: new Date().toISOString() } });
  });

  app.get("/api/video-os/agents", (req, res) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    res.json({ data: videoStore.listAgentTasks(projectId), meta: { timestamp: new Date().toISOString() } });
  });

  app.post("/api/video-os/agents/dispatch", (req, res) => {
    const task = videoStore.dispatchAgentTask(req.body);
    res.status(201).json({ data: task, meta: { timestamp: new Date().toISOString() } });
  });

  app.get("/api/video-os/research", (req, res) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    res.json({ data: videoStore.listResearch(projectId), meta: { timestamp: new Date().toISOString() } });
  });

  app.post("/api/video-os/research", (req, res) => {
    const research = videoStore.createResearch(req.body);
    res.status(201).json({ data: research, meta: { timestamp: new Date().toISOString() } });
  });

  app.get("/api/video-os/deliveries", (req, res) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    res.json({ data: videoStore.listDeliveries(projectId), meta: { timestamp: new Date().toISOString() } });
  });

  app.post("/api/video-os/deliveries", (req, res) => {
    const delivery = videoStore.createDelivery(req.body);
    res.status(201).json({ data: delivery, meta: { timestamp: new Date().toISOString() } });
  });

  return app;
}

export async function startHttpServer(port = Number(process.env.PORT || 4300)): Promise<void> {
  const app = createApp();

  // Phantom Cutter requires SharedArrayBuffer — enforce COOP/COEP globally
  app.use((_req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  await new Promise<void>((resolve) => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`\n🚀 Server running on http://localhost:${port}`);
      console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`   Supabase:    ${hasEnvKey("SUPABASE_URL") ? "✅" : "❌"}`);
      console.log(`   Stripe:      ${hasEnvKey("STRIPE_SECRET_KEY") ? "✅" : "❌"}`);
      console.log(`   Gemini:      ${hasEnvKey("GEMINI_API_KEY") ? "✅" : "❌"}`);
      console.log(`   Twilio:      ${hasEnvKey("TWILIO_ACCOUNT_SID") ? "✅" : "❌"}`);
      console.log("");
      resolve();
    });
  });
}
