'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import BTCChart   from '@/components/BTCChart'
import StatsCards from '@/components/StatsCards'
import TradeTable from '@/components/TradeTable'
import Modal      from '@/components/Modal'

type BotStatus = 'idle' | 'running' | 'starting' | 'stopping'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [portfolio,   setPortfolio]   = useState<any>(null)
  const [positions,   setPositions]   = useState<any[]>([])
  const [settlements, setSettlements] = useState<any[]>([])
  const [botStatus,   setBotStatus]   = useState<BotStatus>('idle')
  const [modal,       setModal]       = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [setupDone,   setSetupDone]   = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const fetchAll = useCallback(async () => {
    try {
      const [portRes, posRes, settRes] = await Promise.all([
        fetch('/api/kalshi/portfolio'),
        fetch('/api/kalshi/positions'),
        fetch('/api/kalshi/settlements'),
      ])

      if (portRes.ok) {
        const p = await portRes.json()
        setPortfolio(p)
      } else {
        const err = await portRes.json()
        if (err.error?.includes('not configured')) setSetupDone(false)
      }

      if (posRes.ok)  setPositions((await posRes.json()).positions ?? [])
      if (settRes.ok) setSettlements((await settRes.json()).settlements ?? [])
    } catch {
      // network error — keep existing data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    pollRef.current = setInterval(fetchAll, 30_000)
    return () => clearInterval(pollRef.current)
  }, [fetchAll])

  const handleStart = async () => {
    setBotStatus('starting')
    try {
      const res = await fetch('/api/bot/start', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const bal = data.balance != null ? ` Portfolio: $${data.balance.toFixed(2)}.` : ''
      setModal({ type: 'success', message: `Bot started!${bal} Happy trading! 🎉` })
      setBotStatus('running')
      fetchAll()
    } catch (err: any) {
      setModal({ type: 'error', message: err.message || 'Failed to start bot.' })
      setBotStatus('idle')
    }
  }

  const handleStop = async () => {
    setBotStatus('stopping')
    try {
      const res = await fetch('/api/bot/stop', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal({ type: 'success', message: 'Bot stopped. No new trades will be placed.' })
      setBotStatus('idle')
    } catch (err: any) {
      setModal({ type: 'error', message: err.message || 'Failed to stop bot.' })
      setBotStatus('running')
    }
  }

  // Derived stats from settlements
  const settleWins   = settlements.filter(s => (s.revenue ?? 0) > ((s.no_cost ?? 0) + (s.yes_cost ?? 0))).length
  const settleLosses = settlements.length - settleWins
  const winRate = settlements.length > 0
    ? ((settleWins / settlements.length) * 100).toFixed(1)
    : '0.0'
  const totalPnl = settlements.reduce((sum, s) => {
    return sum + (s.revenue ?? 0) - (s.no_cost ?? 0) - (s.yes_cost ?? 0)
  }, 0) / 100

  const currentBalance  = portfolio?.available_balance ?? 0
  const startingBalance = 50 // default — will be replaced by actual when bot is running
  const profitPct = currentBalance > 0 && startingBalance > 0
    ? (((currentBalance - startingBalance) / startingBalance) * 100).toFixed(1)
    : '0.0'

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00d17a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusColor = {
    idle:     'text-gray-500',
    running:  'text-[#00d17a]',
    starting: 'text-[#f5c842]',
    stopping: 'text-[#ff4d6d]',
  }[botStatus]

  const statusLabel = {
    idle:     '○ IDLE',
    running:  '● LIVE',
    starting: '◌ STARTING',
    stopping: '◌ STOPPING',
  }[botStatus]

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Navbar */}
      <nav className="border-b border-[#252c3a] bg-[#111318]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#00d17a] rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0a0b0d]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
              </svg>
            </div>
            <span className="font-bold text-white text-sm">KalshiBot</span>
            <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-[#1e2330] ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchAll()} className="btn-secondary text-xs py-1.5 px-3">
              ↻ Refresh
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Setup warning */}
        {!setupDone && (
          <div className="bg-[#f5c842]/10 border border-[#f5c842]/30 rounded-xl px-5 py-4 flex items-center gap-3">
            <span className="text-[#f5c842] text-lg shrink-0">⚠</span>
            <div>
              <p className="text-[#f5c842] font-medium text-sm">Setup required</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Your Kalshi API key isn't configured.{' '}
                <a href="/setup" className="text-[#4f8ef7] hover:underline">Complete setup →</a>
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <StatsCards
          currentBalance={currentBalance}
          startingBalance={startingBalance}
          profitPct={profitPct}
          winRate={winRate}
          totalTrades={settlements.length}
          wins={settleWins}
          losses={settleLosses}
          totalPnl={totalPnl}
          loading={loading}
        />

        {/* Bot Controls */}
        <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">Bot Control</h3>
            <p className="text-gray-400 text-sm mt-0.5">
              {botStatus === 'running'
                ? 'The bot is actively trading on Kalshi markets.'
                : botStatus === 'starting'
                ? 'Connecting to GitHub and verifying Kalshi credentials...'
                : 'Start the bot to begin automated BTC/RSI trading.'}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={handleStart}
              disabled={botStatus !== 'idle' || !setupDone}
              className="btn-primary min-w-[130px]"
            >
              {botStatus === 'starting' ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0a0b0d] border-t-transparent rounded-full animate-spin" />
                  Starting...
                </>
              ) : '▶  Start Bot'}
            </button>
            <button
              onClick={handleStop}
              disabled={botStatus !== 'running'}
              className="btn-danger min-w-[110px]"
            >
              {botStatus === 'stopping' ? 'Stopping...' : '■  Stop Bot'}
            </button>
          </div>
        </div>

        {/* BTC Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">BTC / USD  <span className="text-gray-600 font-normal text-sm">— 15 min</span></h3>
            <span className="text-gray-500 text-xs">Live via TradingView</span>
          </div>
          <BTCChart />
        </div>

        {/* Open Positions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              Open Positions
              <span className="ml-2 badge-blue">{positions.length}</span>
            </h3>
            <span className="text-gray-500 text-xs">Refreshes every 30s</span>
          </div>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-gray-500 text-sm animate-pulse">Loading positions...</div>
          ) : positions.length === 0 ? (
            <div className="h-20 flex items-center justify-center text-gray-600 text-sm">No open positions right now.</div>
          ) : (
            <TradeTable trades={positions} type="open" />
          )}
        </div>

        {/* Trade History */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              Trade History
              <span className="ml-2 badge-yellow">{settlements.length}</span>
            </h3>
          </div>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-gray-500 text-sm animate-pulse">Loading history...</div>
          ) : settlements.length === 0 ? (
            <div className="h-20 flex items-center justify-center text-gray-600 text-sm">No completed trades yet — start the bot to begin.</div>
          ) : (
            <TradeTable trades={settlements} type="closed" />
          )}
        </div>

        <p className="text-center text-gray-700 text-xs pb-6">
          Past performance does not guarantee future results. Trading prediction markets involves risk of loss. Not financial advice.
        </p>
      </div>

      {modal && <Modal type={modal.type} message={modal.message} onClose={() => setModal(null)} />}
    </div>
  )
}
