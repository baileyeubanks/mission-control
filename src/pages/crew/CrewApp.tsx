import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  FileWarning,
  Flag,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  PackageCheck,
  Play,
  RefreshCcw,
  Route,
  SendHorizontal,
  Shield,
  SquareCheck,
  TimerReset,
  UploadCloud,
  Wifi,
  WifiOff,
} from "lucide-react";

type CrewJobState = "scheduled" | "en_route" | "arrived" | "in_progress" | "blocked" | "completed";
type EtaConfidence = "high" | "degraded" | "unknown";
type CrewTab = "route" | "job" | "checklist" | "proof" | "sync";
type ChecklistGroup = "arrival" | "service" | "closeout";
type ProofType = "arrival" | "completion" | "issue" | "signature";
type PrimaryActionKey = "preflight" | "shift" | "depart" | "arrive" | "start" | "checklist" | "proof" | "complete" | "issue" | "closed";
type AudienceMode = "crew" | "admin" | "client";

interface CrewPreflightItem {
  id: string;
  label: string;
  detail: string;
  required: boolean;
}

interface ChecklistItem {
  id: string;
  group: ChecklistGroup;
  label: string;
  required: boolean;
}

interface CrewJob {
  id: string;
  bookingId: string;
  workClaimId: string;
  stop: number;
  title: string;
  customer: string;
  address: string;
  description: string;
  state: CrewJobState;
  scheduledWindow: string;
  scheduledStart: string;
  eta: string;
  etaConfidence: EtaConfidence;
  routeMiles: number;
  routeLeg: string;
  durationMinutes: number;
  serviceFacts: string[];
  accessNotes: string;
  entryCode: string | null;
  entryStatus: "ready" | "verify" | "blocked";
  parkingNotes: string;
  dispatcherPhone: string;
  dispatchOwner: string;
  clientPhone: string | null;
  safetyNotes: string[];
  preferences: string[];
  supplies: string[];
  crew: string[];
  servicePlan: string;
  propertyProfile: string;
  riskLevel: "normal" | "watch" | "blocked";
  readiness: {
    status: "eligible" | "blocked" | "review";
    label: string;
  };
  invoiceReadiness: string;
  billingLink: string;
  customerNoticePolicy: string;
  geofenceStatus: "inside" | "outside" | "not_geocoded" | "local_only";
  closeoutPolicy: string;
  checklist: ChecklistItem[];
  proofRequirements: ProofType[];
}

interface ProofMarker {
  id: string;
  type: ProofType;
  note: string;
  createdAt: string;
  status: "queued_local_marker";
}

interface CrewJobProgress {
  jobState: CrewJobState | null;
  checkedIds: string[];
  proofs: ProofMarker[];
  issueNotes: string[];
  startedAt: string | null;
  completedAt: string | null;
}

interface SyncAction {
  id: string;
  jobId: string;
  localSequenceNumber: number;
  payloadHash: string;
  type:
    | "job_check_in"
    | "checklist_update"
    | "photo_marker"
    | "signature_marker"
    | "exception_reported"
    | "status_transition"
    | "gps_ping"
    | "eta_draft"
    | "customer_notice_draft";
  label: string;
  retryState: "queued" | "failed" | "acked";
  replayResult?: string;
  createdAt: string;
}

const STORAGE_KEY = "mission-control.crewApp.progress.v2";
const SHIFT_STORAGE_KEY = "mission-control.crewApp.shiftStarted.v1";
const PREFLIGHT_STORAGE_KEY = "mission-control.crewApp.preflight.v1";

const baseChecklist: ChecklistItem[] = [
  { id: "arrival-confirm-address", group: "arrival", label: "Confirm address and access notes before arrival", required: true },
  { id: "arrival-safety-scan", group: "arrival", label: "Scan entry, pets, hazards, and fragile areas", required: true },
  { id: "service-kitchen", group: "service", label: "Kitchen reset complete", required: true },
  { id: "service-bathrooms", group: "service", label: "Bathrooms cleaned and restocked", required: true },
  { id: "service-floors", group: "service", label: "Floors vacuumed/mopped", required: true },
  { id: "service-dusting", group: "service", label: "Dusting and high-touch surfaces complete", required: false },
  { id: "closeout-walkthrough", group: "closeout", label: "Final walkthrough completed", required: true },
  { id: "closeout-notes", group: "closeout", label: "Service notes added for dispatcher", required: true },
];

const preflightItems: CrewPreflightItem[] = [
  { id: "route-reviewed", label: "Route", detail: "Stops, windows, blocks", required: true },
  { id: "supplies-loaded", label: "Supplies", detail: "Kit, mop heads, vacuum", required: true },
  { id: "uniform-ppe", label: "PPE", detail: "Uniform, gloves, shoe covers", required: true },
  { id: "certs-current", label: "Certs", detail: "Training readiness valid", required: true },
];

const quickIssueOptions = [
  "Access blocked",
  "Running late",
  "Damage found",
  "Supply missing",
  "Safety concern",
  "Client question",
];

function localCrewJobs(): CrewJob[] {
  const now = Date.now();
  return [
    {
      id: "local-crew-job-001",
      bookingId: "ACS-BKG-1048",
      workClaimId: "ACS-WC-1048-RIV",
      stop: 1,
      title: "River Oaks recurring clean",
      customer: "River Oaks Residence",
      address: "River Oaks, Houston, TX",
      description: "Weekly maintenance visit after first-service reset.",
      state: "scheduled",
      scheduledWindow: "9:00 AM - 11:30 AM",
      scheduledStart: new Date(now + 20 * 60 * 1000).toISOString(),
      eta: "18 min",
      etaConfidence: "degraded",
      routeMiles: 7.4,
      routeLeg: "Shop -> River Oaks",
      durationMinutes: 150,
      serviceFacts: ["3bd / 2.5ba", "Occupied", "Small dog", "Stone counters"],
      accessNotes: "Gate code pending confirmation. Shoes off upstairs. Small dog may be inside.",
      entryCode: "Gate code: pending dispatcher confirmation",
      entryStatus: "verify",
      parkingNotes: "Use guest parking by the north entrance.",
      dispatcherPhone: "(713) 555-0186",
      dispatchOwner: "Caio review lane",
      clientPhone: null,
      safetyNotes: ["Do not move piano bench", "Use client-provided stone-safe spray on island"],
      preferences: ["Start with bathrooms", "Text dispatcher if supplies are missing"],
      supplies: ["Stone-safe spray", "Microfiber kit", "HEPA vacuum", "Floor mop"],
      crew: ["North Team", "Caio review lane"],
      servicePlan: "Recurring weekly",
      propertyProfile: "Occupied home · premium recurring client · stone counters",
      riskLevel: "watch",
      readiness: {
        status: "review",
        label: "Crew eligible. Gate code needs dispatcher check.",
      },
      invoiceReadiness: "Completion proof required before closeout.",
      billingLink: "Recurring plan invoice closes after service proof.",
      customerNoticePolicy: "ETA and completion updates draft for dispatcher approval.",
      geofenceStatus: "local_only",
      closeoutPolicy: "Do not mark complete until closeout walkthrough and service notes are done.",
      checklist: baseChecklist,
      proofRequirements: ["arrival", "completion"],
    },
    {
      id: "local-crew-job-002",
      bookingId: "ACS-BKG-1049",
      workClaimId: "ACS-WC-1049-HTS",
      stop: 2,
      title: "Move-out reset",
      customer: "Heights property",
      address: "Heights, Houston, TX",
      description: "Move-out cleaning. Focus kitchen, bathrooms, floors, and cabinet interiors.",
      state: "scheduled",
      scheduledWindow: "12:30 PM - 4:00 PM",
      scheduledStart: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      eta: "42 min after stop 1",
      etaConfidence: "unknown",
      routeMiles: 11.8,
      routeLeg: "River Oaks -> Heights",
      durationMinutes: 210,
      serviceFacts: ["Move-out", "Vacant", "Cabinet interiors", "Damage photos"],
      accessNotes: "Lockbox code is not confirmed. Do not dispatch until code is resolved.",
      entryCode: null,
      entryStatus: "blocked",
      parkingNotes: "Street parking. Check signage before unload.",
      dispatcherPhone: "(713) 555-0186",
      dispatchOwner: "Dispatch desk",
      clientPhone: null,
      safetyNotes: ["Vacant property", "Check utilities before wet work"],
      preferences: ["Photograph any damage before cleaning", "Leave blinds open after closeout"],
      supplies: ["Degreaser", "Cabinet cloths", "Trash bags", "Extra mop heads"],
      crew: ["North Team"],
      servicePlan: "One-time move-out",
      propertyProfile: "Vacant move-out · possible utility risk · damage photos required",
      riskLevel: "blocked",
      readiness: {
        status: "blocked",
        label: "Blocked: access code missing.",
      },
      invoiceReadiness: "Not invoice-ready until access and proof are complete.",
      billingLink: "Invoice should stay draft until access blocker is resolved.",
      customerNoticePolicy: "No client update until access blocker is resolved by dispatch.",
      geofenceStatus: "not_geocoded",
      closeoutPolicy: "Capture issue proof if access remains blocked or utilities are unavailable.",
      checklist: baseChecklist,
      proofRequirements: ["arrival", "completion", "issue"],
    },
  ];
}

function loadProgress(): Record<string, CrewJobProgress> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, CrewJobProgress>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, CrewJobProgress>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function loadShiftStarted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHIFT_STORAGE_KEY) === "true";
}

function saveShiftStarted(started: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHIFT_STORAGE_KEY, String(started));
}

function loadPreflightCheckedIds() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFLIGHT_STORAGE_KEY) || "[]") as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePreflightCheckedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFLIGHT_STORAGE_KEY, JSON.stringify(ids));
}

function blankProgress(): CrewJobProgress {
  return {
    jobState: null,
    checkedIds: [],
    proofs: [],
    issueNotes: [],
    startedAt: null,
    completedAt: null,
  };
}

function confidenceTone(confidence: EtaConfidence) {
  if (confidence === "high") return "text-success";
  if (confidence === "degraded") return "text-warning";
  return "text-muted-foreground";
}

function readinessTone(status: CrewJob["readiness"]["status"]) {
  if (status === "eligible") return "text-success";
  if (status === "blocked") return "text-destructive";
  return "text-warning";
}

function stateTone(state: CrewJobState) {
  if (state === "completed") return "text-success";
  if (state === "blocked") return "text-destructive";
  if (state === "in_progress" || state === "arrived" || state === "en_route") return "text-primary";
  return "text-warning";
}

function riskTone(risk: CrewJob["riskLevel"]) {
  if (risk === "blocked") return "text-destructive";
  if (risk === "watch") return "text-warning";
  return "text-success";
}

function geofenceLabel(status: CrewJob["geofenceStatus"]) {
  if (status === "inside") return "Inside";
  if (status === "outside") return "Outside";
  if (status === "not_geocoded") return "No geo";
  return "Local";
}

function geofenceTone(status: CrewJob["geofenceStatus"]) {
  if (status === "inside") return "text-success";
  if (status === "outside") return "text-warning";
  if (status === "not_geocoded") return "text-destructive";
  return "text-warning";
}

function groupLabel(group: ChecklistGroup) {
  if (group === "arrival") return "Arrival";
  if (group === "service") return "Service";
  return "Closeout";
}

function stateLabel(state: CrewJobState) {
  return state.replace(/_/g, " ");
}

function proofLabel(type: ProofType) {
  if (type === "arrival") return "Arrival photo";
  if (type === "completion") return "Completion photo";
  if (type === "signature") return "Signature";
  return "Issue photo";
}

function localHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8)}`;
}

function nextActionFor(job: CrewJob, progress: CrewJobProgress) {
  if (job.readiness.status === "blocked" || job.state === "blocked") return "Resolve blocker";
  if (job.state === "scheduled") return "Depart";
  if (job.state === "en_route") return "Mark arrived";
  if (job.state === "arrived") return "Start clean";
  if (job.state === "in_progress") {
    const missingChecklist = job.checklist.filter((item) => item.required && !progress.checkedIds.includes(item.id)).length;
    if (missingChecklist > 0) return `${missingChecklist} checks left`;
    const missingProof = job.proofRequirements.filter((type) => !progress.proofs.some((proof) => proof.type === type)).length;
    if (missingProof > 0) return `${missingProof} proof left`;
    return "Complete";
  }
  if (job.state === "completed") return "Closed locally";
  return "Review";
}

function primaryActionFor(
  job: CrewJob,
  progress: CrewJobProgress,
  shiftStarted: boolean,
  preflightComplete: boolean,
): { key: PrimaryActionKey; label: string; detail: string; disabled?: boolean } {
  if (!preflightComplete && !shiftStarted && job.state === "scheduled") {
    return { key: "preflight", label: "Review preflight", detail: "Tap the readiness checks below before the route can move." };
  }
  if (!shiftStarted) {
    return { key: "shift", label: "Start route", detail: "Preflight is complete. Start the route before leaving for stop one." };
  }
  if (job.readiness.status === "blocked" || job.state === "blocked") {
    return { key: "issue", label: "Resolve blocker", detail: job.readiness.label };
  }
  if (job.state === "scheduled") {
    return { key: "depart", label: "Drive to stop", detail: "Queue GPS, draft the ETA update, and move into the first stop." };
  }
  if (job.state === "en_route") {
    return { key: "arrive", label: "Mark arrived", detail: "Confirm arrival before opening the work lane." };
  }
  if (job.state === "arrived") {
    return { key: "start", label: "Start clean", detail: "Begin service timer and checklist." };
  }
  if (job.state === "in_progress") {
    const missingChecklist = job.checklist.filter((item) => item.required && !progress.checkedIds.includes(item.id)).length;
    if (missingChecklist > 0) {
      return { key: "checklist", label: "Open checklist", detail: `${missingChecklist} required checks left.` };
    }
    const missingProof = job.proofRequirements.filter((type) => !progress.proofs.some((proof) => proof.type === type)).length;
    if (missingProof > 0) {
      return { key: "proof", label: "Add proof", detail: `${missingProof} proof marker${missingProof === 1 ? "" : "s"} left.` };
    }
    return { key: "complete", label: "Complete job", detail: "Checklist and proof are ready for closeout." };
  }
  return { key: "closed", label: "Closed", detail: "This stop is locally complete.", disabled: true };
}

function hasActiveFieldState(job: CrewJob) {
  return ["en_route", "arrived", "in_progress"].includes(job.state);
}

function phaseIndexFor(job: CrewJob) {
  if (job.state === "completed") return 4;
  if (job.state === "in_progress") return 3;
  if (job.state === "arrived") return 2;
  if (job.state === "en_route") return 1;
  return 0;
}

function closeoutReady(job: CrewJob, progress: CrewJobProgress) {
  const requiredChecklistComplete = job.checklist.filter((item) => item.required).every((item) => progress.checkedIds.includes(item.id));
  const requiredProofComplete = job.proofRequirements.every((type) => progress.proofs.some((proof) => proof.type === type));
  return requiredChecklistComplete && requiredProofComplete;
}

function invoiceGateLabel(job: CrewJob, progress: CrewJobProgress) {
  if (job.state === "completed") return "Ready for admin invoice review";
  if (closeoutReady(job, progress)) return "Field proof ready";
  return "Waiting on checklist and proof";
}

function outcomeFor(job: CrewJob, progress: CrewJobProgress, primaryAction: { key: PrimaryActionKey; label: string }) {
  const requiredLeft = job.checklist.filter((item) => item.required && !progress.checkedIds.includes(item.id)).length;
  const proofLeft = job.proofRequirements.filter((type) => !progress.proofs.some((proof) => proof.type === type)).length;
  const ready = closeoutReady(job, progress);

  if (job.readiness.status === "blocked" || job.state === "blocked") {
    return {
      crew: "Escalate blocker",
      admin: "Resolve dispatch",
      client: "No update yet",
    };
  }

  if (primaryAction.key === "preflight" || primaryAction.key === "shift") {
    return {
      crew: "Prepare route",
      admin: "Readiness visible",
      client: "No service update",
    };
  }

  if (primaryAction.key === "depart" || primaryAction.key === "arrive") {
    return {
      crew: "Move to site",
      admin: "ETA draft only",
      client: "Await approval",
    };
  }

  if (primaryAction.key === "start" || primaryAction.key === "checklist") {
    return {
      crew: requiredLeft ? `${requiredLeft} checks left` : "Checklist done",
      admin: "Watching closeout",
      client: "Service in progress",
    };
  }

  if (primaryAction.key === "proof") {
    return {
      crew: `${proofLeft} proof left`,
      admin: "Invoice blocked",
      client: "No invoice yet",
    };
  }

  if (ready || primaryAction.key === "complete" || primaryAction.key === "closed") {
    return {
      crew: job.state === "completed" ? "Stop closed" : "Close stop",
      admin: "Invoice review",
      client: "Invoice after review",
    };
  }

  return {
    crew: primaryAction.label,
    admin: "Waiting",
    client: "Pending",
  };
}

function formatShortTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mapSupabaseJob(row: any, index: number): CrewJob {
  return {
    id: String(row.id),
    bookingId: row.booking_id || `ACS-BKG-${index + 1}`,
    workClaimId: row.work_claim_id || `ACS-WC-${String(row.id).slice(0, 6)}`,
    stop: index + 1,
    title: row.title || "Assigned service",
    customer: row.client_name || row.title || "Client",
    address: row.description || "Location TBD",
    description: row.description || "Assigned ACS service.",
    state: ["scheduled", "en_route", "arrived", "in_progress", "blocked", "completed"].includes(row.state) ? row.state : "scheduled",
    scheduledWindow: row.scheduled_start ? formatShortTime(row.scheduled_start) : "TBD",
    scheduledStart: row.scheduled_start || new Date().toISOString(),
    eta: "live ETA pending",
    etaConfidence: "unknown",
    routeMiles: 0,
    routeLeg: "Live route pending",
    durationMinutes: 120,
    serviceFacts: ["Live job", "Property facts pending"],
    accessNotes: row.access_notes || "No special access instructions.",
    entryCode: row.entry_code || null,
    entryStatus: row.entry_code ? "ready" : "verify",
    parkingNotes: row.parking_notes || "Parking notes not provided.",
    dispatcherPhone: "(713) 555-0186",
    dispatchOwner: "Dispatch desk",
    clientPhone: row.client_phone || null,
    safetyNotes: ["Confirm site conditions before service."],
    preferences: ["Follow dispatcher notes."],
    supplies: ["Standard cleaning kit"],
    crew: ["Assigned crew"],
    servicePlan: "Scheduled service",
    propertyProfile: "Supabase job mapped; property profile pending.",
    riskLevel: "watch",
    readiness: {
      status: "review",
      label: "Supabase job mapped. Verify readiness.",
    },
    invoiceReadiness: "Proof and closeout required.",
    billingLink: "Billing projection pending canonical invoice link.",
    customerNoticePolicy: "Arrival and completion notices require dispatcher approval.",
    geofenceStatus: "local_only",
    closeoutPolicy: "Complete checklist and proof before closeout.",
    checklist: baseChecklist,
    proofRequirements: ["arrival", "completion"],
  };
}

export function CrewApp() {
  const { user, logout, isAuthReady, isLocalRecovery } = useAuth();
  const [jobs, setJobs] = useState<CrewJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CrewTab>("route");
  const [shiftStarted, setShiftStarted] = useState(() => loadShiftStarted());
  const [preflightCheckedIds, setPreflightCheckedIds] = useState<string[]>(() => loadPreflightCheckedIds());
  const [progress, setProgress] = useState<Record<string, CrewJobProgress>>(() => loadProgress());
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("crew");
  const [syncActions, setSyncActions] = useState<SyncAction[]>([
    {
      id: "sync-seed-route",
      jobId: "route",
      localSequenceNumber: 1,
      payloadHash: localHash("route:loaded"),
      type: "status_transition",
      label: "Route snapshot loaded locally.",
      retryState: "acked",
      replayResult: "local route ready",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [issueNote, setIssueNote] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [showAccess, setShowAccess] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs.find(hasActiveFieldState) ?? jobs[0] ?? null,
    [jobs, selectedJobId],
  );
  const selectedProgress = selectedJob ? progress[selectedJob.id] ?? blankProgress() : blankProgress();
  const activeJob = jobs.find(hasActiveFieldState) ?? null;
  const visibleShiftStarted = shiftStarted || Boolean(activeJob);
  const preflightComplete = preflightItems.filter((item) => item.required).every((item) => preflightCheckedIds.includes(item.id));
  const nextPendingJob = selectedJob ? jobs.find((job) => job.id !== selectedJob.id && job.state !== "completed") ?? null : null;

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    saveShiftStarted(shiftStarted);
  }, [shiftStarted]);

  useEffect(() => {
    savePreflightCheckedIds(preflightCheckedIds);
  }, [preflightCheckedIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const markOnline = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  useEffect(() => {
    if (activeJob && !shiftStarted) {
      setShiftStarted(true);
    }
  }, [activeJob?.id, shiftStarted]);

  const enqueue = (jobId: string, type: SyncAction["type"], label: string, retryState: SyncAction["retryState"] = "queued") => {
    setSyncActions((current) => [
      {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        jobId,
        localSequenceNumber: current.length + 1,
        payloadHash: localHash(`${jobId}:${type}:${label}:${Date.now()}`),
        type,
        label,
        retryState,
        replayResult: retryState === "acked" ? "local action acknowledged" : undefined,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const fetchAssignedJobs = async () => {
    if (!user) return;
    setLoading(true);
    if (isLocalRecovery) {
      const savedProgress = loadProgress();
      const localJobs = localCrewJobs().map((job) => ({
        ...job,
        state: savedProgress[job.id]?.jobState ?? job.state,
      }));
      setJobs((current) => (current.length > 0 ? current : localJobs));
      setSelectedJobId((current) => current ?? localJobs[0]?.id ?? null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("crew_id", user.id)
        .in("state", ["scheduled", "in_progress", "blocked"])
        .order("scheduled_start", { ascending: true });

      if (error) throw error;
      const mappedJobs = (data || []).map(mapSupabaseJob);
      setJobs(mappedJobs);
      setSelectedJobId((current) => current ?? mappedJobs[0]?.id ?? null);
    } catch (error) {
      console.error("Error fetching crew jobs:", error);
      const localJobs = localCrewJobs();
      setJobs(localJobs);
      setSelectedJobId(localJobs[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthReady && user) void fetchAssignedJobs();
  }, [isAuthReady, user?.id, isLocalRecovery]);

  const ensureProgress = (jobId: string): CrewJobProgress => progress[jobId] ?? blankProgress();

  const patchProgress = (jobId: string, updater: (current: CrewJobProgress) => CrewJobProgress) => {
    setProgress((current) => ({
      ...current,
      [jobId]: updater(current[jobId] ?? blankProgress()),
    }));
  };

  const updateJobState = async (jobId: string, newState: CrewJobState) => {
    setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, state: newState } : job)));
    patchProgress(jobId, (current) => ({ ...current, jobState: newState }));
    if (newState === "en_route") {
      enqueue(jobId, "gps_ping", "Crew departed for stop; GPS ping queued for geofence replay.");
      enqueue(jobId, "customer_notice_draft", "ETA notice draft queued for dispatcher approval.");
    }
    if (newState === "arrived") {
      enqueue(jobId, "gps_ping", "Crew arrived at job site locally.");
      enqueue(jobId, "customer_notice_draft", "Arrival notice draft queued. Not sent automatically.");
    }
    if (newState === "in_progress") {
      patchProgress(jobId, (current) => ({ ...current, startedAt: current.startedAt ?? new Date().toISOString() }));
      enqueue(jobId, "job_check_in", "Crew started job locally.");
    }
    if (newState === "completed") {
      patchProgress(jobId, (current) => ({ ...current, completedAt: new Date().toISOString() }));
      enqueue(jobId, "status_transition", "Crew marked job complete locally.");
      enqueue(jobId, "customer_notice_draft", "Completion summary draft queued for dispatcher approval.");
    }

    if (!isLocalRecovery && (newState === "in_progress" || newState === "completed" || newState === "blocked")) {
      try {
        const { error } = await supabase
          .from("jobs")
          .update({
            state: newState,
            actual_start: newState === "in_progress" ? new Date().toISOString() : undefined,
            actual_end: newState === "completed" ? new Date().toISOString() : undefined,
          })
          .eq("id", jobId);
        if (error) throw error;
      } catch (error) {
        console.error("Error updating job state:", error);
        enqueue(jobId, "status_transition", "Server update failed; local action queued.", "failed");
      }
    }
  };

  const toggleChecklist = (job: CrewJob, item: ChecklistItem) => {
    patchProgress(job.id, (current) => {
      const checked = current.checkedIds.includes(item.id);
      return {
        ...current,
        checkedIds: checked ? current.checkedIds.filter((id) => id !== item.id) : [...current.checkedIds, item.id],
      };
    });
    enqueue(job.id, "checklist_update", `${item.label} ${selectedProgress.checkedIds.includes(item.id) ? "unchecked" : "checked"}.`);
  };

  const addProof = (job: CrewJob, type: ProofType) => {
    const marker: ProofMarker = {
      id: `proof-${type}-${Date.now()}`,
      type,
      note: proofNote.trim() || `${type} proof marker created locally.`,
      createdAt: new Date().toISOString(),
      status: "queued_local_marker",
    };
    patchProgress(job.id, (current) => ({ ...current, proofs: [marker, ...current.proofs] }));
    enqueue(job.id, type === "signature" ? "signature_marker" : "photo_marker", `${proofLabel(type)} marker queued. ${type === "signature" ? "Signature pad" : "Media storage"} not connected.`);
    setProofNote("");
  };

  const reportIssue = (job: CrewJob) => {
    if (!issueNote.trim()) return;
    patchProgress(job.id, (current) => ({ ...current, issueNotes: [issueNote.trim(), ...current.issueNotes] }));
    setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, state: "blocked" } : item)));
    enqueue(job.id, "exception_reported", `Issue reported: ${issueNote.trim()}`, "queued");
    setIssueNote("");
  };

  const reportQuickIssue = (job: CrewJob, label: string) => {
    patchProgress(job.id, (current) => ({ ...current, issueNotes: [label, ...current.issueNotes] }));
    setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, state: "blocked" } : item)));
    enqueue(job.id, "exception_reported", `${label}. Dispatcher review required.`, "queued");
    enqueue(job.id, "customer_notice_draft", `${label} client update draft queued. Not sent automatically.`);
    setActiveTab("sync");
  };

  const openNavigation = (job: CrewJob) => {
    enqueue(job.id, "gps_ping", `Navigation opened for stop ${job.stop}.`, "acked");
    if (typeof window !== "undefined") {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`, "_blank", "noopener,noreferrer");
    }
  };

  const copyAccess = async (job: CrewJob) => {
    const text = [job.address, job.entryCode, job.accessNotes, job.parkingNotes].filter(Boolean).join("\n");
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(text);
      enqueue(job.id, "status_transition", "Access packet copied to clipboard.", "acked");
    } catch {
      enqueue(job.id, "status_transition", "Clipboard copy failed; access packet still visible locally.", "failed");
    }
  };

  const createEtaDraft = (job: CrewJob) => {
    enqueue(job.id, "eta_draft", `ETA draft requested: ${job.eta}. Requires dispatcher approval before customer send.`);
  };

  const togglePreflight = (item: CrewPreflightItem) => {
    setPreflightCheckedIds((current) => {
      const exists = current.includes(item.id);
      return exists ? current.filter((id) => id !== item.id) : [...current, item.id];
    });
    enqueue("route", "status_transition", `${item.label} preflight ${preflightCheckedIds.includes(item.id) ? "unchecked" : "checked"}.`, "acked");
  };

  const requiredChecklistComplete = selectedJob
    ? selectedJob.checklist.filter((item) => item.required).every((item) => selectedProgress.checkedIds.includes(item.id))
    : false;
  const requiredProofComplete = selectedJob
    ? selectedJob.proofRequirements.every((type) => selectedProgress.proofs.some((proof) => proof.type === type))
    : false;
  const canComplete = selectedJob?.state === "in_progress" && requiredChecklistComplete && requiredProofComplete;
  const completedRequiredCount = selectedJob
    ? selectedJob.checklist.filter((item) => item.required && selectedProgress.checkedIds.includes(item.id)).length
    : 0;
  const requiredCount = selectedJob ? selectedJob.checklist.filter((item) => item.required).length : 0;
  const routeFreshness = syncActions.some((action) => action.retryState === "failed") ? "degraded" : "7 min old";
  const primaryAction = selectedJob ? primaryActionFor(selectedJob, selectedProgress, visibleShiftStarted, preflightComplete) : null;
  const blockedCount = jobs.filter((job) => job.riskLevel === "blocked" || job.readiness.status === "blocked").length;
  const completedCount = jobs.filter((job) => job.state === "completed").length;
  const invoiceReadyCount = jobs.filter((job) => closeoutReady(job, progress[job.id] ?? blankProgress())).length;

  const runPrimaryAction = () => {
    if (!selectedJob || !primaryAction || primaryAction.disabled) return;
    if (primaryAction.key === "preflight") {
      setActiveTab("route");
      enqueue("route", "status_transition", "Preflight required before shift start.");
      return;
    }
    if (primaryAction.key === "shift") {
      setShiftStarted(true);
      enqueue("route", "status_transition", "Shift started locally; crew preflight acknowledged.", "acked");
      return;
    }
    if (primaryAction.key === "depart") {
      void updateJobState(selectedJob.id, "en_route");
      setActiveTab("job");
      return;
    }
    if (primaryAction.key === "arrive") {
      void updateJobState(selectedJob.id, "arrived");
      setActiveTab("job");
      return;
    }
    if (primaryAction.key === "start") {
      void updateJobState(selectedJob.id, "in_progress");
      setActiveTab("checklist");
      return;
    }
    if (primaryAction.key === "checklist") {
      setActiveTab("checklist");
      return;
    }
    if (primaryAction.key === "proof") {
      setActiveTab("proof");
      return;
    }
    if (primaryAction.key === "issue") {
      setActiveTab("proof");
      return;
    }
    if (primaryAction.key === "complete") {
      void updateJobState(selectedJob.id, "completed");
      setActiveTab("sync");
    }
  };

  const resetLocalRoute = () => {
    const localJobs = localCrewJobs();
    setProgress({});
    saveProgress({});
    setJobs(localJobs);
    setSelectedJobId(localJobs[0]?.id ?? null);
    setShiftStarted(false);
    saveShiftStarted(false);
    setPreflightCheckedIds([]);
    savePreflightCheckedIds([]);
    setActiveTab("route");
    setSyncActions([
      {
        id: `sync-reset-${Date.now()}`,
        jobId: "route",
        localSequenceNumber: 1,
        payloadHash: localHash("route:reset"),
        type: "status_transition",
        label: "Local route reset for field QA.",
        retryState: "acked",
        replayResult: "local route reset",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  if (!isAuthReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 md:px-6 md:py-6">
      <div className="relative mx-auto flex h-screen min-h-0 w-full max-w-[940px] flex-col bg-[#091014] md:h-[calc(100vh-48px)] md:overflow-hidden md:rounded-[28px] md:border md:border-slate-200 md:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-[#091014]/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-primary">Astro Crew</p>
              <h1 className="text-xl font-display tracking-normal">Field Board</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`h-7 rounded-sm px-2 text-[8px] uppercase ${visibleShiftStarted ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
                {visibleShiftStarted ? "active" : "off"}
              </Badge>
              <Button variant="ghost" size="icon" onClick={logout} className="h-9 w-9 text-muted-foreground hover:bg-white/5 hover:text-white">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <StatusPill icon={visibleShiftStarted ? Wifi : WifiOff} label="Stops" value={`${completedCount}/${jobs.length}`} tone={completedCount === jobs.length && jobs.length > 0 ? "text-success" : "text-primary"} />
            <StatusPill icon={Flag} label="Blocks" value={String(blockedCount)} tone={blockedCount ? "text-destructive" : "text-success"} />
            <StatusPill icon={RefreshCcw} label={isOnline ? "Online" : "Offline"} value={isOnline ? routeFreshness : "queued"} tone={isOnline && routeFreshness !== "degraded" ? "text-success" : "text-warning"} />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-4 md:px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-[10px] font-mono uppercase tracking-widest">Syncing route</p>
            </div>
          ) : (
            <div className="space-y-3 md:grid md:grid-cols-[minmax(0,1fr)_300px] md:items-start md:gap-4 md:space-y-0">
              <section className="min-w-0 space-y-3">
                {selectedJob && primaryAction && (
                  <CommandCard
                    job={selectedJob}
                    progress={selectedProgress}
                    primaryAction={primaryAction}
                    nextPendingJob={nextPendingJob}
                    onRun={runPrimaryAction}
                    onOpenSync={() => setActiveTab("sync")}
                    onNextStop={(job) => {
                      setSelectedJobId(job.id);
                      setActiveTab("route");
                    }}
                  />
                )}

                {selectedJob && (
                  <CrewJourneyCard
                    job={selectedJob}
                    progress={selectedProgress}
                    preflightComplete={preflightComplete}
                    shiftStarted={visibleShiftStarted}
                    onOpenPreflight={() => setActiveTab("route")}
                    onOpenStop={() => setActiveTab("job")}
                    onOpenChecklist={() => setActiveTab("checklist")}
                    onOpenProof={() => setActiveTab("proof")}
                    onOpenHandoff={() => setActiveTab("sync")}
                  />
                )}

                {selectedJob && primaryAction && (
                  <AudienceLensCard
                    job={selectedJob}
                    progress={selectedProgress}
                    mode={audienceMode}
                    onModeChange={setAudienceMode}
                    primaryAction={primaryAction}
                  />
                )}

                <ShiftBriefCard
                  selectedJob={selectedJob}
                  jobs={jobs}
                  checkedIds={preflightCheckedIds}
                  preflightComplete={preflightComplete}
                  shiftStarted={visibleShiftStarted}
                  invoiceReadyCount={invoiceReadyCount}
                  onTogglePreflight={togglePreflight}
                  isOnline={isOnline}
                />

                {selectedJob && (
                  <StopHeroCard
                    job={selectedJob}
                    progress={selectedProgress}
                    completedRequiredCount={completedRequiredCount}
                    requiredCount={requiredCount}
                    requiredChecklistComplete={requiredChecklistComplete}
                    requiredProofComplete={requiredProofComplete}
                    invoiceReadyCount={invoiceReadyCount}
                    onShowRoute={() => setActiveTab("route")}
                  />
                )}

                <CrewDesktopTabs activeTab={activeTab} onChange={setActiveTab} />

                <div className="md:hidden">
                  {activeTab === "route" && (
                    <RoutePanel
                      jobs={jobs}
                      progress={progress}
                      selectedJobId={selectedJob?.id ?? null}
                      onSelect={(job) => {
                        setSelectedJobId(job.id);
                        setActiveTab("job");
                      }}
                      onDepart={(job) => void updateJobState(job.id, "en_route")}
                      onNavigate={openNavigation}
                    />
                  )}
                </div>

                {activeTab === "job" && selectedJob && (
                  <JobPanel
                    job={selectedJob}
                    progress={selectedProgress}
                    canComplete={canComplete}
                    showAccess={showAccess}
                    onToggleAccess={() => setShowAccess((current) => !current)}
                    onCopyAccess={() => void copyAccess(selectedJob)}
                    onNavigate={() => openNavigation(selectedJob)}
                    onEtaDraft={() => createEtaDraft(selectedJob)}
                    onDepart={() => void updateJobState(selectedJob.id, "en_route")}
                    onArrive={() => void updateJobState(selectedJob.id, "arrived")}
                    onStart={() => void updateJobState(selectedJob.id, "in_progress")}
                    onComplete={() => void updateJobState(selectedJob.id, "completed")}
                    onIssue={() => setActiveTab("proof")}
                  />
                )}

                {activeTab === "checklist" && selectedJob && (
                  <ChecklistPanel
                    job={selectedJob}
                    checkedIds={selectedProgress.checkedIds}
                    completedRequiredCount={completedRequiredCount}
                    requiredCount={requiredCount}
                    onToggle={(item) => toggleChecklist(selectedJob, item)}
                  />
                )}

                {activeTab === "proof" && selectedJob && (
                  <ProofPanel
                    job={selectedJob}
                    progress={selectedProgress}
                    proofNote={proofNote}
                    issueNote={issueNote}
                    onProofNoteChange={setProofNote}
                    onIssueNoteChange={setIssueNote}
                    onAddProof={(type) => addProof(selectedJob, type)}
                    onReportIssue={() => reportIssue(selectedJob)}
                    onQuickIssue={(label) => reportQuickIssue(selectedJob, label)}
                  />
                )}

                {activeTab === "sync" && (
                  <SyncPanel
                    actions={syncActions}
                    selectedJob={selectedJob}
                    selectedProgress={selectedProgress}
                    onResetLocalRoute={resetLocalRoute}
                  />
                )}
              </section>

              <aside className="hidden min-w-0 space-y-3 md:sticky md:top-3 md:block">
                <RoutePanel
                  jobs={jobs}
                  progress={progress}
                  selectedJobId={selectedJob?.id ?? null}
                  onSelect={(job) => {
                    setSelectedJobId(job.id);
                    setActiveTab("job");
                  }}
                  onDepart={(job) => void updateJobState(job.id, "en_route")}
                  onNavigate={openNavigation}
                />
                {selectedJob && <InvoiceHandoffCard job={selectedJob} progress={selectedProgress} />}
                <SyncMiniPanel actions={syncActions} onOpen={() => setActiveTab("sync")} />
              </aside>
            </div>
          )}
        </main>

        <nav className="z-50 grid h-[72px] shrink-0 grid-cols-5 border-t border-slate-200 bg-[#091014]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {[
            ["route", Route, "Route"],
            ["job", Navigation, "Job"],
            ["checklist", ClipboardCheck, "List"],
            ["proof", Camera, "Proof"],
            ["sync", RefreshCcw, "Sync"],
          ].map(([id, Icon, label]) => (
            <button
              key={id as string}
              type="button"
              onClick={() => setActiveTab(id as CrewTab)}
              className={`flex flex-col items-center justify-center gap-1 text-[9px] font-mono uppercase ${activeTab === id ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {label as string}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function CommandCard({
  job,
  progress,
  primaryAction,
  nextPendingJob,
  onRun,
  onOpenSync,
  onNextStop,
}: {
  job: CrewJob;
  progress: CrewJobProgress;
  primaryAction: { key: PrimaryActionKey; label: string; detail: string; disabled?: boolean };
  nextPendingJob: CrewJob | null;
  onRun: () => void;
  onOpenSync: () => void;
  onNextStop: (job: CrewJob) => void;
}) {
  const outcome = outcomeFor(job, progress, primaryAction);

  return (
    <section className="rounded-md border border-primary/25 bg-[linear-gradient(135deg,rgba(47,125,98,0.28),rgba(21,30,38,0.92))] p-3 shadow-[0_14px_40px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-primary">
            <Navigation className="h-3.5 w-3.5" />
            Next move
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">{primaryAction.label}</h2>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/68">{primaryAction.detail}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 rounded-sm px-2 py-1 text-[8px] uppercase ${stateTone(job.state)}`}>
          {stateLabel(job.state)}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Button data-testid="crew-primary-action" disabled={primaryAction.disabled} onClick={onRun} className="h-12 justify-center text-sm font-semibold">
          {primaryAction.label}
        </Button>
        <Button variant="outline" onClick={onOpenSync} className="h-12 w-12 border-slate-200 px-0 text-muted-foreground" title="Open sync queue">
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <OutcomeCell label="Crew now" value={outcome.crew} tone="text-primary" />
        <OutcomeCell label="Admin sees" value={outcome.admin} tone={closeoutReady(job, progress) ? "text-success" : "text-warning"} />
        <OutcomeCell label="Client gets" value={outcome.client} tone={closeoutReady(job, progress) ? "text-success" : "text-muted-foreground"} />
      </div>

      {primaryAction.key === "closed" && nextPendingJob && (
        <Button variant="secondary" onClick={() => onNextStop(nextPendingJob)} className="mt-2 h-11 w-full text-xs">
          Move to stop {nextPendingJob.stop}
        </Button>
      )}
    </section>
  );
}

function OutcomeCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-slate-200 bg-slate-100 p-2">
      <p className="text-[8px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-[11px] font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function StopHeroCard({
  job,
  progress,
  completedRequiredCount,
  requiredCount,
  requiredChecklistComplete,
  requiredProofComplete,
  invoiceReadyCount,
  onShowRoute,
}: {
  job: CrewJob;
  progress: CrewJobProgress;
  completedRequiredCount: number;
  requiredCount: number;
  requiredChecklistComplete: boolean;
  requiredProofComplete: boolean;
  invoiceReadyCount: number;
  onShowRoute: () => void;
}) {
  const proofDone = job.proofRequirements.filter((type) => progress.proofs.some((proof) => proof.type === type)).length;

  return (
    <section className="rounded-md border border-slate-200 bg-white/[0.045] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase text-muted-foreground">Stop {job.stop} · {job.scheduledWindow}</p>
          <h2 className="mt-1 truncate text-xl font-semibold tracking-normal">{job.title}</h2>
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{job.address}</span>
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onShowRoute} className="h-9 shrink-0 px-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-white">
          Route
        </Button>
      </div>

      <FieldStepRail job={job} />

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <MiniFact label="List" value={`${completedRequiredCount}/${requiredCount}`} tone={requiredChecklistComplete ? "text-success" : "text-warning"} />
        <MiniFact label="Proof" value={`${proofDone}/${job.proofRequirements.length}`} tone={requiredProofComplete ? "text-success" : "text-warning"} />
        <MiniFact label="Invoice" value={invoiceReadyCount ? `${invoiceReadyCount} ready` : "gated"} tone={closeoutReady(job, progress) ? "text-success" : "text-warning"} />
      </div>
    </section>
  );
}

function StatusPill({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-slate-100 p-2">
      <div className="flex items-center gap-1.5 text-[8px] uppercase text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`mt-1 truncate text-xs font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function ShiftBriefCard({
  selectedJob,
  jobs,
  checkedIds,
  preflightComplete,
  shiftStarted,
  invoiceReadyCount,
  isOnline,
  onTogglePreflight,
}: {
  selectedJob: CrewJob | null;
  jobs: CrewJob[];
  checkedIds: string[];
  preflightComplete: boolean;
  shiftStarted: boolean;
  invoiceReadyCount: number;
  isOnline: boolean;
  onTogglePreflight: (item: CrewPreflightItem) => void;
}) {
  const totalMinutes = jobs.reduce((total, job) => total + job.durationMinutes, 0);
  const crewLabel = selectedJob?.crew.join(" + ") || "Crew";

  return (
    <section className="rounded-md border border-slate-200 bg-white/[0.035] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-widest text-primary">Shift</p>
          <h2 className="mt-1 truncate text-base font-semibold">{crewLabel}</h2>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{selectedJob?.dispatchOwner || "Dispatch"} handles exceptions.</p>
        </div>
        <Badge variant="outline" className={`shrink-0 rounded-sm text-[8px] uppercase ${preflightComplete && shiftStarted ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
          {preflightComplete ? "ready" : "preflight"}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <MiniFact label="Stops" value={String(jobs.length)} tone="text-primary" />
        <MiniFact label="Work" value={`${totalMinutes}m`} />
        <MiniFact label="Ready" value={selectedJob?.readiness.status || "review"} tone={selectedJob ? readinessTone(selectedJob.readiness.status) : "text-muted-foreground"} />
        <MiniFact label={isOnline ? "Mode" : "Offline"} value={isOnline ? "live" : "cache"} tone={isOnline ? "text-success" : "text-warning"} />
      </div>

      {preflightComplete ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {preflightItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTogglePreflight(item)}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-success/25 bg-success/10 px-2 text-[10px] font-medium text-success"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {preflightItems.map((item) => {
            const checked = checkedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTogglePreflight(item)}
                className={`rounded-sm border p-2 text-left transition ${checked ? "border-success/30 bg-success/10" : "border-slate-200 bg-slate-100 hover:border-primary/30"}`}
              >
                <div className="flex flex-col gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${checked ? "border-success bg-success text-white" : "border-slate-300"}`}>
                    {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </span>
                  <span className="truncate text-xs font-semibold">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!preflightComplete && (
        <div className="mt-3 rounded-sm border border-warning/20 bg-warning/10 px-3 py-2 text-[11px] text-warning">
          Preflight locks route movement.
        </div>
      )}
      {preflightComplete && (
        <div className="mt-3 rounded-sm border border-success/20 bg-success/10 px-3 py-2 text-[11px] text-success">
          Ready. Invoice handoffs: {invoiceReadyCount}.
        </div>
      )}
    </section>
  );
}

function CrewDesktopTabs({ activeTab, onChange }: { activeTab: CrewTab; onChange: (tab: CrewTab) => void }) {
  const tabs: Array<[CrewTab, typeof Activity, string]> = [
    ["route", Route, "Route"],
    ["job", Navigation, "Stop"],
    ["checklist", ClipboardCheck, "Checklist"],
    ["proof", Camera, "Proof"],
    ["sync", RefreshCcw, "Sync"],
  ];

  return (
    <div className="hidden rounded-md border border-slate-200 bg-slate-100 p-1 md:grid md:grid-cols-5">
      {tabs.map(([id, Icon, label]) => (
        <button
          key={id}
          type="button"
          data-testid={`crew-desktop-tab-${id}`}
          onClick={() => onChange(id)}
          className={`flex h-11 items-center justify-center gap-2 rounded-sm text-xs font-medium transition ${activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-slate-100 hover:text-white"}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

function FieldStepRail({ job }: { job: CrewJob }) {
  const activeIndex = phaseIndexFor(job);
  const steps = ["Route", "Arrive", "Clean", "Proof", "Close"];

  return (
    <div className="mt-4 grid grid-cols-5 gap-1">
      {steps.map((step, index) => {
        const complete = index <= activeIndex;
        return (
          <div key={step} className="min-w-0">
            <div className={`h-1 rounded-full ${complete ? "bg-primary" : "bg-white/10"}`} />
            <p className={`mt-2 truncate text-center text-[9px] uppercase ${complete ? "text-primary" : "text-muted-foreground"}`}>{step}</p>
          </div>
        );
      })}
    </div>
  );
}

type JourneyStatus = "done" | "now" | "locked";

interface CrewJourneyStep {
  id: string;
  label: string;
  sublabel: string;
  actionLabel: string;
  status: JourneyStatus;
  icon: typeof Activity;
  disabledReason?: string;
  lockLabel?: string;
  onClick: () => void;
}

function journeyTone(status: JourneyStatus) {
  if (status === "done") return "border-success/25 bg-success/10 text-success";
  if (status === "now") return "border-primary/40 bg-primary/15 text-primary";
  return "border-slate-200 bg-slate-100 text-muted-foreground";
}

function CrewJourneyCard({
  job,
  progress,
  preflightComplete,
  shiftStarted,
  onOpenPreflight,
  onOpenStop,
  onOpenChecklist,
  onOpenProof,
  onOpenHandoff,
}: {
  job: CrewJob;
  progress: CrewJobProgress;
  preflightComplete: boolean;
  shiftStarted: boolean;
  onOpenPreflight: () => void;
  onOpenStop: () => void;
  onOpenChecklist: () => void;
  onOpenProof: () => void;
  onOpenHandoff: () => void;
}) {
  const requiredChecklistComplete = job.checklist.filter((item) => item.required).every((item) => progress.checkedIds.includes(item.id));
  const requiredProofComplete = job.proofRequirements.every((type) => progress.proofs.some((proof) => proof.type === type));
  const travelStarted = ["en_route", "arrived", "in_progress", "completed"].includes(job.state);
  const siteOpen = ["arrived", "in_progress", "completed"].includes(job.state);
  const serviceStarted = ["in_progress", "completed"].includes(job.state);
  const invoiceReady = closeoutReady(job, progress);
  const blocked = job.readiness.status === "blocked" || job.state === "blocked";
  const canDrive = preflightComplete && shiftStarted && !blocked;

  const steps: CrewJourneyStep[] = [
    {
      id: "preflight",
      label: "Ready",
      sublabel: preflightComplete ? "Crew cleared" : "Check route kit",
      actionLabel: "Checks",
      status: preflightComplete ? "done" : "now",
      icon: ClipboardCheck,
      onClick: onOpenPreflight,
    },
    {
      id: "drive",
      label: "Drive",
      sublabel: travelStarted ? "Route active" : shiftStarted ? "Open stop" : "Start route",
      actionLabel: "Stop",
      status: travelStarted ? "done" : canDrive ? "now" : "locked",
      icon: Navigation,
      disabledReason: blocked ? job.readiness.label : preflightComplete ? "Start the route first." : "Finish preflight first.",
      lockLabel: blocked ? "Blocked" : preflightComplete ? "Start route" : "Preflight",
      onClick: onOpenStop,
    },
    {
      id: "service",
      label: "Service",
      sublabel: requiredChecklistComplete ? "List complete" : `${job.checklist.filter((item) => item.required && !progress.checkedIds.includes(item.id)).length} checks left`,
      actionLabel: "List",
      status: requiredChecklistComplete ? "done" : serviceStarted ? "now" : "locked",
      icon: Home,
      disabledReason: siteOpen ? "Start the clean before checklist closeout." : "Arrive before opening service.",
      lockLabel: siteOpen ? "Start clean" : "Arrive first",
      onClick: onOpenChecklist,
    },
    {
      id: "proof",
      label: "Proof",
      sublabel: requiredProofComplete ? "Proof attached" : `${job.proofRequirements.filter((type) => !progress.proofs.some((proof) => proof.type === type)).length} markers left`,
      actionLabel: "Proof",
      status: requiredProofComplete ? "done" : requiredChecklistComplete ? "now" : "locked",
      icon: Camera,
      disabledReason: "Complete required service checks before proof closeout.",
      lockLabel: "List first",
      onClick: onOpenProof,
    },
    {
      id: "handoff",
      label: "Bill",
      sublabel: invoiceReady ? "Admin can review" : "Gated",
      actionLabel: "Sync",
      status: invoiceReady ? "done" : requiredProofComplete ? "now" : "locked",
      icon: SendHorizontal,
      disabledReason: "Checklist and proof must be complete before invoice handoff.",
      lockLabel: requiredChecklistComplete ? "Proof first" : "Closeout",
      onClick: onOpenHandoff,
    },
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-widest text-primary">End-to-end</p>
          <h2 className="mt-1 truncate text-sm font-semibold">Crew journey</h2>
        </div>
        <Badge variant="outline" className={`shrink-0 rounded-sm text-[8px] uppercase ${invoiceReady ? "border-success/30 text-success" : "border-warning/30 text-warning"}`}>
          {invoiceReady ? "invoice ready" : "field gated"}
        </Badge>
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-5">
        {steps.map((step, index) => (
          <JourneyStepButton key={step.id} step={step} index={index} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 rounded-sm border border-slate-200 bg-slate-100 p-2 text-center text-[10px] text-muted-foreground">
        <span className="truncate text-slate-700">Crew closeout</span>
        <SendHorizontal className="h-3 w-3 text-primary" />
        <span className="truncate text-slate-700">Admin review</span>
        <SendHorizontal className="h-3 w-3 text-primary" />
        <span className="truncate text-slate-700">Client invoice</span>
      </div>
    </section>
  );
}

function JourneyStepButton({ step, index }: { step: CrewJourneyStep; index: number }) {
  const Icon = step.icon;
  const disabled = step.status === "locked";

  return (
    <button
      type="button"
      data-testid={`crew-journey-${step.id}`}
      disabled={disabled}
      title={disabled ? step.disabledReason : undefined}
      onClick={step.onClick}
      className={`min-h-[78px] rounded-sm border p-2 text-left transition ${journeyTone(step.status)} ${disabled ? "cursor-not-allowed opacity-70" : "hover:border-primary/45 hover:bg-primary/10"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-current/30 text-[10px] font-semibold">{index + 1}</span>
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </div>
      <p className="mt-2 truncate text-xs font-semibold text-white">{step.label}</p>
      <p className="mt-0.5 truncate text-[10px]">{step.sublabel}</p>
      <p className="mt-2 text-[9px] font-mono uppercase tracking-wider">{step.status === "done" ? "Done" : step.status === "now" ? step.actionLabel : step.lockLabel || "Locked"}</p>
    </button>
  );
}

function audienceLensFor(
  mode: AudienceMode,
  job: CrewJob,
  progress: CrewJobProgress,
  primaryAction: { key: PrimaryActionKey; label: string; detail: string; disabled?: boolean },
) {
  const requiredDone = job.checklist.filter((item) => item.required && progress.checkedIds.includes(item.id)).length;
  const requiredTotal = job.checklist.filter((item) => item.required).length;
  const proofDone = job.proofRequirements.filter((type) => progress.proofs.some((proof) => proof.type === type)).length;
  const ready = closeoutReady(job, progress);
  const blocked = job.readiness.status === "blocked" || job.state === "blocked";

  if (mode === "admin") {
    return {
      eyebrow: "Admin view",
      title: ready ? "Invoice candidate ready" : "Invoice candidate locked",
      now: ready ? "Review proof and service notes." : `Waiting on ${requiredTotal - requiredDone} checks and ${job.proofRequirements.length - proofDone} proof markers.`,
      next: ready ? "Create invoice draft from the completed job." : blocked ? job.readiness.label : "Let the crew finish closeout before billing.",
      trust: "Payment and sent states stay locked until admin issues the invoice.",
      tone: ready ? "text-success" : "text-warning",
    };
  }

  if (mode === "client") {
    return {
      eyebrow: "Client view",
      title: ready ? "Service can move to invoice review" : "Service is still in field closeout",
      now: ready ? "Client can receive completion and invoice after review." : "Client should not see an invoice yet.",
      next: ready ? "Admin approves the invoice before any payment link exists." : "Only ETA/completion drafts should be prepared for approval.",
      trust: "No fake payment link, no fake paid state, no automatic human message.",
      tone: ready ? "text-success" : "text-muted-foreground",
    };
  }

  return {
    eyebrow: "Crew view",
    title: primaryAction.label,
    now: primaryAction.detail,
    next: ready ? "Complete the stop and hand it to admin invoice review." : invoiceGateLabel(job, progress),
    trust: blocked ? job.readiness.label : job.closeoutPolicy,
    tone: blocked ? "text-destructive" : "text-primary",
  };
}

function AudienceLensCard({
  job,
  progress,
  mode,
  primaryAction,
  onModeChange,
}: {
  job: CrewJob;
  progress: CrewJobProgress;
  mode: AudienceMode;
  primaryAction: { key: PrimaryActionKey; label: string; detail: string; disabled?: boolean };
  onModeChange: (mode: AudienceMode) => void;
}) {
  const lens = audienceLensFor(mode, job, progress, primaryAction);
  const modes: Array<[AudienceMode, string]> = [
    ["crew", "Crew"],
    ["admin", "Admin"],
    ["client", "Client"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-widest text-primary">End-user lens</p>
          <h2 className="mt-1 truncate text-sm font-semibold">What this means</h2>
        </div>
        <div className="grid grid-cols-3 rounded-sm border border-slate-200 bg-slate-100 p-0.5">
          {modes.map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-testid={`crew-audience-${id}`}
              onClick={() => onModeChange(id)}
              className={`h-8 rounded-[3px] px-2 text-[10px] font-medium transition ${mode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-slate-100 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-sm border border-slate-200 bg-slate-100 p-3">
        <p className="text-[8px] uppercase text-muted-foreground">{lens.eyebrow}</p>
        <p className={`mt-1 text-sm font-semibold ${lens.tone}`}>{lens.title}</p>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
          <LensFact label="Now" value={lens.now} />
          <LensFact label="Next" value={lens.next} />
          <LensFact label="Trust rule" value={lens.trust} />
        </div>
      </div>
    </section>
  );
}

function LensFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-slate-200 bg-slate-50 p-2">
      <p className="text-[8px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-white/82">{value}</p>
    </div>
  );
}

function RoutePanel({
  jobs,
  progress,
  selectedJobId,
  onSelect,
  onDepart,
  onNavigate,
}: {
  jobs: CrewJob[];
  progress: Record<string, CrewJobProgress>;
  selectedJobId: string | null;
  onSelect: (job: CrewJob) => void;
  onDepart: (job: CrewJob) => void;
  onNavigate: (job: CrewJob) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-100 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TimerReset className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Route</p>
          </div>
          <p className="text-[10px] uppercase text-muted-foreground">{jobs.length} stops</p>
        </div>
        <div className="mt-3 grid gap-1.5">
          {jobs.map((job) => (
            <article
              key={job.id}
              className={`rounded-sm border p-3 ${selectedJobId === job.id ? "border-primary/40 bg-primary/10" : "border-slate-200 bg-white/[0.035]"}`}
            >
              <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => onSelect(job)}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold ${job.state === "completed" ? "border-success bg-success text-white" : selectedJobId === job.id ? "border-primary text-primary" : "border-white/15 text-muted-foreground"}`}>
                  {job.stop}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{job.title}</p>
                    <Badge variant="outline" className={`shrink-0 text-[8px] uppercase ${stateTone(job.state)}`}>{stateLabel(job.state)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-[10px] uppercase text-muted-foreground">{job.scheduledWindow} · {nextActionFor(job, progress[job.id] ?? blankProgress())}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{job.address}</p>
                </div>
              </button>

              {selectedJobId === job.id && (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <MiniFact label="ETA" value={job.eta} tone={confidenceTone(job.etaConfidence)} />
                    <MiniFact label="Miles" value={`${job.routeMiles}`} />
                    <MiniFact label="Risk" value={job.riskLevel} tone={riskTone(job.riskLevel)} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => onSelect(job)} className="h-9 border-slate-200 text-xs">
                      Details
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onNavigate(job)} className="h-9 border-slate-200 text-xs">
                      <Navigation className="mr-2 h-3.5 w-3.5" />
                      Maps
                    </Button>
                    <Button
                      size="sm"
                      disabled={job.readiness.status === "blocked" || job.state !== "scheduled"}
                      title={job.readiness.status === "blocked" ? job.readiness.label : undefined}
                      onClick={() => onDepart(job)}
                      className="col-span-2 h-9 text-xs"
                    >
                      <Play className="mr-2 h-3.5 w-3.5" />
                      Depart
                    </Button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function InvoiceHandoffCard({ job, progress }: { job: CrewJob; progress: CrewJobProgress }) {
  const requiredDone = job.checklist.filter((item) => item.required && progress.checkedIds.includes(item.id)).length;
  const requiredTotal = job.checklist.filter((item) => item.required).length;
  const proofDone = job.proofRequirements.filter((type) => progress.proofs.some((proof) => proof.type === type)).length;
  const ready = closeoutReady(job, progress);

  return (
    <section className={`rounded-md border p-3 ${ready ? "border-success/25 bg-success/10" : "border-warning/25 bg-warning/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Commercial handoff</p>
          <h2 className="mt-1 text-base font-semibold">Invoice readiness</h2>
        </div>
        <Badge variant="outline" className={`rounded-sm text-[8px] uppercase ${ready ? "border-success/30 text-success" : "border-warning/30 text-warning"}`}>
          {ready ? "ready" : "blocked"}
        </Badge>
      </div>

      <p className={`mt-3 text-xs leading-relaxed ${ready ? "text-success" : "text-warning"}`}>
        {ready ? "Admin can review the invoice handoff for this job." : "Field closeout is still gating the invoice."}
      </p>

      <HandoffChain ready={ready} />

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <MiniFact label="Checklist" value={`${requiredDone}/${requiredTotal}`} tone={requiredDone === requiredTotal ? "text-success" : "text-warning"} />
        <MiniFact label="Proof" value={`${proofDone}/${job.proofRequirements.length}`} tone={proofDone === job.proofRequirements.length ? "text-success" : "text-warning"} />
      </div>

      <div className="mt-3 rounded-sm border border-slate-200 bg-slate-100 p-2">
        <p className="text-[8px] uppercase text-muted-foreground">Billing link</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">{job.billingLink}</p>
      </div>
    </section>
  );
}

function HandoffChain({ ready }: { ready: boolean }) {
  const items = [
    ["Crew", ready ? "closed" : "working"],
    ["Admin", ready ? "review" : "waiting"],
    ["Client", ready ? "invoice next" : "not ready"],
  ];

  return (
    <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 rounded-sm border border-slate-200 bg-slate-100 p-2 text-center">
      {items.map(([label, detail], index) => (
        <Fragment key={label}>
          <div className="min-w-0">
            <p className={`truncate text-[10px] font-semibold ${index === 0 || ready ? "text-white" : "text-muted-foreground"}`}>{label}</p>
            <p className={`mt-0.5 truncate text-[8px] uppercase ${ready ? "text-success" : "text-warning"}`}>{detail}</p>
          </div>
          {index < items.length - 1 && <SendHorizontal className={`h-3 w-3 ${ready ? "text-success" : "text-warning"}`} />}
        </Fragment>
      ))}
    </div>
  );
}

function JobPanel({
  job,
  progress,
  canComplete,
  showAccess,
  onToggleAccess,
  onCopyAccess,
  onNavigate,
  onEtaDraft,
  onDepart,
  onArrive,
  onStart,
  onComplete,
  onIssue,
}: {
  job: CrewJob;
  progress: CrewJobProgress;
  canComplete: boolean;
  showAccess: boolean;
  onToggleAccess: () => void;
  onCopyAccess: () => void;
  onNavigate: () => void;
  onEtaDraft: () => void;
  onDepart: () => void;
  onArrive: () => void;
  onStart: () => void;
  onComplete: () => void;
  onIssue: () => void;
}) {
  const requiredDone = job.checklist.filter((item) => item.required && progress.checkedIds.includes(item.id)).length;
  const requiredTotal = job.checklist.filter((item) => item.required).length;
  const proofDone = job.proofRequirements.filter((type) => progress.proofs.some((proof) => proof.type === type)).length;
  const invoiceReady = closeoutReady(job, progress);

  return (
    <section className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-white/[0.035] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase text-muted-foreground">{job.customer}</p>
            <h2 className="mt-1 text-base font-semibold">Stop controls</h2>
          </div>
          <Badge variant="outline" className={`rounded-sm text-[8px] uppercase ${stateTone(job.state)}`}>
            {stateLabel(job.state)}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <FieldSignal label="Site" value={job.serviceFacts[0] || "Property"} tone="text-primary" />
          <FieldSignal label="Geo" value={geofenceLabel(job.geofenceStatus)} tone={geofenceTone(job.geofenceStatus)} />
          <FieldSignal label="Notice" value="draft only" tone="text-warning" />
          <FieldSignal label="Invoice" value={invoiceReady ? "ready" : "gated"} tone={invoiceReady ? "text-success" : "text-warning"} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <WorkOrderRow label="Claim" value={job.workClaimId} />
          <WorkOrderRow label="Booking" value={job.bookingId} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <QuickButton icon={Navigation} label="Maps" onClick={onNavigate} />
        <QuickButton icon={SendHorizontal} label="ETA draft" onClick={onEtaDraft} />
        <QuickButton icon={Copy} label="Access" onClick={onCopyAccess} />
      </div>

      <div className="rounded-md border border-slate-200 bg-white/[0.035] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Access packet</p>
            </div>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{showAccess ? job.accessNotes : "Hidden until the crew intentionally reveals it."}</p>
            {showAccess && (
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                <p><span className="text-white">Entry:</span> {job.entryCode || "Not provided"}</p>
                <p><span className="text-white">Parking:</span> {job.parkingNotes}</p>
                <p><span className="text-white">Address:</span> {job.address}</p>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onToggleAccess} className="h-9 w-9 shrink-0 text-muted-foreground">
            {showAccess ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={`rounded-md border p-3 ${invoiceReady ? "border-success/20 bg-success/10" : "border-warning/20 bg-warning/10"}`}>
        <div className="flex gap-3">
          <ClipboardCheck className={`mt-0.5 h-4 w-4 shrink-0 ${invoiceReady ? "text-success" : "text-warning"}`} />
          <div>
            <p className="text-sm font-medium">Invoice closeout gate</p>
            <p className={`mt-1 text-xs leading-relaxed ${invoiceReady ? "text-success" : "text-warning"}`}>{invoiceGateLabel(job, progress)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white/[0.035] p-3">
        <p className="text-[9px] uppercase text-muted-foreground">Field notes</p>
        <div className="mt-2 divide-y divide-white/10">
          <NoteRow icon={MessageSquare} label="Client updates" value={job.customerNoticePolicy} />
          <NoteRow icon={Flag} label="Scope" value={job.preferences.join(" · ")} />
          <NoteRow icon={Shield} label="Safety" value={job.safetyNotes.join(" · ")} />
          <NoteRow icon={PackageCheck} label="Supplies" value={job.supplies.join(" · ")} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <MiniFact label="List" value={`${requiredDone}/${requiredTotal}`} />
        <MiniFact label="Proof" value={`${proofDone}/${job.proofRequirements.length}`} />
        <MiniFact label="Ready" value={job.readiness.status} tone={readinessTone(job.readiness.status)} />
      </div>

      <div className="grid gap-2">
        <Button disabled={job.readiness.status === "blocked" || job.state !== "scheduled"} onClick={onDepart} className="h-12 text-xs">
          <Play className="mr-2 h-4 w-4" />
          Depart for stop
        </Button>
        <Button disabled={job.state !== "en_route"} onClick={onArrive} className="h-12 text-xs">
          <MapPin className="mr-2 h-4 w-4" />
          Mark arrived
        </Button>
        <Button disabled={job.readiness.status === "blocked" || job.state !== "arrived"} onClick={onStart} className="h-12 text-xs">
          <Home className="mr-2 h-4 w-4" />
          Start clean
        </Button>
        <Button disabled={!canComplete} onClick={onComplete} className="h-12 bg-success text-white hover:bg-success/90 text-xs" title={!canComplete ? "Checklist and required proof markers must be complete first." : undefined}>
          <SquareCheck className="mr-2 h-4 w-4" />
          Complete job
        </Button>
        <Button variant="outline" onClick={onIssue} className="h-12 border-destructive/20 bg-destructive/5 text-xs text-destructive">
          <AlertCircle className="mr-2 h-4 w-4" />
          Report issue
        </Button>
      </div>

      <InfoCard icon={Flag} title="Closeout rule" detail={job.invoiceReadiness} />
    </section>
  );
}

function ChecklistPanel({
  job,
  checkedIds,
  completedRequiredCount,
  requiredCount,
  onToggle,
}: {
  job: CrewJob;
  checkedIds: string[];
  completedRequiredCount: number;
  requiredCount: number;
  onToggle: (item: ChecklistItem) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] uppercase text-muted-foreground">Required checklist</p>
        <p className="mt-1 text-lg font-semibold">{completedRequiredCount} / {requiredCount} complete</p>
      </div>
      {(["arrival", "service", "closeout"] as ChecklistGroup[]).map((group) => (
        <div key={group} className="space-y-2">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{groupLabel(group)}</h2>
          {job.checklist.filter((item) => item.group === group).map((item) => {
            const checked = checkedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item)}
                className={`flex w-full items-start gap-3 rounded-sm border p-3 text-left ${checked ? "border-success/30 bg-success/10" : "border-slate-200 bg-slate-50"}`}
              >
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${checked ? "border-success bg-success text-white" : "border-slate-300"}`}>
                  {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">{item.required ? "Required" : "Optional QA note"}</p>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function ProofPanel({
  job,
  progress,
  proofNote,
  issueNote,
  onProofNoteChange,
  onIssueNoteChange,
  onAddProof,
  onReportIssue,
  onQuickIssue,
}: {
  job: CrewJob;
  progress: CrewJobProgress;
  proofNote: string;
  issueNote: string;
  onProofNoteChange: (value: string) => void;
  onIssueNoteChange: (value: string) => void;
  onAddProof: (type: ProofType) => void;
  onReportIssue: () => void;
  onQuickIssue: (label: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-sm border border-warning/20 bg-warning/10 p-3">
        <div className="flex gap-2">
          <UploadCloud className="mt-0.5 h-4 w-4 text-warning" />
          <p className="text-xs text-warning">Media storage is not connected. Proof actions create local queued markers only.</p>
        </div>
      </div>

      <textarea
        value={proofNote}
        onChange={(event) => onProofNoteChange(event.target.value)}
        placeholder="Proof note, room note, or issue context"
        className="min-h-20 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm outline-none"
      />

      <div className="grid gap-2">
        {job.proofRequirements.map((type) => {
          const exists = progress.proofs.some((proof) => proof.type === type);
          return (
            <Button key={type} variant={exists ? "secondary" : "outline"} onClick={() => onAddProof(type)} className="h-11 justify-start border-slate-200 text-xs">
              <Camera className="mr-2 h-4 w-4" />
              {exists ? `${proofLabel(type)} added` : `Add ${proofLabel(type)}`}
            </Button>
          );
        })}
      </div>

      <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] uppercase text-muted-foreground">Proof history</p>
        <div className="mt-2 grid gap-2">
          {progress.proofs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proof markers yet.</p>
          ) : (
            progress.proofs.map((proof) => (
              <div key={proof.id} className="rounded-sm border border-slate-200 bg-slate-100 p-2">
                <p className="text-sm font-medium">{proofLabel(proof.type)}</p>
                <p className="text-xs text-muted-foreground">{proof.note}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-sm border border-destructive/20 bg-destructive/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <FileWarning className="h-4 w-4" />
          <p className="text-sm font-medium">Issue / escalation</p>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickIssueOptions.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => onQuickIssue(label)}
              className="rounded-sm border border-destructive/20 bg-slate-100 px-3 py-3 text-left text-xs font-medium text-destructive transition hover:bg-destructive/10"
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={issueNote}
          onChange={(event) => onIssueNoteChange(event.target.value)}
          placeholder="What is blocked, damaged, missing, unsafe, or unclear?"
          className="min-h-20 w-full rounded-md border border-destructive/20 bg-slate-100 px-3 py-2 text-sm outline-none"
        />
        <Button disabled={!issueNote.trim()} onClick={onReportIssue} className="mt-2 h-10 w-full bg-destructive text-xs hover:bg-destructive/90">
          <MessageSquare className="mr-2 h-4 w-4" />
          Queue issue for dispatcher
        </Button>
      </div>
    </section>
  );
}

function SyncPanel({
  actions,
  selectedJob,
  selectedProgress,
  onResetLocalRoute,
}: {
  actions: SyncAction[];
  selectedJob: CrewJob | null;
  selectedProgress: CrewJobProgress;
  onResetLocalRoute: () => void;
}) {
  const queued = actions.filter((action) => action.retryState === "queued").length;
  const failed = actions.filter((action) => action.retryState === "failed").length;
  const acked = actions.filter((action) => action.retryState === "acked").length;

  return (
    <section className="space-y-3">
      {selectedJob && <AdminHandoffPreview job={selectedJob} progress={selectedProgress} />}
      <div className="grid grid-cols-3 gap-2">
        <MiniFact label="Queued" value={String(queued)} tone="text-warning" />
        <MiniFact label="Failed" value={String(failed)} tone={failed ? "text-destructive" : "text-muted-foreground"} />
        <MiniFact label="Acked" value={String(acked)} tone="text-success" />
      </div>
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Sync center</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Local actions stay visible so offline work never looks magically complete before replay.
            </p>
          </div>
          <Button variant="outline" onClick={onResetLocalRoute} className="h-9 border-slate-200 text-xs">
            Reset local route
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        {actions.map((action) => (
          <div key={action.id} className="rounded-sm border border-slate-200 bg-slate-100 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="mt-1 text-[10px] uppercase text-muted-foreground">{action.type} · {formatShortTime(action.createdAt)}</p>
              </div>
              <Badge variant="outline" className={`text-[8px] uppercase ${action.retryState === "failed" ? "text-destructive" : action.retryState === "acked" ? "text-success" : "text-warning"}`}>
                {action.retryState}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminHandoffPreview({ job, progress }: { job: CrewJob; progress: CrewJobProgress }) {
  const requiredDone = job.checklist.filter((item) => item.required && progress.checkedIds.includes(item.id)).length;
  const requiredTotal = job.checklist.filter((item) => item.required).length;
  const proofDone = job.proofRequirements.filter((type) => progress.proofs.some((proof) => proof.type === type)).length;
  const ready = closeoutReady(job, progress);
  const blockers = [
    requiredDone < requiredTotal ? `${requiredTotal - requiredDone} checklist item${requiredTotal - requiredDone === 1 ? "" : "s"}` : null,
    proofDone < job.proofRequirements.length ? `${job.proofRequirements.length - proofDone} proof marker${job.proofRequirements.length - proofDone === 1 ? "" : "s"}` : null,
    job.readiness.status === "blocked" ? "dispatch blocker" : null,
  ].filter(Boolean);

  return (
    <section data-testid="crew-admin-handoff-preview" className={`rounded-md border p-3 ${ready ? "border-success/25 bg-success/10" : "border-warning/25 bg-warning/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Admin handoff</p>
          <h2 className="mt-1 truncate text-base font-semibold">Invoice candidate</h2>
        </div>
        <Badge variant="outline" className={`shrink-0 rounded-sm text-[8px] uppercase ${ready ? "border-success/30 text-success" : "border-warning/30 text-warning"}`}>
          {ready ? "review ready" : "locked"}
        </Badge>
      </div>

      <HandoffChain ready={ready} />

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <MiniFact label="Checklist" value={`${requiredDone}/${requiredTotal}`} tone={requiredDone === requiredTotal ? "text-success" : "text-warning"} />
        <MiniFact label="Proof" value={`${proofDone}/${job.proofRequirements.length}`} tone={proofDone === job.proofRequirements.length ? "text-success" : "text-warning"} />
      </div>

      <div className="mt-3 rounded-sm border border-slate-200 bg-slate-100 p-3">
        <p className={`text-xs font-medium ${ready ? "text-success" : "text-warning"}`}>
          {ready ? "Admin can turn this closeout into an invoice review item." : `Before admin billing: ${blockers.join(", ")} left.`}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Client-facing payment state stays locked until admin reviews the service proof and issues the invoice.
        </p>
      </div>

      <Button disabled className="mt-3 h-10 w-full text-xs" title={ready ? "Admin invoice creation is handled from the admin invoice workspace." : "Finish field gates before this becomes an admin invoice candidate."}>
        {ready ? "Ready in admin invoice queue" : "Invoice queue locked"}
      </Button>
    </section>
  );
}

function SyncMiniPanel({ actions, onOpen }: { actions: SyncAction[]; onOpen: () => void }) {
  const queued = actions.filter((action) => action.retryState === "queued").length;
  const failed = actions.filter((action) => action.retryState === "failed").length;
  const latest = actions[0];

  return (
    <section className="rounded-md border border-slate-200 bg-white/[0.035] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Offline ledger</p>
          <h2 className="mt-1 text-base font-semibold">Sync queue</h2>
        </div>
        <Button variant="outline" onClick={onOpen} className="h-8 border-slate-200 px-2 text-xs">
          Open
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <MiniFact label="Queued" value={String(queued)} tone={queued ? "text-warning" : "text-muted-foreground"} />
        <MiniFact label="Failed" value={String(failed)} tone={failed ? "text-destructive" : "text-muted-foreground"} />
      </div>

      {latest && (
        <div className="mt-3 rounded-sm border border-slate-200 bg-slate-100 p-2">
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-700">{latest.label}</p>
          <p className="mt-1 text-[9px] uppercase text-muted-foreground">{latest.retryState} · {formatShortTime(latest.createdAt)}</p>
        </div>
      )}
    </section>
  );
}

function WorkOrderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-slate-200 bg-slate-100 p-2">
      <p className="text-[8px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs font-medium leading-snug text-white">{value}</p>
    </div>
  );
}

function FieldSignal({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-slate-200 bg-slate-100 p-2">
      <p className="text-[8px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-xs font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function QuickButton({ icon: Icon, label, onClick }: { icon: typeof Activity; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-14 flex-col items-center justify-center gap-1 rounded-sm border border-slate-200 bg-white/[0.035] text-[10px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-white">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function NoteRow({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="flex gap-2 py-2 first:pt-0 last:pb-0">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-white">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, detail }: { icon: typeof Activity; title: string; detail: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white/[0.035] p-3">
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function MiniFact({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-slate-200 bg-slate-100 p-2">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-xs font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
