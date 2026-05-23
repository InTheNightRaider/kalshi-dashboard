const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2'

async function kalshiFetch(path: string, apiKey: string, params?: Record<string, string>) {
  const url = new URL(`${KALSHI_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: apiKey,
      Accept: 'application/json',
    },
    next: { revalidate: 0 }, // always fresh
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Kalshi API error ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export async function getPortfolioBalance(apiKey: string) {
  const data = await kalshiFetch('/portfolio/balance', apiKey)
  const bal = data.balance ?? data
  return {
    available_balance: (bal.available_balance ?? 0) / 100,
    portfolio_value:   (bal.portfolio_value   ?? 0) / 100,
  }
}

export async function getPositions(apiKey: string) {
  const data = await kalshiFetch('/portfolio/positions', apiKey, { count_filter: 'position', limit: '100' })
  return data.market_positions ?? data.positions ?? []
}

export async function getSettlements(apiKey: string) {
  const data = await kalshiFetch('/portfolio/settlements', apiKey, { limit: '100' })
  return data.settlements ?? []
}

/** Fetch the current open KXBTCD event */
export async function getCurrentBtcEvent(apiKey: string) {
  const data = await kalshiFetch('/events', apiKey, {
    series_ticker: 'KXBTCD',
    status: 'open',
    limit: '5',
  })
  const events = data.events ?? []
  return events[0] ?? null
}

/** Fetch markets for an event ticker */
export async function getEventMarkets(apiKey: string, eventTicker: string) {
  const data = await kalshiFetch('/markets', apiKey, {
    event_ticker: eventTicker,
    limit: '200',
  })
  return data.markets ?? []
}

/** Find the single "active" 15-min contract — closest close_time in the future */
export function pickActiveMarket(markets: any[]): any | null {
  const now = Date.now()
  const upcoming = markets
    .filter(m => m.status === 'active' && new Date(m.close_time).getTime() > now)
    .sort((a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime())
  return upcoming[0] ?? null
}
