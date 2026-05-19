import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getPositions } from '@/lib/kalshi'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerk = await clerkClient()
  const user  = await clerk.users.getUser(userId)
  const meta  = user.privateMetadata as Record<string, string>

  if (!meta.kalshiApiKey) {
    return NextResponse.json({ positions: [] })
  }

  try {
    const positions = await getPositions(meta.kalshiApiKey)
    return NextResponse.json({ positions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
