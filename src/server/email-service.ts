import { formatCents } from "../lib/root-billing";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

interface EmailResult {
  ok: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  preview?: string;
}

function companyConfig() {
  return {
    legalName: "Eubanks Marketing Inc.",
    dba: "Content Co-op",
    address: "322 Wilcrest Dr., Houston, TX 77042",
    email: "bailey@contentco-op.com",
    phone: "(501) 351-5927",
    website: "https://contentco-op.com",
  };
}

export function renderQuoteEmail(params: {
  clientName: string;
  documentNumber: string;
  title: string;
  totalCents: number;
  depositCents: number;
  expiryDate?: string | null;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const config = companyConfig();
  const subject = `${config.dba} — Quote ${params.documentNumber}: ${params.title}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #27272a; background: #fafafa; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { padding: 32px 32px 24px; border-bottom: 1px solid #f4f4f5; }
    .header h1 { font-size: 18px; font-weight: 700; color: #18181b; margin: 0 0 4px; }
    .header p { font-size: 13px; color: #71717a; margin: 0; }
    .body { padding: 32px; }
    .body p { font-size: 14px; color: #52525b; margin: 0 0 16px; }
    .cta { display: inline-block; padding: 12px 24px; background: #18181b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; }
    .details { background: #fafafa; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f4f4f5; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #71717a; }
    .details-value { font-weight: 600; color: #18181b; }
    .footer { padding: 24px 32px; border-top: 1px solid #f4f4f5; font-size: 11px; color: #a1a1aa; }
    .footer a { color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config.legalName} DBA ${config.dba}</h1>
      <p>${config.address}</p>
    </div>
    <div class="body">
      <p>Hi ${params.clientName},</p>
      <p>Thank you for considering ${config.dba}. Your quote is ready for review.</p>
      <div class="details">
        <div class="details-row"><span class="details-label">Quote</span><span class="details-value">${params.documentNumber}</span></div>
        <div class="details-row"><span class="details-label">Project</span><span class="details-value">${params.title}</span></div>
        <div class="details-row"><span class="details-label">Total</span><span class="details-value">${formatCents(params.totalCents)}</span></div>
        ${params.depositCents > 0 ? `<div class="details-row"><span class="details-label">Deposit</span><span class="details-value">${formatCents(params.depositCents)}</span></div>` : ""}
        ${params.expiryDate ? `<div class="details-row"><span class="details-label">Valid until</span><span class="details-value">${new Date(params.expiryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>` : ""}
      </div>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${params.portalUrl}" class="cta">Review & Approve Quote</a>
      </p>
      <p style="font-size: 12px; color: #a1a1aa;">Or copy this link: <a href="${params.portalUrl}">${params.portalUrl}</a></p>
      <p>Questions? Reply to this email or call us at ${config.phone}.</p>
      <p>Best,<br>Bailey Eubanks<br>${config.dba}</p>
    </div>
    <div class="footer">
      ${config.legalName} DBA ${config.dba} · ${config.address} · <a href="mailto:${config.email}">${config.email}</a>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${params.clientName},

Your quote from ${config.dba} is ready for review.

Quote: ${params.documentNumber}
Project: ${params.title}
Total: ${formatCents(params.totalCents)}
${params.depositCents > 0 ? `Deposit: ${formatCents(params.depositCents)}\n` : ""}${params.expiryDate ? `Valid until: ${new Date(params.expiryDate).toLocaleDateString()}\n` : ""}
Review and approve: ${params.portalUrl}

Questions? Reply to this email or call us at ${config.phone}.

Best,
Bailey Eubanks
${config.dba}
${config.address}
${config.email}`;

  return { subject, html, text };
}

export function renderInvoiceEmail(params: {
  clientName: string;
  invoiceNumber: string;
  title: string;
  totalCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  dueDate?: string | null;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const config = companyConfig();
  const subject = `${config.dba} — Invoice ${params.invoiceNumber}: ${params.title}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #27272a; background: #fafafa; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { padding: 32px 32px 24px; border-bottom: 1px solid #f4f4f5; }
    .header h1 { font-size: 18px; font-weight: 700; color: #18181b; margin: 0 0 4px; }
    .header p { font-size: 13px; color: #71717a; margin: 0; }
    .body { padding: 32px; }
    .body p { font-size: 14px; color: #52525b; margin: 0 0 16px; }
    .cta { display: inline-block; padding: 12px 24px; background: #18181b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; }
    .details { background: #fafafa; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f4f4f5; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #71717a; }
    .details-value { font-weight: 600; color: #18181b; }
    .balance { color: #ef4444; font-size: 18px; }
    .footer { padding: 24px 32px; border-top: 1px solid #f4f4f5; font-size: 11px; color: #a1a1aa; }
    .footer a { color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config.legalName} DBA ${config.dba}</h1>
      <p>${config.address}</p>
    </div>
    <div class="body">
      <p>Hi ${params.clientName},</p>
      <p>Your invoice is ready. Thank you for your business.</p>
      <div class="details">
        <div class="details-row"><span class="details-label">Invoice</span><span class="details-value">${params.invoiceNumber}</span></div>
        <div class="details-row"><span class="details-label">Project</span><span class="details-value">${params.title}</span></div>
        <div class="details-row"><span class="details-label">Total</span><span class="details-value">${formatCents(params.totalCents)}</span></div>
        ${params.amountPaidCents > 0 ? `<div class="details-row"><span class="details-label">Amount Paid</span><span class="details-value">${formatCents(params.amountPaidCents)}</span></div>` : ""}
        <div class="details-row"><span class="details-label">Balance Due</span><span class="details-value balance">${formatCents(params.balanceDueCents)}</span></div>
        ${params.dueDate ? `<div class="details-row"><span class="details-label">Due Date</span><span class="details-value">${new Date(params.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>` : ""}
      </div>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${params.portalUrl}" class="cta">View Invoice & Pay Online</a>
      </p>
      <p style="font-size: 12px; color: #a1a1aa;">Or pay via Zelle to ${config.email}</p>
      <p>Questions? Reply to this email or call us at ${config.phone}.</p>
      <p>Best,<br>Bailey Eubanks<br>${config.dba}</p>
    </div>
    <div class="footer">
      ${config.legalName} DBA ${config.dba} · ${config.address} · <a href="mailto:${config.email}">${config.email}</a>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${params.clientName},

Your invoice from ${config.dba} is ready.

Invoice: ${params.invoiceNumber}
Project: ${params.title}
Total: ${formatCents(params.totalCents)}
${params.amountPaidCents > 0 ? `Amount Paid: ${formatCents(params.amountPaidCents)}\n` : ""}Balance Due: ${formatCents(params.balanceDueCents)}
${params.dueDate ? `Due Date: ${new Date(params.dueDate).toLocaleDateString()}\n` : ""}
View and pay: ${params.portalUrl}

Or pay via Zelle to ${config.email}

Questions? Reply to this email or call us at ${config.phone}.

Best,
Bailey Eubanks
${config.dba}
${config.address}
${config.email}`;

  return { subject, html, text };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    return {
      ok: false,
      provider: "none",
      error: "RESEND_API_KEY not configured. Email preview generated but not sent.",
      preview: payload.html.slice(0, 500),
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Content Co-op <bailey@contentco-op.com>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString("base64"),
        })),
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { ok: false, provider: "resend", error: json.message || `HTTP ${res.status}` };
    }

    return { ok: true, provider: "resend", messageId: json.id };
  } catch (error) {
    return { ok: false, provider: "resend", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
