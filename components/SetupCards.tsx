'use client'

import { useState } from 'react'

type Props = {
  kalshiKeySet:    boolean
  githubConnected: boolean
  onKalshiSaved:  () => void
  onGitHubSaved:  () => void
}

function KalshiCard({ onSaved }: { onSaved: () => void }) {
  const [key, setKey]       = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kalshiApiKey: key.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      onSaved()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="card border-[#f5c842]/30 bg-[#f5c842]/5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 bg-[#f5c842]/10 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#f5c842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-white">Connect your Kalshi account</h3>
          <p className="text-gray-400 text-sm mt-0.5">
            Get your API key at{' '}
            <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer"
               className="text-[#4f8ef7] hover:underline">
              kalshi.com → Settings → API
            </a>
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="password"
          placeholder="Paste your Kalshi API key..."
          value={key}
          onChange={e => setKey(e.target.value)}
          required
          className="input flex-1 font-mono text-xs"
        />
        <button type="submit" disabled={saving || !key.trim()} className="btn-primary shrink-0">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#0a0b0d] border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : 'Connect'}
        </button>
      </form>
      {error && <p className="text-[#ff4d6d] text-xs mt-2">{error}</p>}
    </div>
  )
}

type Repo = { id: number; name: string; full_name: string; fork: boolean; private: boolean; suggested: boolean; description: string | null }

function GitHubCard({ onSaved }: { onSaved: () => void }) {
  const [pat, setPat]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [repos, setRepos]       = useState<Repo[]>([])
  const [login, setLogin]       = useState('')
  const [selected, setSelected] = useState<Repo | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [filter, setFilter]     = useState('')

  const fetchRepos = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pat.trim()) return
    setLoading(true); setError(''); setRepos([]); setSelected(null)
    try {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pat: pat.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLogin(data.login)
      setRepos(data.repos)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubPat:      pat.trim(),
          githubUsername: login,
          githubRepo:     selected.full_name,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      onSaved()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(filter.toLowerCase())
  )
  const suggested = filtered.filter(r => r.suggested)
  const rest      = filtered.filter(r => !r.suggested)

  return (
    <div className="card border-[#4f8ef7]/30 bg-[#4f8ef7]/5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 bg-[#4f8ef7]/10 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#4f8ef7]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-white">Connect your GitHub</h3>
          <p className="text-gray-400 text-sm mt-0.5">
            First{' '}
            <a href="https://github.com/InTheNightRaider/KalshiTradingBot/fork"
               target="_blank" rel="noopener noreferrer" className="text-[#4f8ef7] hover:underline">
              fork the bot repo
            </a>
            {', then '}
            <a href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=KalshiBot"
               target="_blank" rel="noopener noreferrer" className="text-[#4f8ef7] hover:underline">
              create a PAT
            </a>
            {' with repo + workflow scopes.'}
          </p>
        </div>
      </div>

      {/* PAT input */}
      {repos.length === 0 ? (
        <form onSubmit={fetchRepos} className="flex gap-2">
          <input
            type="password"
            placeholder="Paste your GitHub Personal Access Token (ghp_...)"
            value={pat}
            onChange={e => setPat(e.target.value)}
            required
            className="input flex-1 font-mono text-xs"
          />
          <button type="submit" disabled={loading || !pat.trim()} className="btn-primary shrink-0">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#0a0b0d] border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : 'Load repos →'}
          </button>
        </form>
      ) : (
        /* Repo picker */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#00d17a] font-mono">@{login}</span>
            <span className="text-gray-500 text-xs">— select your forked bot repo:</span>
            <button onClick={() => { setRepos([]); setSelected(null) }}
                    className="ml-auto text-xs text-gray-600 hover:text-gray-400">
              ← Change PAT
            </button>
          </div>

          {/* Filter */}
          <input
            type="text"
            placeholder="Filter repos..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="input text-sm"
          />

          {/* Repo list */}
          <div className="max-h-52 overflow-y-auto rounded-lg border border-[#252c3a] divide-y divide-[#1e2330]">
            {suggested.length > 0 && (
              <div className="px-3 py-1.5 bg-[#00d17a]/5">
                <span className="text-[10px] text-[#00d17a] uppercase tracking-wider font-medium">Suggested</span>
              </div>
            )}
            {[...suggested, ...(suggested.length > 0 && rest.length > 0 ? [null] : []), ...rest].map((r, i) => {
              if (r === null) return (
                <div key="divider" className="px-3 py-1.5 bg-[#111318]">
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider">All repos</span>
                </div>
              )
              const isSelected = selected?.id === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors
                    ${isSelected ? 'bg-[#4f8ef7]/10' : 'hover:bg-[#1e2330]'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                    ${isSelected ? 'border-[#4f8ef7] bg-[#4f8ef7]' : 'border-[#252c3a]'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-mono truncate">{r.name}</p>
                    {r.fork && <span className="text-[10px] text-gray-500">forked repo</span>}
                    {r.private && <span className="text-[10px] text-gray-500 ml-2">private</span>}
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No repos match "{filter}"</div>
            )}
          </div>

          {/* Confirm */}
          {selected && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 bg-[#1e2330] rounded-lg px-3 py-2 text-xs font-mono text-gray-300 truncate">
                {selected.full_name}
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary shrink-0">
                {saving ? 'Saving...' : 'Use this repo →'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[#ff4d6d] text-xs mt-2">{error}</p>}
    </div>
  )
}

export default function SetupCards({ kalshiKeySet, githubConnected, onKalshiSaved, onGitHubSaved }: Props) {
  if (kalshiKeySet && githubConnected) return null

  return (
    <div className="space-y-3">
      {!kalshiKeySet    && <KalshiCard onSaved={onKalshiSaved} />}
      {!githubConnected && <GitHubCard onSaved={onGitHubSaved} />}
    </div>
  )
}
