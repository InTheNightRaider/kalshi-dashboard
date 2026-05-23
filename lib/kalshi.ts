import { createSign, constants } from 'crypto'

const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2'
const API_PATH   = '/trade-api/v2'

function signHeaders(method: string, urlPath: string, keyId: string, pem: string) {
  const timestamp = Date.now().toString()
  const msg = timestamp + method.toUpperCase() + API_PATH + urlPath
  const sign = createSign('SHA256')
  sign.update(msg)
  const sig = sign.sign(
    { key: pem, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: constants.RSA_PSS_SALTLEN_MAX_SIGN },
    'base64'
  )
  return {
    'KALSHI-ACCESS-KEY':       keyId,
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
    'KALSHI-ACCESS-SIGNATURE': sig,
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  }
}

async function kalshiFetch(
  path: string,
  keyId: string,
  pem: string,
  params?: Record<string, string>
): Promise<any> {
  const url = new URL(`${KALSHI_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  // BUGFIX: signHeaders prepends API_PATH ('/trade-api/v2'). Passing
  // url.pathname (which already starts with '/trade-api/v2') caused the
  // signed canonical string to contain '/trade-api/v2/trade-api/v2/...'
  // while Kalshi recomputed against the single-prefixed path → 401
  // INCORRECT_API_KEY_SIGNATURE for every signed request.
  const urlPath = path + url.search
  const headers = signHeaders('GET', urlPath, keyId, pem)
  const res = await fetch(url.toString(), { headers, next: { revalidate: 0 } })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Kalshi API error ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export async function getPortfolioBalance(keyId: string, pem: string) {
  const data = await kalshiFetch('/portfolio/balance', keyId, pem)
  const bal = data.balance ?? data
  return {
    available_balance: (bal.available_balance ?? 0) / 100,
    portfolio_value:   (bal.portfolio_value   ?? 0) / 100,
  }
}

export async function getPositions(keyId: string, pem: string) {
  const data = await kalshiFetch('/portfolio/positions', keyId, pem, { count_filter: 'position', limit: '100' })
  return data.market_positions ?? data.positions ?? []
}

export async function getSettlements(keyId: string, pem: string) {
  const data = await kalshiFetch('/portfolio/settlements', keyId, pem, { limit: '100' })
  return data.settlements ?? []
}

/** Fetch the current open KXBTCD event */
export async function getCurrentBtcEvent(keyId: string, pem: string) {
  const data = await kalshiFetch('/events', keyId, pem, {
    series_ticker: 'KXBTCD',
    status: 'open',
    limit: '5',
  })
  const events = data.events ?? []
  return events[0] ?? null
}

/** Fetch markets for an event ticker */
export async function getEventMarkets(keyId: string, pem: string, eventTicker: string) {
  const data = await kalshiFetch('/markets', keyId, pem, {
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
