import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, ShieldCheck, Database, Lock, UserCheck, Download } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface AuditLog {
  id: string;
  action: string;
  actor_name: string;
  resource: string;
  created_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function Security() {
  const { isAuthReady, user, role } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !user) return;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    async function fetchLogs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [isAuthReady, user]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Security & Governance</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Database className="h-3 w-3 text-success" />
            Authority: Supabase_Truth
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-warning/10 border border-warning/20 text-warning text-[10px] font-mono uppercase">
          <ShieldCheck className="h-3 w-3" />
          Audit_Log_Read_Only
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Active_Session</CardTitle>
            <Lock className="h-3.5 w-3.5 text-primary/50" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-mono font-bold truncate">{user?.email}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">
              {user?.email?.endsWith(".local") || !isSupabaseConfigured ? "Local_Recovery_Mode" : "Authenticated_Via_Google"}
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Authority_Level</CardTitle>
            <UserCheck className="h-3.5 w-3.5 text-success/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-success uppercase">{role || 'GUEST'}</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">
              Permission_Scope: {role === 'owner' ? 'FULL_MISSION_CONTROL' : 'OPERATOR_ACCESS'}
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Runtime_Security</CardTitle>
            <Shield className="h-3.5 w-3.5 text-primary/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold">LOCAL</div>
            <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">TLS depends on deployment edge</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden glass border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
          <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest">System_Audit_Logs</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-7 font-mono text-[9px] uppercase border-slate-200"
            onClick={() => {
              const payload = JSON.stringify({
                data_source: "security_audit_logs",
                generated_at: new Date().toISOString(),
                logs,
              }, null, 2);
              const blob = new Blob([payload], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `security-audit-${new Date().toISOString().slice(0, 10)}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            disabled={logs.length === 0}
            title={logs.length === 0 ? "No audit logs to export." : "Export audit logs as JSON."}
          >
            <Download className="mr-1.5 h-3 w-3" />
            Export
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-white sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="hidden md:table-cell w-[160px] md:w-[180px] font-mono text-[10px] uppercase tracking-widest">Timestamp</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Action</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Actor</TableHead>
                <TableHead className="hidden sm:table-cell font-mono text-[10px] uppercase tracking-widest">Resource</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest">Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">Initialising_Audit_Stream...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">No_Audit_Records_Found</TableCell>
                </TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id} className="group hover:bg-white/5 border-slate-200 transition-colors">
                  <TableCell className="hidden md:table-cell font-mono text-[10px] text-muted-foreground/60">
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.created_at))}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] uppercase tracking-wider">{log.action}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">{log.actor_name}</TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-[10px] text-muted-foreground uppercase">{log.resource}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={`text-[8px] uppercase tracking-tighter ${
                      log.severity === 'critical' ? 'bg-destructive/20 border-destructive/30 text-destructive' :
                      log.severity === 'high' ? 'bg-warning/20 border-warning/30 text-warning' :
                      log.severity === 'medium' ? 'bg-primary/20 border-primary/30 text-primary' :
                      'bg-white/5 border-slate-200 text-muted-foreground'
                    }`}>
                      {log.severity}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
