'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import type { Profile } from '@/lib/types'
import { ShieldCheck, ShieldOff, Search } from 'lucide-react'

export default function StaffClient({
  isCeo,
  staff,
  stores,
  currentUserId,
}: {
  isCeo: boolean
  staff: Profile[]
  stores: { id: string; name: string }[]
  currentUserId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  async function updateProfile(id: string, patch: Partial<Profile>) {
    setSaving(id)
    await supabase.from('profiles').update(patch).eq('id', id)
    setSaving(null)
    router.refresh()
  }

  const storeName = (id: string | null) => stores.find((s) => s.id === id)?.name ?? '—'

  const filtered = useMemo(() => {
    return staff.filter((p) => {
      if (search && !p.full_name.toLowerCase().includes(search.toLowerCase())) return false
      if (roleFilter !== 'all' && p.role !== roleFilter) return false
      if (statusFilter === 'active' && !p.is_active) return false
      if (statusFilter === 'pending' && p.is_active) return false
      return true
    })
  }, [staff, search, roleFilter, statusFilter])

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={
          isCeo
            ? 'Activate accounts, assign roles and stores, and manage access.'
            : 'Staff at your store.'
        }
      />

      <div className="px-4 sm:px-8 flex flex-wrap items-center gap-3 mb-5">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <option value="all">All roles</option>
          <option value="ceo">CEO</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--ink-soft)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
          />
        </div>
      </div>

      <div className="px-4 sm:px-8 pb-8">
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--line)' }}>
                {['Name', 'Role', 'Store', 'Status', isCeo ? 'Actions' : ''].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>No staff match these filters.</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                    <td className="px-5 py-3">
                      <p className="font-medium" style={{ color: 'var(--ink)' }}>
                        {p.full_name}{p.id === currentUserId ? ' (you)' : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {isCeo && p.id !== currentUserId ? (
                        <select
                          value={p.role}
                          onChange={(e) => updateProfile(p.id, { role: e.target.value as Profile['role'] })}
                          className="rounded-md border px-2 py-1 text-xs"
                          style={{ borderColor: 'var(--line)' }}
                        >
                          <option value="staff">staff</option>
                          <option value="manager">manager</option>
                          <option value="ceo">ceo</option>
                        </select>
                      ) : (
                        <span className="text-xs uppercase font-medium" style={{ color: 'var(--gold)' }}>{p.role}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isCeo && p.id !== currentUserId && p.role !== 'ceo' ? (
                        <select
                          value={p.store_id ?? ''}
                          onChange={(e) => updateProfile(p.id, { store_id: e.target.value || null })}
                          className="rounded-md border px-2 py-1 text-xs"
                          style={{ borderColor: 'var(--line)' }}
                        >
                          <option value="">Unassigned</option>
                          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      ) : (
                        <span style={{ color: 'var(--ink-soft)' }}>{storeName(p.store_id)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-md"
                        style={{
                          background: p.is_active ? 'var(--success-soft)' : 'var(--danger-soft)',
                          color: p.is_active ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {p.is_active ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {isCeo && p.id !== currentUserId && (
                        <button
                          disabled={saving === p.id || (!p.is_active && !p.store_id && p.role !== 'ceo')}
                          onClick={() => updateProfile(p.id, { is_active: !p.is_active })}
                          className="flex items-center gap-1.5 text-xs font-medium disabled:opacity-40"
                          style={{ color: p.is_active ? 'var(--danger)' : 'var(--success)' }}
                          title={!p.is_active && !p.store_id && p.role !== 'ceo' ? 'Assign a store first' : ''}
                        >
                          {p.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  )
}
