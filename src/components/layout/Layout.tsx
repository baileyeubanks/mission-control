import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "../AuthProvider";
import { Button } from "../ui/button";
import { Activity, Zap } from "lucide-react";

export function Layout() {
  const { user, isAuthReady, signInWithGoogle } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-base text-white/40 font-mono uppercase tracking-widest">
        <Activity className="h-4 w-4 animate-pulse mr-3 text-brand-accent-glow" />
        Initialising_Mission_Control...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-base relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(61,125,216,0.08)_0%,transparent_60%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_top_right,rgba(61,125,216,0.04)_0%,transparent_50%)]" />

        <div className="relative z-10 text-center space-y-8 max-w-sm p-12 glass-panel">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Zap className="h-8 w-8 text-brand-accent-glow" />
            </div>
            <h1 className="text-4xl font-display tracking-[0.1em]">MISSION CONTROL</h1>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em]">
              ACS Operations — CCO OS
            </p>
          </div>
          <div className="h-px w-16 bg-brand-accent-glow/30 mx-auto" />
          <Button
            onClick={signInWithGoogle}
            className="w-full btn-mission"
          >
            Establish Authority
          </Button>
          <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
            Local recovery available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-brand-base selection:bg-brand-accent-glow/30">
      {/* Title bar */}
      <div className="h-7 w-full bg-black/40 border-b border-white/5 flex items-center justify-between px-3 md:px-4 z-50">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-success" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-success">Local</span>
        </div>
        <span className="truncate text-[10px] font-mono text-white/30 uppercase tracking-wider">
          Mission Control — ACS + CCO
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden relative">
          {/* Subtle ambient glow in main content */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(61,125,216,0.02)_0%,transparent_40%)] pointer-events-none" />
          <Topbar />
          <main className="relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scrollbar-thin">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
