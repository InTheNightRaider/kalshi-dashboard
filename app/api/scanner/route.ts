import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getCurrentBtcEvent, getEventMarkets, pickActiveMarket } from '@/lib/kalshi'

const BINANCE = 'https://data-api.binance.vision'

// ── Binance helpers ───────────────────────────────────────────────────────────
async function fetchKlines(interval: string, limit: number): Promise<number[][]> {
  try {
    const res = await fetch(
      `${BINANCE}/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchPrice(): Promise<number | null> {
  try {
    const res = await fetch(`${BINANCE}/api/v3/ticker/price?symbol=BTCUSDT`, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const d = await res.json()
    return parseFloat(d.price)
  } catch {
    return null
  }
}

// ── RSI (Wilder) ─────────────────────────────────────────────────────────────
function calcRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  let gain = 0, loss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) gain += d; else loss -= d
  }
  let ag = gain / period, al = loss / period
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    ag = (ag * (period - 1) + Math.max(d, 0)) / period
    al = (al * (period - 1) + Math.max(-d, 0)) / period
  }
  if (al === 0) return 100
  return 100 - 100 / (1 + ag / al)
}

// ── Trend per TF ─────────────────────────────────────────────────────────────
function tfTrend(klines: number[][]): 'UP' | 'DOWN' | null {
  if (!klines || klines.length < 5) return null
  const closes = klines.map(k => parseFloat(k[4] as any))
  const r = calcRsi(closes)
  const n = closes.length
  const slopeUp = closes[n-1] > closes[n-2] && closes[n-2] > closes[n-3]
  const slopeDn = closes[n-1] < closes[n-2] && closes[n-2] < closes[n-3]
  const bull = (r !== null && r > 55 ? 1 : 0) + (slopeUp ? 1 : 0)
  const bear = (r !== null && r < 45 ? 1 : 0) + (slopeDn ? 1 : 0)
  if (bull >= 2 || (bull === 1 && bear === 0)) return 'UP'
  if (bear >= 2 || (bear === 1 && bull === 0)) return 'DOWN'
  return null
}

// ── Mode 4 status ─────────────────────────────────────────────────────────────
// green  = all conditions met (would enter right now)
// yellow = confluence ≥ 3, getting interesting
// gray   = not there yet
function calcMode4Status(
  confluenceScore: number,
  confluenceDir: 'UP' | 'DOWN' | null,
  minutesIn: number,
  minutesLeft: number,
  yesMid: number,
  noMid: number,
): 'green' | 'yellow' | 'gray' {
  const inWindow   = minutesIn >= 7 && minutesIn <= 12 && minutesLeft >= 3 && minutesLeft <= 8
  const midOk      = (confluenceDir === 'UP'   && yesMid >= 0.90 && yesMid <= 0.96)
                  || (confluenceDir === 'DOWN'  && noMid  >= 0.90 && noMid  <= 0.96)
  const confluence = confluenceScore >= 4

  if (confluence && inWindow && midOk) return 'green'
  if (confluenceScore >= 3)            return 'yellow'
  return 'gray'
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET() {
  const TFS    = ['1m','3m','5m','15m','30m','1h','4h'] as const
  const LIMITS: Record<string, number> = {
    '1m': 60, '3m': 30, '5m': 35,