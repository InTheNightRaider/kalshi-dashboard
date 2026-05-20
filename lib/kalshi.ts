import crypto from 'crypto'

const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2'

function signRequest(privateKeyPem: string, timestamp: number, method: string, path: string): string {
  // Normalize line endings — browsers may submit \r\n, PEM requires \n
  const key = privateKeyPem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  const msg = `${timestamp}${method.toUpperCase()}${path}`
  const sign = crypto.createSign('SHA256')
  sign.update(msg)
  sign.end()
  return sign.sign({ key, format: 'pem', type: 'pkcs1', padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }, 'base64')
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

  const ts        = Date.now()
  const signPath  = `/trade-api/v2${path}`
  const signature = signRequest(privateKey, ts, method, signPath)

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'KALSHI-ACCESS-KEY':       apiKey,
      'KALSHI-ACCESS-TIMESTAMP': ts.toString(),
      'KALSHI-ACCESS-SIGNATURE': signature,
      'Accept':                  'application/json',
      'Content-Type':            'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Kalshi ${res.status}: ${text.slice(0, 400)}`)
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
