import crypto from 'crypto'

const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2'

function signRequest(privateKeyPem: string, timestamp: number, method: string, path: string): string {
  const msg = `${timestamp}${method.toUpperCase()}${path}`
  const sign = crypto.createSign('SHA256')
  sign.update(msg)
  return sign.sign(privateKeyPem, 'base64')
}

async function kalshiFetch(
  path: string,
  apiKey: string,
  privateKey: string,
  method = 'GET',
  params?: Record<string, string>
) {
  const url = new URL(`${KALSHI_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const ts  = Date.now()
  const sig = signRequest(privateKey, ts, method, `/trade-api/v2${path}`)

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'KALSHI-ACCESS-KEY':       apiKey,
      'KALSHI-ACCESS-TIMESTAMP': ts.toString(),
      'KALSHI-ACCESS-SIGNATURE': sig,
      'Accept':                  'application/json',
      'Content-Type':            'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Kalshi ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json()
}

export async function getPortfolioBalance(apiKey: string, privateKey: string) {
  const data = await kalshiFetch('/portfolio/balance', apiKey, privateKey)
  const bal  = data.balance ?? data
  return {
    available_balance: (bal.available_balance ?? 0) / 100,
    portfolio_value:   (bal.portfolio_value   ?? 0) / 100,
  }
}

export async function getPositions(apiKey: string, privateKey: string) {
  const data = await kalshiFetch('/portfolio/positions', apiKey, privateKey, 'GET', { limit: '100' })
  return data.market_positions ?? data.positions ?? []
}

export async function getSettlements(apiKey: string, privateKey: string) {
  const data = await kalshiFetch('/portfolio/settlements', apiKey, privateKey, 'GET', { limit: '100' })
  return data.settlements ?? []
}
