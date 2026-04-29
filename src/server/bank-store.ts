import fs from "node:fs";
import path from "node:path";
import type { CompanyAccountId } from "../lib/mission-control";
import { sbSelect, sbUpsert, sbDelete } from "./data-adapter";

export interface BankTransaction {
  id: string;
  companyAccount: CompanyAccountId;
  date: string;
  description: string;
  amountCents: number;
  type: "credit" | "debit";
  status: "unmatched" | "matched" | "reconciled";
  matchedInvoiceId: string | null;
  matchedInvoiceNumber: string | null;
  statementId: string;
  createdAt: string;
}

export interface BankStatement {
  id: string;
  companyAccount: CompanyAccountId;
  fileName: string;
  uploadDate: string;
  transactionCount: number;
  totalCreditsCents: number;
  totalDebitsCents: number;
  createdAt: string;
}

interface BankState {
  statements: BankStatement[];
  transactions: BankTransaction[];
}

function bankFile(storeDir?: string): string {
  const dir = storeDir ?? path.resolve(process.cwd(), ".data");
  return path.join(dir, "bank.json");
}

let bankHydrated = false;

async function hydrateBankFromSupabase(storeDir?: string): Promise<void> {
  if (bankHydrated) return;
  const stmtRes = await sbSelect<{ data: unknown }>("bank_statements");
  const txnRes = await sbSelect<{ data: unknown }>("bank_transactions");
  if (stmtRes.ok && txnRes.ok) {
    const state: BankState = {
      statements: (stmtRes.data?.map((r) => r.data) as BankStatement[]) ?? [],
      transactions: (txnRes.data?.map((r) => r.data) as BankTransaction[]) ?? [],
    };
    writeState(state, storeDir);
  }
  bankHydrated = true;
}

function readState(storeDir?: string): BankState {
  if (!bankHydrated) {
    hydrateBankFromSupabase(storeDir).catch(() => { /* silent */ });
  }
  const file = bankFile(storeDir);
  if (!fs.existsSync(file)) return { statements: [], transactions: [] };
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as BankState;
  } catch {
    return { statements: [], transactions: [] };
  }
}

function syncStatementToSupabase(s: BankStatement): void {
  sbUpsert("bank_statements", {
    id: s.id,
    company_account_id: s.companyAccount,
    data: s as unknown as Record<string, unknown>,
    created_at: s.createdAt,
  }).catch(() => { /* silent */ });
}
function syncTransactionToSupabase(t: BankTransaction): void {
  sbUpsert("bank_transactions", {
    id: t.id,
    statement_id: t.statementId,
    data: t as unknown as Record<string, unknown>,
    created_at: t.createdAt,
  }).catch(() => { /* silent */ });
}

function writeState(state: BankState, storeDir?: string): void {
  const file = bankFile(storeDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  for (const s of state.statements) syncStatementToSupabase(s);
  for (const t of state.transactions) syncTransactionToSupabase(t);
}

function stableId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-4)}`;
}

export function listBankStatements(account?: CompanyAccountId, storeDir?: string): BankStatement[] {
  const state = readState(storeDir);
  if (account) return state.statements.filter((s) => s.companyAccount === account);
  return state.statements;
}

export function listBankTransactions(filters: { account?: CompanyAccountId; statementId?: string; status?: BankTransaction["status"] }, storeDir?: string): BankTransaction[] {
  const state = readState(storeDir);
  return state.transactions.filter((t) => {
    if (filters.account && t.companyAccount !== filters.account) return false;
    if (filters.statementId && t.statementId !== filters.statementId) return false;
    if (filters.status && t.status !== filters.status) return false;
    return true;
  });
}

export function parseCsvTransactions(csvText: string, companyAccount: CompanyAccountId, fileName: string, storeDir?: string): { statement: BankStatement; transactions: BankTransaction[] } {
  const state = readState(storeDir);
  const statementId = stableId("stmt");
  const lines = csvText.split("\n").filter((l) => l.trim());
  // Simple CSV parser: assume header row, then Date, Description, Amount columns
  const transactions: BankTransaction[] = [];
  let totalCredits = 0;
  let totalDebits = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 3) continue;
    const date = cols[0];
    const description = cols[1];
    const amountRaw = cols[2].replace(/[$,]/g, "");
    const amount = parseFloat(amountRaw);
    if (isNaN(amount)) continue;
    const type: "credit" | "debit" = amount >= 0 ? "credit" : "debit";
    const amountCents = Math.round(Math.abs(amount) * 100);
    if (type === "credit") totalCredits += amountCents;
    else totalDebits += amountCents;
    transactions.push({
      id: stableId("txn"),
      companyAccount,
      date,
      description,
      amountCents,
      type,
      status: "unmatched",
      matchedInvoiceId: null,
      matchedInvoiceNumber: null,
      statementId,
      createdAt: new Date().toISOString(),
    });
  }

  const statement: BankStatement = {
    id: statementId,
    companyAccount,
    fileName,
    uploadDate: new Date().toISOString(),
    transactionCount: transactions.length,
    totalCreditsCents: totalCredits,
    totalDebitsCents: totalDebits,
    createdAt: new Date().toISOString(),
  };

  state.statements.unshift(statement);
  state.transactions.unshift(...transactions);
  writeState(state, storeDir);
  return { statement, transactions };
}

export function matchTransactionToInvoice(transactionId: string, invoiceId: string, invoiceNumber: string, storeDir?: string): BankTransaction {
  const state = readState(storeDir);
  const txn = state.transactions.find((t) => t.id === transactionId);
  if (!txn) throw new Error("Transaction not found");
  txn.matchedInvoiceId = invoiceId;
  txn.matchedInvoiceNumber = invoiceNumber;
  txn.status = "matched";
  writeState(state, storeDir);
  return txn;
}

export function reconcileTransaction(transactionId: string, storeDir?: string): BankTransaction {
  const state = readState(storeDir);
  const txn = state.transactions.find((t) => t.id === transactionId);
  if (!txn) throw new Error("Transaction not found");
  txn.status = "reconciled";
  writeState(state, storeDir);
  return txn;
}

export function getBankStats(account?: CompanyAccountId, storeDir?: string): {
  totalTransactions: number;
  unmatchedCount: number;
  matchedCount: number;
  reconciledCount: number;
  totalCreditsCents: number;
  totalDebitsCents: number;
} {
  const txns = listBankTransactions({ account }, storeDir);
  return {
    totalTransactions: txns.length,
    unmatchedCount: txns.filter((t) => t.status === "unmatched").length,
    matchedCount: txns.filter((t) => t.status === "matched").length,
    reconciledCount: txns.filter((t) => t.status === "reconciled").length,
    totalCreditsCents: txns.filter((t) => t.type === "credit").reduce((sum, t) => sum + t.amountCents, 0),
    totalDebitsCents: txns.filter((t) => t.type === "debit").reduce((sum, t) => sum + t.amountCents, 0),
  };
}
