'use client'

import { useEffect, useState, useCallback } from 'react'

type Signal = 'UP' | 'DOWN' | null
type Mode4Status = 'green' | 'yellow' | 'gray'

interface ContractData {
  ticker:      string
  strike:      number
  dist:        number | null
  yesMid:      number
  noMid:       number
  volume:      number
  minutesIn:   number
  minutesLeft: number
  mode4Status: Mode4Status
}

interface ScanData {
  ts: string
  btcPrice: number | null
  rsi1m: number | null
  rsi5m: number | null
  signals: Record<string, Signal>
  confluenceDir: 'UP' | 'DOWN' | null
  confluenceScore: number
  totalTFs: number
  contract: ContractData | null
}

const TFS = ['1m','3m','5m','15m','30m','1h','4h']

function SignalPill({ tf, signal }: { tf: string; signal: Signal }) {
  const base = 'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold'
  if (signal === 'UP')
    return <span className={`${base} bg-[#00d17a]/15 text-[#00d17a] border border-[#00d17a]/30`}>
      <span className="text-[10px]">▲</span>{tf}
    </span>
  if (signal === 'DOWN')
    return <span className={`${base} bg-[#ff4d6d]/15 text-[#ff4d6d] border border-[#ff4d6d]/30`}>
      <span className="text-[10px]">▼</span>{tf}
    </span>
  return <span className={`${base} bg-[#1e2330] text-gray-500 border border-[#252c3a]`}>
    <span className="text-[10px]">—</span>{tf}
  </span>
}

function ConfluenceBar({ score, total, dir }: { score: number; total: number; dir: 'UP' | 'DOWN' | null }) {
  const pct = total > 0 ? (score / total) * 100 : 0
  const color = dir === 'UP' ? '#00d17a' : dir === 'DOWN' ? '#ff4d6d' : '#374151'
  const label = dir === 'UP' ? '▲ BULLISH' : dir === 'DOWN' ? '▼ BEARISH' : '— NEUTRAL'
  const labelColor = dir === 'UP' ? 'text-[#00d17a]' : dir === 'DOWN' ? 'text-[#ff4d6d]' : 'text-gray-500'
  const threshold = 4

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">Confluence</span>
        <span className={`text-xs font-semibold font-mono ${labelColor}`}>
          {score}/{total} {label}
        </span>
      </div>
      <div className="relative h-2 bg-[#1a1f2e] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {/* threshold marker at 4/7 */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[#f5c842]/60"
          style={{ left: `${(threshold / total) * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>0</span>
        <span className="text-[#f5c842]/70">entry threshold ({threshold}+)</span>
        <span>{total}</span>
      </div>
    </div>
  )
}

function ContractCard({ contract }: { contract: ContractData }) {
  const { ticker, strike, dist, yesMid, noMid, volume, minutesIn, minutesLeft, mode4Status } = contract

  const borderClass = {
    green:  'border-[#00d17a]/50 bg-[#00d17a]/5',
    yellow: 'border-[#f5c842]/50 bg-[#f5c842]/5',
    gray:   'border-[#252c3a] bg-[#0d1117]',
  }[mode4Status]

  const statusLabel = {
    green:  { dot: '●', text: 'ENTRY SIGNAL', color: 'text-[#00d17a]' },
    yellow: { dot: '◌', text: 'WATCHING',     color: 'text-[#f5c842]' },
    gray:   { dot: '○', text: 'IDLE',          color: 'text-gray-500'  },
  }[mode4Status]

  const distColor = dist === null ? 'text-gray-500'
    : Math.abs(dist) < 100 ? 'text-[#f5c842]'
    : dist > 0 ? 'text-[#00d17a]' : 'text-[#ff4d6d]'

  // Shorten ticker for display: KXBTCD-26MAY22-T77199 → T77,199
  const shortTicker = ticker.split('-T')[1]
    ? `$${Number(ticker.split('-T')[1]).toLocaleString()}`
    : ticker.slice(-8)

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${borderClass}`}>
      {/* Top row: strike + status badge */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-gray-400 text-[10px] uppercase tracking-wide">Current Contract</span>
          <div className="text-white font-mono font-semibold text-sm mt-0.5">
            Strike {shortTicker}
          </div>
        </div>
        <span className={`text-xs font-mono font-semibold ${statusLabel.color}`}>
          {statusLabel.dot} {statusLabel.text}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500 text-[10px] mb-0.5">BTC Distance</div>
          <div className={`font-mono font-semibold ${distColor}`}>
            {dist === null ? '—' : `${dist > 0 ? '+' : ''}${dist.toLocaleString()}`}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-[10px] mb-0.5">YES Mid</div>
          <div className={`font-mono font-semibold ${
            yesMid >= 0.90 && yesMid <= 0.96 ? 'text-[#00d17a]' : 'text-gray-300'
          }`}>
            {(yesMid * 100).toFixed(1)}¢
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-[10px] mb-0.5">NO Mid</div>
          <div className={`font-mono font-semibold ${
            noMid >= 0.90 && noMid <= 0.96 ? 'text-[#00d17a]' : 'text-gray-300'
          }`}>
            {(noMid * 100).toFixed(1)}¢
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-[10px] mb-0.5">Volume</div>
          <div className="font-mono font-semibold text-gray-300">
            {volume.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-[10px] mb-0.5">Min In</div>
          <div className={`font-mono font-semibold ${
            minutesIn >= 7 && minutesIn <= 12 ? 'text-[#00d17a]' : 'text-gray-400'
          }`}>
            {minutesIn.toFixed(1)}m
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-[10px] mb-0.5">Min Left</div>
          <div className={`font-mono font-semibold ${
            minutesLeft >= 3 && minutesLeft <= 8 ? 'text-[#00d17a]' : 'text-gray-400'
          }`}>
            {minutesLeft.toFixed(1)}m
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ScanSnapshot() {
  const [data, setData]       = useState<ScanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [age, setAge]         = useState(0)

  const fetchScan = useCallback(async () => {
    try {
      const res = await fetch('/api/scanner')
      if (res.ok) setData(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchScan()
    const poll = setInterval(fetchScan, 30_000)
    return () => clearInterval(poll)
  }, [fetchScan])

  // tick the "X seconds ago" counter
  useEffect(() => {
    const tick = setInterval(() => {
      if (!data?.ts) return
      setAge(Math.round((Date.now() - new Date(data.ts).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [data?.ts])

  const qualifies =
    data?.confluenceDir !== null && data !== null &&
    data.confluenceScore >= 4

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-