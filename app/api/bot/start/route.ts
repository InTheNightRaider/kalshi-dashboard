import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { dispatchBotWorkflow } from '@/lib/github'
import { getPortfolioBalance } from '@/lib/kalshi'
import { safeDecrypt } from '@/lib/crypto'

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
  const decryptedPat     = safeDecrypt(meta.githubPat)
  const decryptedApiKey  = safeDecrypt(meta.kalshiApiKey)

  try {
    // 1. Trigger GitHub Actions workflow dispatch
    await dispatchBotWorkflow(decryptedPat, owner, repo)

    // 2. Fetch live portfolio balance from Kalshi to confirm connection
    const portfolio = await getPortfolioBalance(decryptedApiKey)

    return NextResponse.json({
      ok: true,
      balance: portfolio.available_balance,
      portfolioValue: portfolio.portfolio_value,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
