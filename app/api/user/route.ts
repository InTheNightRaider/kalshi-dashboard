import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getGitHubUser } from '@/lib/github'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const meta = (user.privateMetadata ?? {}) as Record<string, string>

  return NextResponse.json({
    kalshiKeySet:    !!meta.kalshiApiKey,
    githubConnected: !!meta.githubPat && !!meta.githubUsername,
    githubUsername:  meta.githubUsername ?? null,
    githubRepo:      meta.githubRepo ?? null,
  })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const clerk = await clerkClient()

  const update: Record<string, string> = {}

  if (body.kalshiApiKey) {
    update.kalshiApiKey = body.kalshiApiKey
  }

  if (body.githubPat) {
    // Validate the PAT
    try {
      const login = await getGitHubUser(body.githubPat)
      if (body.githubUsername && login.toLowerCase() !== body.githubUsername.toLowerCase()) {
        return NextResponse.json({
          error: `PAT belongs to GitHub user "${login}" but you entered "${body.githubUsername}". Use the correct username.`
        }, { status: 400 })
      }
      update.githubPat      = body.githubPat
      update.githubUsername = login
      update.githubRepo     = `${login}/KalshiTradingBot`
    } catch (err: any) {
      return NextResponse.json({ error: `GitHub validation failed: ${err.message}` }, { status: 400 })
    }
  }

  await clerk.users.updateUserMetadata(userId, { privateMetadata: update })
  return NextResponse.json({ ok: true })
}
