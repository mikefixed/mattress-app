import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/lib/types'

export async function getCurrentProfile(): Promise<{ userId: string; profile: Profile }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const needsActivation =
    !profile || !profile.is_active || (profile.role !== 'ceo' && !profile.store_id)

  if (needsActivation) {
    // Signed up but not yet activated / assigned a store by the CEO.
    redirect('/pending')
  }

  return { userId: user.id, profile: profile as Profile }
}
