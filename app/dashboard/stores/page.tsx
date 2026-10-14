import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/get-profile'
import { redirect } from 'next/navigation'
import StoresClient from '@/components/dashboard/StoresClient'

export default async function StoresPage() {
  const { profile } = await getCurrentProfile()
  if (profile.role !== 'ceo' && profile.role !== 'manager') redirect('/dashboard')

  const supabase = await createClient()
  const { data: stores } = await supabase.from('stores').select('*').order('name')

  return <StoresClient stores={stores ?? []} />
}
