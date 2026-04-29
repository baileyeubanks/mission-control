import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, Database, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { decideMissionControlApproval, getMissionControlApprovals } from "@/lib/mission-control-client";
import type { ApprovalRequest } from "@/lib/mission-control";

function approvalAgeLabel(request: ApprovalRequest): string {
  const firstTrail = request.auditTrail[0] || "Local recovery";
  return firstTrail.length > 26 ? `${firstTrail.slice(0, 25)}...` : firstTrail;
}

function approvalTone(status: ApprovalRequest["status"]) {
  if (status === "approved") return "bg-success/10 border-success/20 text-success";
  if (status === "rejected") return "bg-destructive/10 border-destructive/20 text-destructive";
  if (status === "requested") return "bg-warning/10 border-warning/20 text-warning";
  return "bg-white/5 border-white/10 text-muted-foreground";
}

export function Approvals() {
  const { isAuthReady, user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDecision, setActiveDecision] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMissionControlApprovals();
      setRequests(data);
    } catch (loadError) {
      console.error("Error fetching Mission Control approvals:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) return;
    void fetchApprovals();
  }, [isAuthReady, user]);

  const decideApproval = async (id: string, decision: "approved" | "rejected") => {
    setActiveDecision(`${id}:${decision}`);
    setError(null);
    try {
      const updated = await decideMissionControlApproval(id, decision);
      setRequests((current) => current.map((request) => (request.id === id ? updated : request)));
    } catch (decisionError) {
      console.error("Approval decision failed:", decisionError);
      setError(decisionError instanceof Error ? decisionError.message : "Approval decision failed.");
    } finally {
      setActiveDecision(null);
    }
  };

  const pendingCount = requests.filter((request) => request.status === "requested").length;

  return (
    <div className="flex flex-col gap-6 h-full">
      <section className="glass-panel p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display tracking-[0.06em]">Approvals & Governance</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase mt-1">
            <Database className="h-3 w-3 text-success" />
            Authority: Recovery_Governance
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning/10 border border-warning/20 text-warning text-[10px] font-mono uppercase w-fit">
          <ShieldAlert className="h-3 w-3" />
          {pendingCount} Pending_Actions
        </div>
      </section>

      {error && (
        <div className="rounded-sm border border-destructive/20 bg-destructive/10 px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">Initialising_Approval_Stream...</div>
        ) : requests.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">Queue_Clear: No_Pending_Approvals</div>
        ) : requests.map((req) => (
          <Card key={req.id} className="flex flex-col glass border-white/5 group hover:border-white/10 transition-colors">
            <CardHeader className="pb-3 border-b border-white/5 bg-black/20">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-tighter bg-black/40 border-white/10">{req.id}</Badge>
                <span className="text-[10px] font-mono text-muted-foreground uppercase flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> 
                  {approvalAgeLabel(req)}
                </span>
              </div>
              <CardTitle className="text-sm font-display tracking-tight uppercase">{req.subject}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-2 text-[11px] font-mono uppercase">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Module:</span>
                  <span className="font-bold">{req.moduleId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={`text-[9px] uppercase ${approvalTone(req.status)}`}>{req.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origin_Operator:</span>
                  <span>{req.requester}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approver:</span>
                  <span>{req.approver}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-9 font-mono text-[10px] uppercase border-white/10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Reject ${req.subject}`}
                  onClick={() => void decideApproval(req.id, "rejected")}
                  disabled={req.status !== "requested" || Boolean(activeDecision)}
                  title={req.status !== "requested" ? "Approval already decided." : "Reject this local recovery approval and log an event."}
                >
                  {activeDecision === `${req.id}:rejected` ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <X className="h-3.5 w-3.5 mr-2" />}
                  Reject
                </Button>
                <Button
                  className="flex-1 h-9 font-mono text-[10px] uppercase bg-success/20 text-success border border-success/30 hover:bg-success/30"
                  aria-label={`Approve ${req.subject}`}
                  onClick={() => void decideApproval(req.id, "approved")}
                  disabled={req.status !== "requested" || Boolean(activeDecision)}
                  title={req.status !== "requested" ? "Approval already decided." : "Approve this local recovery approval and log an event."}
                >
                  {activeDecision === `${req.id}:approved` ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-2" />}
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
