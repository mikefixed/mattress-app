import { getCurrentProfile } from '@/lib/get-profile'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentProfile()

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--paper)' }}>
      <Sidebar role={profile.role} fullName={profile.full_name} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
