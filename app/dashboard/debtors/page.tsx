import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/get-profile'
import { redirect } from 'next/navigation'
import DebtorsClient from '@/components/dashboard/DebtorsClient'

export default async function DebtorsPage() {
  const { profile } = await getCurrentProfile()
  if (profile.role === 'staff') redirect('/dashboard')

  const supabase = await createClient()
  const isCeo = profile.role === 'ceo'

  const { data: stores } = isCeo
    ? await supabase.from('stores').select('id, name').order('name')
    : { data: null }

  return <DebtorsClient isCeo={isCeo} myStoreId={profile.store_id} myId={profile.id} stores={stores ?? []} />
}
