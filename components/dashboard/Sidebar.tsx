'use client'

import Link from 'next/link'
import Image from 'next/image' // Added for the logo
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Store,
  LogOut,
  Menu,
  X,
  HandCoins,
} from 'lucide-react'
import type { Role } from '@/lib/types'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['ceo', 'manager', 'staff'] },
  { href: '/dashboard/sales', label: 'Sales', icon: ShoppingCart, roles: ['ceo', 'manager', 'staff'] },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, roles: ['ceo', 'manager', 'staff'] },
  { href: '/dashboard/debtors', label: 'Debtors', icon: HandCoins, roles: ['ceo', 'manager'] },
  { href: '/dashboard/staff', label: 'Staff', icon: Users, roles: ['ceo', 'manager'] },
  { href: '/dashboard/stores', label: 'Stores', icon: Store, roles: ['ceo'] },
]

export default function Sidebar({ role, fullName }: { role: Role; fullName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const items = NAV.filter((item) => item.roles.includes(role))

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {items.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  )

  const AccountFooter = () => (
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
  )

  // A reusable Logo component to keep the code clean
  const Logo = ({ size = 32 }: { size?: number }) => (
    <div className="rounded-lg overflow-hidden shrink-0" style={{ width: size, height: size, background: 'var(--gold)' }}>
      <Image 
        src="/logo.png" 
        alt="Naanah Amins Ventures Logo" 
        width={size} 
        height={size} 
        className="object-cover w-full h-full"
      />
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 text-white"
        style={{ background: 'var(--ink)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Logo size={28} />
          <span className="font-display text-sm font-semibold truncate">Naanah Amins Ventures</span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-1.5 -mr-1.5">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-64 max-w-[80vw] h-full flex flex-col text-white" style={{ background: 'var(--ink)' }}>
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/10">
              <span className="font-display text-sm font-semibold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <AccountFooter />
          </div>
        </div>
      )}

      {/* Desktop rail */}
      <aside
        className="hidden lg:flex w-60 shrink-0 h-screen sticky top-0 flex-col text-white"
        style={{ background: 'var(--ink)' }}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <Logo size={32} />
          <span className="font-display text-sm font-semibold leading-tight">
            Naanah Amins<br />Ventures
          </span>
        </div>
        
        {/* Address and Contact Info */}
        <div className="px-5 py-3 border-b border-white/10 text-xs text-white/60 leading-relaxed">
          <p>No 30, Nnamdi Azikiwe Bypass</p>
          <p>Kurmin Mashi, Kaduna</p>
          <p className="mt-1 text-white/80">09121212766, 08061677979</p>
          <p className="mt-1 text-white/80">naanahaminsventures@gmail.com</p>
        </div>

        <NavLinks />
        <AccountFooter />
      </aside>
    </>
  )
}
