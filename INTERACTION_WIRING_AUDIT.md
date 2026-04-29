# Interaction Wiring Audit

Generated: 2026-04-24T21:54:55.881Z

## Summary

- Total interactive elements found: 92
- Dead buttons: 0
- Fake submit handlers: 0
- Mock-only screens: 0
- Missing API routes: 0
- Missing database writes: 0
- Broken navigation links: 0
- Forms without validation: 0
- Forms without persistence: 0
- P0 breaks: 0
- P1 breaks: 0

## P0 Core Flow Breaks

No records.

## P1 Important Breaks

No records.

## Route-by-Route Interaction Inventory

| Priority | Status | Route | File | Label | Required behavior |
|---|---|---|---|---|---|
| P3 | disabled | unknown | src/App.tsx:151 | useLocalRecoveryGateway ? "Local Recovery Active" : "Sign In With Google" | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | unknown | src/App.tsx:152 | onClick= handleSignIn disabled= useLocalRecoveryGateway className="w-full font-m | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | wired | unknown | src/components/ErrorBoundary.tsx:54 | window.location.reload className="w-full font-mono text-[10px] uppercase trackin | Keep window.location.reload className="w-full font-mono text-[10px] uppercase trackin only if it has a visible effect or honest disabled state. |
| P3 | wired | unknown | src/components/ErrorBoundary.tsx:55 | onClick= => window.location.reload className="w-full font-mono text-[10px] upper | Keep onClick= => window.location.reload className="w-full font-mono text-[10px] upper only if it has a visible effect or honest disabled state. |
| P2 | wired | layout | src/components/layout/Layout.tsx:25 | Establish Authority | Keep Establish Authority only if it has a visible effect or honest disabled state. |
| P2 | disabled | layout | src/components/layout/Topbar.tsx:31 | Notifications | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P2 | wired | layout | src/components/layout/Topbar.tsx:56 | unlabeled interaction | Keep unlabeled interaction only if it has a visible effect or honest disabled state. |
| P0 | disabled | /admin/approvals | src/pages/Approvals.tsx:123 | void decideApproval req.id, "rejected" disabled= req.status !== "requested" // B | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/approvals | src/pages/Approvals.tsx:127 | onClick= => void decideApproval req.id, "rejected" disabled= req.status !== "req | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/approvals | src/pages/Approvals.tsx:134 | void decideApproval req.id, "approved" disabled= req.status !== "requested" // B | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/approvals | src/pages/Approvals.tsx:137 | onClick= => void decideApproval req.id, "approved" disabled= req.status !== "req | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/contacts | src/pages/Contacts.tsx:64 | Contact creation is locked until the company-scoped contact write path is connected. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/contacts | src/pages/Contacts.tsx:87 | Filter contacts | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/contacts | src/pages/Contacts.tsx:139 | Contact detail actions need the company-scoped contact backend. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:56 | navigate `/admin?account=$ accountId ` ; ; const launchModule = launchPath: stri | Keep navigate `/admin?account=$ accountId ` ; ; const launchModule = launchPath: stri only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:60 | navigate launchPath ; ; const account = useMemo => bootstrap?.accounts.find item | Keep navigate launchPath ; ; const account = useMemo => bootstrap?.accounts.find item only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:104 | void refresh > | Keep void refresh > only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:132 | selectAccount item.id className="font-mono text-[10px] uppercase tracking-widest | Keep selectAccount item.id className="font-mono text-[10px] uppercase tracking-widest only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:136 | onClick= => selectAccount item.id className="font-mono text-[10px] uppercase tra | Keep onClick= => selectAccount item.id className="font-mono text-[10px] uppercase tra only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:142 | Refresh | Keep Refresh only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:168 | navigate action.path className="flex items-center justify-between gap-3 rounded- | Keep navigate action.path className="flex items-center justify-between gap-3 rounded- only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:171 | onClick= => navigate action.path className="flex items-center justify-between ga | Keep onClick= => navigate action.path className="flex items-center justify-between ga only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:190 | navigate loop.route className="rounded-sm border border-white/5 bg-black/20 p-3  | Keep navigate loop.route className="rounded-sm border border-white/5 bg-black/20 p-3  only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:193 | onClick= => navigate loop.route className="rounded-sm border border-white/5 bg-b | Keep onClick= => navigate loop.route className="rounded-sm border border-white/5 bg-b only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:219 | navigate lane.route className="rounded-sm border border-white/5 bg-black/20 p-3  | Keep navigate lane.route className="rounded-sm border border-white/5 bg-black/20 p-3  only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:222 | onClick= => navigate lane.route className="rounded-sm border border-white/5 bg-b | Keep onClick= => navigate lane.route className="rounded-sm border border-white/5 bg-b only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:248 | navigate flow.route className="rounded-sm border border-white/5 bg-black/20 p-3  | Keep navigate flow.route className="rounded-sm border border-white/5 bg-black/20 p-3  only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:251 | onClick= => navigate flow.route className="rounded-sm border border-white/5 bg-b | Keep onClick= => navigate flow.route className="rounded-sm border border-white/5 bg-b only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:280 | navigate gap.affectedRoutes[0] // "/admin" className="rounded-sm border border-w | Keep navigate gap.affectedRoutes[0] // "/admin" className="rounded-sm border border-w only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:283 | onClick= => navigate gap.affectedRoutes[0] // "/admin" className="rounded-sm bor | Keep onClick= => navigate gap.affectedRoutes[0] // "/admin" className="rounded-sm bor only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:340 | href= signal.source target="_blank" rel="noreferrer" className="inline-flex item | Keep href= signal.source target="_blank" rel="noreferrer" className="inline-flex item only if it has a visible effect or honest disabled state. |
| P3 | wired | /admin | src/pages/Dashboard.tsx:368 | launchModule module.launchPath title= `Open $ module.label ` > | Keep launchModule module.launchPath title= `Open $ module.label ` > only if it has a visible effect or honest disabled state. |
| P1 | disabled | /admin/files | src/pages/Files.tsx:75 | Create new folder | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/files | src/pages/Files.tsx:86 | Uploads are disabled until file storage and audit logging are connected. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/files | src/pages/Files.tsx:144 | File actions are disabled until storage authority is selected. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | wired | /admin/finance | src/pages/Finance.tsx:100 | Export financial data | Keep Export financial data only if it has a visible effect or honest disabled state. |
| P0 | wired | /admin/finance | src/pages/Finance.tsx:105 | onClick= exportInvoices > | Wire onClick= exportInvoices > to a validated backend action with persistence, event logging, and company scope. |
| P3 | disabled | /admin/finance | src/pages/Finance.tsx:110 | Invoice creation is locked until the Stripe-backed write path is connected. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/finance | src/pages/Finance.tsx:167 | Filter invoices | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/health | src/pages/Health.tsx:100 | Reboot_Subsystems | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | wired | /admin/inbox | src/pages/Inbox.tsx:395 | onClick= => setActiveThreadId thread.threadId > thread.counterpart new Date thre | Keep onClick= => setActiveThreadId thread.threadId > thread.counterpart new Date thre only if it has a visible effect or honest disabled state. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:436 | void queuePacket "thread_summarize" disabled= packetAction === "thread_summarize | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/inbox | src/pages/Inbox.tsx:440 | onClick= => void queuePacket "thread_summarize" disabled= packetAction === "thre | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:446 | void queuePacket "intake_extract" disabled= packetAction === "intake_extract" // | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/inbox | src/pages/Inbox.tsx:450 | onClick= => void queuePacket "intake_extract" disabled= packetAction === "intake | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:456 | More actions | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | wired | /admin/inbox | src/pages/Inbox.tsx:551 | unlabeled interaction | Wire unlabeled interaction to a real route, filter, export, or API action. |
| P0 | wired | /admin/inbox | src/pages/Inbox.tsx:555 | unlabeled interaction | Wire unlabeled interaction to a validated backend action with persistence, event logging, and company scope. |
| P0 | wired | /admin/inbox | src/pages/Inbox.tsx:561 | unlabeled interaction | Wire unlabeled interaction to a validated backend action with persistence, event logging, and company scope. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:566 | void handleConvertHandoff disabled= handoffAction // activeThread.handoffStatus  | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/inbox | src/pages/Inbox.tsx:570 | onClick= => void handleConvertHandoff disabled= handoffAction // activeThread.ha | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | wired | /admin/inbox | src/pages/Inbox.tsx:618 | setDraft draftPacketText > Use draft | Keep setDraft draftPacketText > Use draft only if it has a visible effect or honest disabled state. |
| P1 | wired | /admin/inbox | src/pages/Inbox.tsx:622 | onClick= => setDraft draftPacketText > Use draft | Wire onClick= => setDraft draftPacketText > Use draft to a real route, filter, export, or API action. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:689 | Attach file | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:708 | Direct replies are locked. Use Draft reply first. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:717 | Internal notes need the communications/event write path. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:727 | void queuePacket "thread_reply_draft" disabled= packetAction === "thread_reply_d | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/inbox | src/pages/Inbox.tsx:731 | onClick= => void queuePacket "thread_reply_draft" disabled= packetAction === "th | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/inbox | src/pages/Inbox.tsx:742 | Outbound sending is locked until explicit approval policy is connected. Keep this as draft-only. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/inbox | src/pages/Inbox.tsx:745 | Outbound sending is locked until explicit approval policy is connected. Keep this as draft-only. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/jobs | src/pages/Jobs.tsx:159 | List view | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/jobs | src/pages/Jobs.tsx:160 | Grid view | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/jobs | src/pages/Jobs.tsx:171 | Controlled_Intake_Only | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/jobs | src/pages/Jobs.tsx:231 | Queue_Update_Draft | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/jobs | src/pages/Jobs.tsx:235 | Queue_Update_Draft | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | disabled | /admin/jobs | src/pages/Jobs.tsx:267 | Advanced job filters are not wired yet. Search is active. | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | wired | /admin/jobs | src/pages/Jobs.tsx:308 | onClick= => setSelectedJobId job.id > job.title job.id.slice 0, 8 job.clientName | Wire onClick= => setSelectedJobId job.id > job.title job.id.slice 0, 8 job.clientName to a validated backend action with persistence, event logging, and company scope. |
| P0 | disabled | /admin/:domain | src/pages/OperatingDomain.tsx:177 | void createQuoteHandoff disabled= creatingQuote className="h-9 text-xs"> creatin | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P0 | wired | /admin/:domain | src/pages/OperatingDomain.tsx:181 | setQuoteFormOpen false className="h-9 text-xs border-white/10"> Cancel | Wire setQuoteFormOpen false className="h-9 text-xs border-white/10"> Cancel to a validated backend action with persistence, event logging, and company scope. |
| P3 | wired | /admin/:domain | src/pages/OperatingDomain.tsx:193 | setQuoteFormOpen open => !open > | Keep setQuoteFormOpen open => !open > only if it has a visible effect or honest disabled state. |
| P0 | wired | /admin/:domain | src/pages/OperatingDomain.tsx:196 | onClick= => setQuoteFormOpen open => !open > | Wire onClick= => setQuoteFormOpen open => !open > to a validated backend action with persistence, event logging, and company scope. |
| P1 | wired | /admin/packets | src/pages/Packets.tsx:90 | void refreshPackets > | Wire void refreshPackets > to a real route, filter, export, or API action. |
| P1 | disabled | /admin/packets | src/pages/Packets.tsx:169 | void handleRetry packet.id disabled= actingOn === packet.id > | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/packets | src/pages/Packets.tsx:173 | onClick= => void handleRetry packet.id disabled= actingOn === packet.id > | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/packets | src/pages/Packets.tsx:181 | void handleCancel packet.id disabled= actingOn === packet.id > | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | disabled | /admin/packets | src/pages/Packets.tsx:185 | onClick= => void handleCancel packet.id disabled= actingOn === packet.id > | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P1 | wired | /admin/runtime | src/pages/Runtime.tsx:94 | void refreshRuntime className="w-fit font-mono text-[10px] uppercase"> | Wire void refreshRuntime className="w-fit font-mono text-[10px] uppercase"> to a real route, filter, export, or API action. |
| P3 | disabled | /admin/scheduling | src/pages/Scheduling.tsx:153 | Previous week | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/scheduling | src/pages/Scheduling.tsx:164 | Next week | Keep disabled until the required backend/data contract exists; visible reason must be present. |
| P3 | disabled | /admin/scheduling | src/pages/Scheduling.tsx:175 | Go to today | Keep disabled until the required backend/data contract exists; visible reason must be present. |

## Recommended Wiring Order

1. Wire or disable P0 approval, quote, booking, invoice, payment, send, and handoff actions.
2. Wire P1 filter/export/view controls or hide them until useful.
3. Keep AI actions packetized and drafts-only unless an approval gate exists.
4. Rerun this audit after every wiring pass.
