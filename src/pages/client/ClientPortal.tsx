import { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  CreditCard, 
  MessageSquare,
  Loader2,
  ShieldCheck
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  state: string;
  scheduled_start: string;
  price_cents: number;
}

export function ClientPortal() {
  const { token } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobByToken() {
      if (!token) return;
      setLoading(true);
      try {
        // In a real app, we'd have a 'job_tokens' table or similar.
        // For now, we'll assume the token is the job ID for the demo.
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', token)
          .single();

        if (error) throw error;
        setJob(data);
      } catch (error) {
        console.error("Error fetching client job:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchJobByToken();
  }, [token]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!job) return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-50 p-6 text-center">
      <div className="glass p-8 rounded-lg border border-destructive/20 max-w-sm">
        <h1 className="text-xl font-display font-bold text-destructive mb-2 uppercase">Invalid_Access_Token</h1>
        <p className="text-sm text-muted-foreground">The link you followed is expired or incorrect. Please contact support.</p>
      </div>
    </div>
  );

  const getStepStatus = (step: string) => {
    const states = ['lead', 'quoted', 'scheduled', 'in_progress', 'completed', 'paid'];
    const currentIndex = states.indexOf(job.state);
    const stepIndex = states.indexOf(step);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-slate-50 text-slate-900 font-sans p-4 md:p-8 items-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-sm bg-primary flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight uppercase">Mission Control</h1>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Secure_Client_Portal</p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] uppercase border-primary/20 text-primary">
            {job.state.replace('_', ' ')}
          </Badge>
        </div>

        <Card className="glass border-slate-200 overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-slate-200">
            <CardTitle className="text-2xl font-display tracking-tight">{job.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{job.description}</p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase">Scheduled_For</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">{job.scheduled_start ? new Date(job.scheduled_start).toLocaleDateString() : 'TBD'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase">Total_Investment</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">${(job.price_cents / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Service_Journey</p>
              <div className="relative space-y-6 pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
                
                {[
                  { id: 'lead', label: 'Request Received', desc: 'We have received your service request.' },
                  { id: 'quoted', label: 'Quote Prepared', desc: 'Pricing and scope have been finalized.' },
                  { id: 'scheduled', label: 'Service Scheduled', desc: 'Our crew is assigned and ready.' },
                  { id: 'in_progress', label: 'Execution', desc: 'Work is currently being performed.' },
                  { id: 'completed', label: 'Final Proof', desc: 'Work is complete. Review photos.' },
                ].map((step) => {
                  const status = getStepStatus(step.id);
                  return (
                    <div key={step.id} className="relative">
                      <div className={`absolute -left-[23px] top-1 h-4 w-4 rounded-full border-2 border-black ${
                        status === 'completed' ? 'bg-success' : 
                        status === 'active' ? 'bg-primary animate-pulse' : 'bg-white/10'
                      }`} />
                      <div className={status === 'pending' ? 'opacity-30' : ''}>
                        <h4 className="text-sm font-bold">{step.label}</h4>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            className="h-14 bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/90"
            disabled
            title="Client chat is disabled until the communications approval path is connected."
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Chat locked
          </Button>
          {job.state === 'quoted' && (
            <Button
              className="h-14 bg-success text-white font-bold uppercase tracking-widest hover:bg-success/90"
              disabled
              title="Quote approval is disabled until the client approval write path is connected."
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Approval locked
            </Button>
          )}
          {job.state === 'completed' && (
            <Button
              className="h-14 bg-success text-white font-bold uppercase tracking-widest hover:bg-success/90"
              disabled
              title="Invoice payment is disabled until Stripe payment links are connected."
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Payment locked
            </Button>
          )}
        </div>

        <footer className="text-center pt-12 pb-8">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Powered_By_Mission_Control • Secure_Handshake_Verified</p>
        </footer>
      </div>
    </div>
  );
}
