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

  if (!meta.kalshiApiKey || !meta.kalshiPrivateKey) {
    return NextResponse.json({ error: 'Kalshi API credentials not configured. Please complete setup.' }, { status: 400 })
  }
  if (!meta.githubPat || !meta.githubUsername) {
    return NextResponse.json({ error: 'GitHub not connected. Please complete setup.' }, { status: 400 })
  }

  const [owner, repo]   = meta.githubRepo.split('/')
  const decryptedPat    = safeDecrypt(meta.githubPat)
  const decryptedKeyId  = safeDecrypt(meta.kalshiApiKey)
  const decryptedPem    = safeDecrypt(meta.kalshiPrivateKey)

  try {
    await dispatchBotWorkflow(decryptedPat, owner, repo)
    const portfolio = await getPortfolioBalance(decryptedKeyId, decryptedPem)
    return NextResponse.json({
      ok: true,
      balance: portfolio.available_balance,
      portfolioValue: portfolio.portfolio_value,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
