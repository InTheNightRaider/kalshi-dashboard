import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getGitHubUser } from '@/lib/github'
import { encrypt, safeDecrypt } from '@/lib/crypto'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const user  = await clerk.users.getUser(userId)
  const meta  = (user.privateMetadata ?? {}) as Record<string, string>

  // Never expose raw keys to the client — only return boolean flags
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

  const body  = await request.json()
  const clerk = await clerkClient()

  const update: Record<string, string> = {}

  if (body.kalshiApiKey) {
    // Encrypt before storing in Clerk
    update.kalshiApiKey = encrypt(body.kalshiApiKey.trim())
  }

  if (body.githubPat) {
    // Validate the PAT works before storing it
    try {
      const login = await getGitHubUser(body.githubPat)
      if (body.githubUsername && login.toLowerCase() !== body.githubUsername.toLowerCase()) {
        return NextResponse.json({
          error: `PAT belongs to GitHub user "${login}" but you entered "${body.githubUsername}". Use the correct username.`
        }, { status: 400 })
      }
      // Encrypt before storing
      update.githubPat      = encrypt(body.githubPat.trim())
      update.githubUsername = login           // username is not sensitive
      // Use repo select