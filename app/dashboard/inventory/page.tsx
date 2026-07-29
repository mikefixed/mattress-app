import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/get-profile'
import InventoryClient from '@/components/dashboard/InventoryClient'

export default async function InventoryPage() {
  const { profile } = await getCurrentProfile()
  const supabase = await createClient()
  const isCeo = profile.role === 'ceo'

  const { data: stores } = isCeo
    ? await supabase.from('stores').select('id, name').order('name')
    : { data: null }

  return (
    <InventoryClient
      role={profile.role}
      myStoreId={profile.store_id}
      stores={stores ?? []}
    />
  )
}
