import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Inbox,
  CheckSquare,
  Activity,
  FileText,
  MapPinned,
  ReceiptText,
  GitPullRequestArrow,
  Shield,
  Zap,
  Workflow,
  Users,
  WalletCards,
  FileSearch,
  UserPlus,
  Map,
  Film,
  BrainCircuit,
  Scissors,
  Rocket,
  Cpu,
  Crosshair,
  Terminal,
  TrendingUp,
  BookOpen,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../AuthProvider";

const navSections = [
  {
    label: "Work",
    items: [
      { name: "Dashboard", href: "", icon: LayoutDashboard },
      { name: "Inbox", href: "/inbox", icon: Inbox },
      { name: "Contacts", href: "/contacts", icon: Users },
    ]
  },
  {
    label: "Commercial",
    items: [
      { name: "ACS Handoff", href: "/acs-quote-handoff", icon: GitPullRequestArrow },
      { name: "Pipeline", href: "/pipeline", icon: TrendingUp },
      { name: "Quotes", href: "/quotes", icon: FileText },
      { name: "Invoices", href: "/invoices", icon: ReceiptText },
      { name: "Catalog", href: "/catalog", icon: BookOpen },
      { name: "Bank", href: "/bank", icon: Landmark },
      { name: "Briefs", href: "/briefs", icon: FileText },
      { name: "Finance", href: "/finance", icon: WalletCards },
      { name: "Onboarding", href: "/onboarding", icon: UserPlus },
    ]
  },
  {
    label: "Operations",
    items: [
      { name: "Jobs", href: "/jobs", icon: Briefcase },
      { name: "Dispatch", href: "/dispatch", icon: MapPinned },
      { name: "Scheduling", href: "/scheduling", icon: Calendar },
      { name: "Approvals", href: "/approvals", icon: CheckSquare },
    ]
  },
  {
    label: "CCO OS",
    items: [
      { name: "War Room", href: "/video", icon: Crosshair },
      { name: "Shadow Intel", href: "/video/research", icon: BrainCircuit },
      { name: "Phantom Cutter", href: "/video/edit", icon: Scissors },
      { name: "Rapid Fire", href: "/video/rapid-fire", icon: Zap },
      { name: "Dead Drop", href: "/video/deliver", icon: Rocket },
      { name: "Agent Fleet", href: "/video/agents", icon: Cpu },
    ]
  },
  {
    label: "System",
    items: [
      { name: "Audit", href: "/audit", icon: FileSearch },
      { name: "Operator Map", href: "/operator-map", icon: Map },
      { name: "Runtime", href: "/runtime", icon: Activity },
      { name: "Health", href: "/health", icon: Shield },
      { name: "Packets", href: "/packets", icon: Workflow },
    ]
  }
].map((section) => ({
  ...section,
  items: section.items.map((item) => ({
    ...item,
    href: item.href ? `/admin${item.href}` : "/admin",
  })),
}));

export function Sidebar() {
  const { user } = useAuth();

  return (
    <div className="flex h-full w-16 shrink-0 flex-col glass border-r border-white/5 md:w-64">
      {/* Brand */}
      <div className="flex h-20 items-center justify-center border-b border-white/5 px-3 md:justify-start md:px-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-brand-accent-glow/20 blur-md animate-pulse" />
            <Terminal className="h-6 w-6 text-brand-accent-glow relative z-10" />
          </div>
          <div className="hidden flex-col md:flex">
            <span className="font-display text-[1.4rem] leading-none tracking-[0.06em]">MISSION CONTROL</span>
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mt-0.5">ACS + CCO</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-5 md:space-y-8 md:px-4 md:py-6 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1.5">
            <span className="label-nav hidden px-3 md:block">{section.label}</span>
            <nav className="grid gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === "/admin"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 md:justify-start",
                      isActive
                        ? "bg-brand-accent-glow/10 text-brand-accent-glow border-l-2 border-brand-accent-glow"
                        : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                    )
                  }
                  title={item.name}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden font-mono text-[11px] md:inline">{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Session Status */}
      <div className="border-t border-white/5 bg-black/20 p-2 md:p-4">
        <div className={cn(
          "flex items-center justify-center rounded-md border px-2 py-2 transition-colors md:justify-between md:px-3",
          user
            ? "bg-success/10 border-success/20 text-success"
            : "bg-destructive/10 border-destructive/20 text-destructive"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full animate-pulse",
              user ? "bg-success" : "bg-destructive"
            )} />
            <span className="hidden text-[10px] font-mono font-bold uppercase md:inline">
              {user ? "Online" : "Offline"}
            </span>
          </div>
          <span className={cn(
            "hidden text-[10px] font-mono opacity-60 md:inline",
            user ? "text-success" : "text-destructive"
          )}>
            {user ? "Ready" : "No session"}
          </span>
        </div>
      </div>
    </div>
  );
}
