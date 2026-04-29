import { Bell, UserCircle, LogOut, Terminal, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "../AuthProvider";

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, role, logout, isLocalRecovery, setLocalRecoveryRole } = useAuth();

  return (
    <header className="z-40 flex h-14 md:h-16 min-w-0 items-center justify-between gap-3 border-b border-slate-200 px-3 glass-panel md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="h-9 w-9 shrink-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative w-full max-w-md group hidden sm:block">
          <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-brand-accent-glow transition-colors" />
          <Input
            type="search"
            placeholder="Command search locked"
            className="w-full bg-slate-100 border-slate-200 pl-10 font-mono text-xs h-9 focus-visible:ring-brand-accent-glow/30 text-slate-500"
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
            className="h-8 md:h-9 rounded-md border border-slate-200 bg-slate-100 px-2 text-[10px] font-mono uppercase text-slate-500 outline-none"
            title="Local recovery persona switcher"
          >
            <option value="owner">Owner</option>
            <option value="operator">Operator</option>
            <option value="crew">ACS Crew</option>
            <option value="contractor">CCO Contractor</option>
            <option value="client">Client</option>
          </select>
        )}
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200">
          <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-[10px] font-mono font-bold text-success uppercase tracking-tighter">Sync OK</span>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            disabled
            title="Notifications are disabled until event subscriptions are connected."
            aria-label="Notifications"
          >
            <Bell className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>

          <div className="hidden h-8 w-px bg-slate-200 mx-1 md:mx-2 md:block" />

          <div className="flex min-w-0 items-center gap-2 md:gap-3 pl-1 md:pl-2">
            <div className="hidden min-w-0 max-w-44 flex-col items-end sm:flex">
              <span className="max-w-full truncate text-[10px] font-mono font-bold uppercase leading-none tracking-tight text-slate-700">
                {user?.user_metadata?.full_name || "Operator"}
              </span>
              <span className="mt-1 max-w-full truncate text-[9px] font-mono uppercase text-slate-400">
                {user?.email || "Local recovery"}
              </span>
            </div>
            {user?.user_metadata?.avatar_url ? (
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-md border border-slate-200 p-0.5 bg-slate-50">
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-full w-full rounded-md object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <UserCircle className="h-7 w-7 md:h-8 md:w-8 text-slate-400" />
            )}
            <Button variant="ghost" size="icon" onClick={logout} className="h-7 w-7 md:h-8 md:w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
