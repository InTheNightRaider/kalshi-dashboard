/**
 * Lightweight origin-based CSRF guard.
 *
 * Browsers automatically attach the `Origin` header to cross-origin POST
 * requests, and never let user-side code forge it. If a POST comes in
 * from a different origin than the one serving the dashboard, reject.
 *
 * In dev (NODE_ENV !== 'production') we also allow missing Origin so
 * curl-based smoke tests work.
 */

import { NextResponse } from 'next/server'

export function checkCsrf(request: Request): NextResponse | null {
  const origin = request.headers.get('origin')
  const host   = request.headers.get('host')
  if (!host) return null  // Should never happen, but allow.

  // Allow same-origin or missing origin in dev only.
  if (!origin) {
    if (process.env.NODE_ENV !== 'production') return null
    return NextResponse.json({ error: 'Missing Origin header' }, { status: 403 })
  }

  let originHost: string
  try { originHost = new URL(origin).host } catch { return NextResponse.json({ error: 'Bad Origin' }, { status: 403 }) }

  if (originHost !== host) {
    return NextResponse.json({ error: 'CSRF: origin mismatch' }, { status: 403 })
  }
  return null
}
