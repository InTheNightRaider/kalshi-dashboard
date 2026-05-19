import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { dispatchBotWorkflow, setRepoSecret } from '@/lib/github'
import { getPortfolioBalance } from '@/lib/kalshi'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const user  = await clerk.users.getUser(userId)
  const meta  = user.privateMetadata as Record<string, string>

  if (!meta.kalshiApiKey) {
    return NextResponse.json({ error: 'Kalshi API key not configured. Please complete setup.' }, { status: 400 })
  }
  if (!meta.githubPat || !meta.githubUsername) {
    return NextResponse.json({ error: 'GitHub not connected. Please complete setup.' }, { status: 400 })
  }

  const [owner, repo] = meta.githubRepo.split('/')

  try {
    // 1. Push Kalshi key as GitHub secret so the bot can use it
    try {
      await setRepoSecret(meta.githubPat, owner, repo, meta.kalshiApiKey)
    } catch (secretErr: any) {
      // Non-fatal — secret may already be set correctly
      console.warn('Secret push warning:', secretErr.message)
    }

    // 2. Trigger GitHub Actions workflow
    await dispatchBotWorkflow(meta.githubPat, owner, repo)

    // 3. Fetch live portfolio balance from Kalshi
    const portfolio = await getPortfolioBalance(meta.kalshiApiKey)

    return NextResponse.json({
      ok: true,
      balance: portfolio.available_balance,
      portfolioValue: portfolio.portfolio_value,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
