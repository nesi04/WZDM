import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { db } from '@/lib/db'

export async function getAuthedUser() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return null

  const user = await db.user.findUnique({ where: { email } })
  return user ?? null
}

