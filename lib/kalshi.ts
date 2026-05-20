const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2'

async function kalshiFetch(path: string, apiKey: string, params?: Record<string, string>) {
  const url = new URL(`${KALSHI_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Kalshi ${res.status}: ${text.slice(0, 300)}`)
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
  const data = await kalshiFetch('/portfolio/positions', apiKey, { limit: '100' })
  return data.market_positions ?? data.positions ?? []
}

export async function getSettlements(apiKey: string) {
  const data = await kalshiFetch('/portfolio/settlements', apiKey, { limit: '100' })
  return data.settlements ?? []
}
