export type NormalizedTwilioPayload = {
  to: string;
  message: string;
  from?: string;
};

export function normalizeTwilioPayload(reqBody: unknown): NormalizedTwilioPayload | null {
  if (!reqBody || typeof reqBody !== 'object') return null;

  const body = reqBody as Record<string, unknown>;

  const to = typeof body.to === 'string' ? body.to.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const from = typeof body.from === 'string' ? body.from.trim() : undefined;

  if (!to || !message) {
    return null;
  }

  return { to, message: message.length > 5000 ? message.slice(0, 5000) : message, from: from || undefined };
}

export function hasEnvKey(name: string): boolean {
  return Boolean(process.env[name] && process.env[name]!.trim());
}
