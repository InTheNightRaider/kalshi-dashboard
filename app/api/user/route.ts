import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkCsrf } from '@/lib/csrf'
import { getGitHubUser } from '@/lib/github'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const user  = await clerk.users.getUser(userId)
  const meta  = (user.privateMetadata ?? {}) as Record<string, string>

  // Separate flags for each piece — the dashboard reads them individually
  // so it can distinguish "missing key" vs "missing PEM" vs "no GitHub".
  return NextResponse.json({
    kalshiKeySet:    !!meta.kalshiApiKey,
    kalshiPemSet:    !!meta.kalshiPrivateKey,
    githubConnected: !!meta.githubPat && !!meta.githubUsername,
    githubUsername:  meta.githubUsername ?? null,
    githubRepo:      meta.githubRepo ?? null,
  })
}

export async function POST(request: Request) {
  const csrf = checkCsrf(request); if (csrf) return csrf

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body  = await request.json()
  const clerk = await clerkClient()
  const update: Record<string, string> = {}

  if (body.kalshiApiKey) {
    update.kalshiApiKey = encrypt(body.kalshiApiKey.trim())
  }

  if (body.kalshiPrivateKey) {
    update.kalshiPrivateKey = encrypt(body.kalshiPrivateKey.trim())
  }

  if (body.githubPat) {
    try {
      const login = await getGitHubUser(body.githubPat)
      update.githubPat      = encrypt(body.githubPat.trim())
      update.githubUsername = login
      update.githubRepo     = body.githubRepo ?? `${login}/KalshiTradingBot`
    } catch (err: any) {
      return NextResponse.json({ error: `GitHub validation failed: ${err.message}` }, { status: 400 })
    }
  }

  await clerk.users.updateUserMetadata(userId, { privateMetadata: update })
  return NextResponse.json({ ok: true })
}
