import { Bell, UserCircle, LogOut, Terminal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "../AuthProvider";

export function Topbar() {
  const { user, role, logout, isLocalRecovery, setLocalRecoveryRole } = useAuth();

  return (
    <header className="z-40 flex h-16 min-w-0 items-center justify-between gap-3 border-b border-white/5 px-3 glass-panel md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-6">
        <div className="relative w-full max-w-md group">
          <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20 group-focus-within:text-brand-accent-glow transition-colors" />
          <Input
            type="search"
            placeholder="Command search locked"
            className="w-full bg-black/20 border-white/5 pl-10 font-mono text-xs h-9 focus-visible:ring-brand-accent-glow/30 text-white/50"
            disabled
            title="Global command search is disabled until the command/action registry is connected."
          />
        </div>
      </div>

      <div className="flex min-w-0 shrink items-center gap-2 md:gap-6">
        {isLocalRecovery && (
          <select
            value={role || "operator"}
            onChange={(event) => setLocalRecoveryRole(event.target.value)}
            className="hidden h-9 rounded-md border border-white/10 bg-black/30 px-2 text-[10px] font-mono uppercase text-white/40 outline-none md:block"
            title="Local recovery persona switcher"
          >
            <option value="owner">Owner</option>
            <option value="operator">Operator</option>
            <option value="crew">ACS Crew</option>
            <option value="contractor">CCO Contractor</option>
            <option value="client">Client</option>
          </select>
        )}
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5">
          <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-[10px] font-mono font-bold text-success uppercase tracking-tighter">Sync OK</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/30 hover:text-white/70 hover:bg-white/[0.04]"
            disabled
            title="Notifications are disabled until event subscriptions are connected."
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>

          <div className="hidden h-8 w-px bg-white/5 mx-2 md:block" />

          <div className="flex min-w-0 items-center gap-3 pl-2">
            <div className="hidden min-w-0 max-w-44 flex-col items-end sm:flex">
              <span className="max-w-full truncate text-[10px] font-mono font-bold uppercase leading-none tracking-tight text-white/80">
                {user?.user_metadata?.full_name || "Operator"}
              </span>
              <span className="mt-1 max-w-full truncate text-[9px] font-mono uppercase text-white/30">
                {user?.email || "Local recovery"}
              </span>
            </div>
            {user?.user_metadata?.avatar_url ? (
              <div className="h-8 w-8 rounded-md border border-white/10 p-0.5 bg-white/[0.03]">
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-full w-full rounded-md object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <UserCircle className="h-8 w-8 text-white/30" />
            )}
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-white/30 hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
