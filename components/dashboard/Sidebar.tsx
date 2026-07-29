'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Store,
  LogOut,
  BedDouble,
} from 'lucide-react'
import type { Role } from '@/lib/types'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['ceo', 'manager', 'staff'] },
  { href: '/dashboard/sales', label: 'Sales', icon: ShoppingCart, roles: ['ceo', 'manager', 'staff'] },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, roles: ['ceo', 'manager', 'staff'] },
  { href: '/dashboard/staff', label: 'Staff', icon: Users, roles: ['ceo', 'manager'] },
  { href: '/dashboard/stores', label: 'Stores', icon: Store, roles: ['ceo'] },
]

export default function Sidebar({ role, fullName }: { role: Role; fullName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const items = NAV.filter((item) => item.roles.includes(role))

  return (
    <aside
      className="w-60 shrink-0 h-screen sticky top-0 flex flex-col text-white"
      style={{ background: 'var(--ink)' }}
    >
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--gold)' }}>
          <BedDouble size={16} color="var(--ink)" />
        </div>
        <span className="font-display text-sm font-semibold leading-tight">
          Amina Abubakar<br />Mattress Stores
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                background: active ? 'var(--gold)' : 'transparent',
                color: active ? 'var(--ink)' : 'rgba(255,255,255,0.75)',
                fontWeight: active ? 600 : 500,
              }}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 mb-3">
          <p className="text-sm font-medium truncate">{fullName}</p>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{role}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
