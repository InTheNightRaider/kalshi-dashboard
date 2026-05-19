type Props = {
  currentBalance:  number
  startingBalance: number
  profitPct:       string
  winRate:         string
  totalTrades:     number
  wins:            number
  losses:          number
  totalPnl:        number
  loading:         boolean
}

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function StatsCards({ currentBalance, startingBalance, profitPct, winRate, totalTrades, wins, losses, totalPnl, loading }: Props) {
  const pnlPositive = totalPnl >= 0
  const profitPositive = parseFloat(profitPct) >= 0

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-3 bg-[#252c3a] rounded w-16 mb-3" />
            <div className="h-7 bg-[#252c3a] rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Current Balance"
        value={`$${currentBalance.toFixed(2)}`}
        sub={`Started at $${startingBalance.toFixed(2)}`}
        color="text-white"
      />
      <Card
        label="Total Profit"
        value={`${profitPositive ? '+' : ''}${profitPct}%`}
        sub={`$${Math.abs(totalPnl).toFixed(2)} ${pnlPositive ? 'gained' : 'lost'}`}
        color={profitPositive ? 'text-[#00d17a]' : 'text-[#ff4d6d]'}
      />
      <Card
        label="Win Rate"
        value={`${winRate}%`}
        sub={`${wins}W / ${losses}L`}
        color={parseFloat(winRate) >= 50 ? 'text-[#00d17a]' : 'text-[#f5c842]'}
      />
      <Card
        label="Total Trades"
        value={String(totalTrades)}
        sub={totalTrades === 0 ? 'No closed trades yet' : `${wins} wins, ${losses} losses`}
        color="text-[#4f8ef7]"
      />
    </div>
  )
}
