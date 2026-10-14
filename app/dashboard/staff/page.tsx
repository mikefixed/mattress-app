import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/get-profile'
import StaffClient from '@/components/dashboard/StaffClient'

export default async function StaffPage() {
  const { profile } = await getCurrentProfile()
  const supabase = await createClient()
  const isCeo = profile.role === 'ceo'
  const canManage = isCeo || profile.role === 'manager'

  let staffQuery = supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (!isCeo) {
    staffQuery = staffQuery
      .or(`store_id.eq.${profile.store_id},store_id.is.null`)
      .neq('role', 'ceo')
  }
  const { data: staff } = await staffQuery

  const { data: stores } = canManage
    ? await supabase.from('stores').select('id, name').order('name')
    : { data: null }

  return (
    <StaffClient
      isCeo={isCeo}
      canManage={canManage}
      staff={staff ?? []}
      stores={stores ?? []}
      currentUserId={profile.id}
    />
  )
}
