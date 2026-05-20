import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getLatestWorkflowRun, cancelWorkflowRun } from '@/lib/github'
import { safeDecrypt } from '@/lib/crypto'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const user  = await clerk.users.getUser(userId)
  const meta  = user.privateMetadata as Record<string, string>

  if (!meta.githubPat || !meta.githubUsername)
    return NextResponse.json({ error: 'GitHub not connected.' }, { status: 400 })

  const pat          = safeDecrypt(meta.githubPat)
  const [owner, repo] = (meta.githubRepo ?? '').split('/')

  try {
    const run = await getLatestWorkflowRun(pat, owner, repo)
    if (!run)
      return NextResponse.json({ ok: true, message: 'No active run found.' })
    if (run.status === 'completed')
      return NextResponse.json({ ok: true, message: 'Bot is already stopped.' })
    await cancelWorkflowRun(pat, owner, repo, run.id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
