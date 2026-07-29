import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/get-profile'
import SalesClient from '@/components/dashboard/SalesClient'

export default async function SalesPage() {
  const { profile } = await getCurrentProfile()
  const supabase = await createClient()
  const isCeo = profile.role === 'ceo'

  const { data: stores } = isCeo
    ? await supabase.from('stores').select('id, name').order('name')
    : { data: null }

  return (
    <SalesClient
      role={profile.role}
      myStoreId={profile.store_id}
      myId={profile.id}
      stores={stores ?? []}
    />
  )
}
