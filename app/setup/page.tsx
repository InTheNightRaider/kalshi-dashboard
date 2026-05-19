'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

type Step = 1 | 2 | 3

export default function SetupPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [step, setStep]             = useState<Step>(1)
  const [kalshiKey, setKalshiKey]   = useState('')
  const [githubPat, setGithubPat]   = useState('')
  const [githubUser, setGithubUser] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [checking, setChecking]     = useState(true)

  // Check if already configured
  useEffect(() => {
    if (!isLoaded) return
    fetch('/api/user')
      .then(r => r.json())
      .then(data => {
        if (data.kalshiKeySet && data.githubConnected) {
          router.replace('/dashboard')
        } else if (data.kalshiKeySet) {
          setStep(2)
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [isLoaded, router])

  const handleSaveKalshi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kalshiKey.trim()) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kalshiApiKey: kalshiKey.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveGitHub = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!githubPat.trim() || !githubUser.trim()) return
    setSaving(true); setError('')
    try {
      // Validate the PAT by fetching user's repos
      const repoName = 'KalshiTradingBot'
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubPat:      githubPat.trim(),
          githubUsername: githubUser.trim(),
          githubRepo:     `${githubUser.trim()}/${repoName}`,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00d17a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#00d17a] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0a0b0d]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-white">KalshiBot</span>
          </div>
          <h1 className="text-2xl font-bold text-white">One-time setup</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your accounts to start trading — takes 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step > s  ? 'bg-[#00d17a] text-[#0a0b0d]' :
                  step === s ? 'bg-[#4f8ef7] text-white ring-4 ring-[#4f8ef7]/20' :
                  'bg-[#252c3a] text-gray-500'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`flex-1 h-px mx-2 ${step > s ? 'bg-[#00d17a]' : 'bg-[#252c3a]'}`} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Kalshi API Key ── */}
        {step === 1 && (
          <div className="card">
            <h2 className="font-semibold text-white text-lg mb-1">Step 1 — Kalshi API Key</h2>
            <p className="text-gray-400 text-sm mb-5">
              Get your key at{' '}
              <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer" className="text-[#4f8ef7] hover:underline">
                kalshi.com → Settings → API
              </a>
            </p>
            <form onSubmit={handleSaveKalshi} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">API Key</label>
                <input
                  type="password"
                  placeholder="Paste your Kalshi API key..."
                  value={kalshiKey}
                  onChange={e => setKalshiKey(e.target.value)}
                  required
                  className="input font-mono"
                />
              </div>
              {error && <div className="bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-lg px-3 py-2 text-sm text-[#ff4d6d]">{error}</div>}
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Saving...' : 'Save API Key → Continue'}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: GitHub ── */}
        {step === 2 && (
          <div className="card">
            <h2 className="font-semibold text-white text-lg mb-1">Step 2 — Connect GitHub</h2>
            <div className="bg-[#1e2330] rounded-lg p-4 mb-5 space-y-2.5">
              <p className="text-sm text-gray-300 font-medium">First, fork the bot repo:</p>
              {[
                <>Go to <a href="https://github.com/InTheNightRaider/KalshiTradingBot" target="_blank" rel="noopener noreferrer" className="text-[#4f8ef7] hover:underline">github.com/InTheNightRaider/KalshiTradingBot</a></>,
                <>Click <strong className="text-white">Fork</strong> → <strong className="text-white">Create fork</strong></>,
                <>Then enter your GitHub info below</>,
              ].map((item, i) => (
                <div key={i} className="flex gap-2.5 text-sm text-gray-400">
                  <span className="w-5 h-5 bg-[#252c3a] rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">{i+1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSaveGitHub} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Your GitHub Username</label>
                <input
                  type="text"
                  placeholder="e.g. johndoe"
                  value={githubUser}
                  onChange={e => setGithubUser(e.target.value)}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">
                  GitHub Personal Access Token{' '}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=KalshiBot"
                    target="_blank" rel="noopener noreferrer"
                    className="text-[#4f8ef7] hover:underline normal-case"
                  >
                    (create one here →)
                  </a>
                </label>
                <input
                  type="password"
                  placeholder="ghp_..."
                  value={githubPat}
                  onChange={e => setGithubPat(e.target.value)}
                  required
                  className="input font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Needs <code className="text-[#f5c842]">repo</code> and <code className="text-[#f5c842]">workflow</code> scopes. We auto-push your Kalshi key as a GitHub Secret so the bot can trade.</p>
              </div>
              {error && <div className="bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-lg px-3 py-2 text-sm text-[#ff4d6d]">{error}</div>}
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Connecting...' : 'Connect GitHub → Continue'}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="card text-center py-10">
            <div className="w-16 h-16 bg-[#00d17a]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#00d17a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">You're all set!</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
              Kalshi key saved and GitHub connected. Your bot is ready to trade.
            </p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary">
              Go to Dashboard →
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          Your API keys are stored securely and never shared.
        </p>
      </div>
    </div>
  )
}
