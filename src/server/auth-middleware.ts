/**
 * Auth Middleware
 *
 * Verifies Supabase JWT tokens from Authorization headers.
 * Falls back to local recovery mode on localhost.
 */
import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string | null;
  };
}

function isLocalhost(req: Request): boolean {
  const host = req.headers.host || "";
  return ["localhost", "127.0.0.1", "0.0.0.0"].some((h) => host.includes(h));
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Local dev bypass
  if (isLocalhost(req)) {
    req.user = { id: "local-recovery-operator", email: "operator@mission-control.local", role: "operator" };
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header." } });
    return;
  }

  const token = authHeader.slice(7);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!url || !anonKey) {
    res.status(503).json({ ok: false, error: { code: "AUTH_UNAVAILABLE", message: "Auth service not configured." } });
    return;
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired token." } });
      return;
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
    };
    next();
  } catch (e) {
    console.error("Auth middleware error:", e);
    res.status(500).json({ ok: false, error: { code: "AUTH_ERROR", message: "Authentication check failed." } });
  }
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  // Same as auth but allows anonymous requests (guest brief creation)
  if (isLocalhost(req)) {
    req.user = { id: "local-recovery-operator", email: "operator@mission-control.local", role: "operator" };
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!url || !anonKey) {
    next();
    return;
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  supabase.auth.getUser(token)
    .then(({ data, error }) => {
      if (!error && data.user) {
        req.user = { id: data.user.id, email: data.user.email };
      }
      next();
    })
    .catch(() => next());
}
