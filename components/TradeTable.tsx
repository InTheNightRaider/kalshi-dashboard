type Props = {
  trades: any[]
  type: 'open' | 'closed'
}

function fmt(val: any, decimals = 2) {
  const n = parseFloat(val)
  return isNaN(n) ? '—' : `$${Math.abs(n / 100).toFixed(decimals)}`
}

function shortTicker(ticker: string) {
  if (!ticker) return '—'
  const parts = ticker.split('-')
  return parts.slice(0, 3).join('-')
}

export default function TradeTable({ trades, type }: Props) {
  if (type === 'open') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase border-b border-[#252c3a]">
              <th className="text-left py-2 pr-4 font-medium">Market</th>
              <th className="text-left py-2 pr-4 font-medium">Side</th>
              <th className="text-right py-2 pr-4 font-medium">Contracts</th>
              <th className="text-right py-2 pr-4 font-medium">Avg Price</th>
              <th className="text-right py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2330]">
            {trades.map((t, i) => (
              <tr key={i} className="hover:bg-[#1e2330]/50 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-mono text-xs text-white">{shortTicker(t.ticker)}</p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[180px]">{t.market_title ?? t.title ?? ''}</p>
                </td>
                <td className="py-3 pr-4">
                  <span className={t.side?.toLowerCase() === 'yes' ? 'badge-green' : 'badge-red'}>
                    {t.side?.toUpperCase() ?? '—'}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right font-mono text-white">{t.position ?? t.contracts ?? '—'}</td>
                <td className="py-3 pr-4 text-right font-mono text-gray-300">
                  {t.market_exposure_cents != null ? fmt(t.market_exposure_cents / (t.position || 1)) : '—'}
                </td>
                <td className="py-3 text-right font-mono text-white">
                  {t.market_exposure_cents != null ? fmt(t.market_exposure_cents) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Closed / settlements
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b border-[#252c3a]">
            <th className="text-left py-2 pr-4 font-medium">Market</th>
            <th className="text-left py-2 pr-4 font-medium">Result</th>
            <th className="text-right py-2 pr-4 font-medium">Revenue</th>
            <th className="text-right py-2 font-medium">P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e2330]">
          {trades.slice(0, 50).map((t, i) => {
            const revenue = (t.revenue ?? 0) / 100
            const cost    = ((t.no_cost ?? 0) + (t.yes_cost ?? 0)) / 100
            const pnl     = revenue - cost
            const won     = pnl > 0
            return (
              <tr key={i} className="hover:bg-[#1e2330]/50 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-mono text-xs text-white">{shortTicker(t.ticker)}</p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[200px]">{t.market_title ?? ''}</p>
                </td>
                <td className="py-3 pr-4">
                  <span className={won ? 'badge-green' : 'badge-red'}>{won ? 'WIN' : 'LOSS'}</span>
                </td>
                <td className="py-3 pr-4 text-right font-mono text-gray-300">${revenue.toFixed(2)}</td>
                <td className={`py-3 text-right font-mono font-medium ${won ? 'text-[#00d17a]' : 'text-[#ff4d6d]'}`}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {trades.length > 50 && (
        <p className="text-center text-xs text-gray-600 mt-3">Showing 50 of {trades.length} trades</p>
      )}
    </div>
  )
}
