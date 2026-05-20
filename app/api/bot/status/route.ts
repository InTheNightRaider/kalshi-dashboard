import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getLatestWorkflowRun } from '@/lib/github'
import { safeDecrypt } from '@/lib/crypto'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const user  = await clerk.users.getUser(userId)
  const meta  = user.privateMetadata as Record<string, string>

  if (!meta.githubPat)
    return NextResponse.json({ running: false })

  const pat           = safeDecrypt(meta.githubPat)
  const [owner, repo] = (meta.githubRepo ?? '').split('/')

  try {
    const run     = await getLatestWorkflowRun(pat, owner, repo)
    const running = !!run && run.status !== 'completed'
    return NextResponse.json({ running, runId: run?.id ?? null, status: run?.status ?? null })
  } catch {
    return NextResponse.json({ running: false })
  }
}
