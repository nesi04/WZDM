import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'

export async function getRequiredAuthSession() {
  const session = await getServerSession()
  
  if (!session || !session.user) {
    redirect('/auth/signin')
  }
  
  return session
}

export async function getCurrentUser() {
  const session = await getServerSession()
  return session?.user
}
