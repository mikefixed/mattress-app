'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import type { Store } from '@/lib/types'
import { Plus, X, MapPin } from 'lucide-react'

export default function StoresClient({ stores }: { stores: Store[] }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div>
      <PageHeader
        title="Stores"
        subtitle="Every branch in the business."
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--ink)' }}
          >
            <Plus size={16} /> Add store
          </button>
        }
      />

      <div className="px-4 sm:px-8 pb-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>No stores yet. Add your first branch.</p>
        )}
        {stores.map((s) => (
          <div key={s.id} className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--gold-soft)' }}>
              <MapPin size={16} color="var(--gold)" />
            </div>
            <h3 className="font-display font-semibold" style={{ color: 'var(--ink)' }}>{s.name}</h3>
            {s.address && <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{s.address}</p>}
            {s.phone && <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>{s.phone}</p>}
          </div>
        ))}
      </div>

      {showAdd && <AddStoreModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddStoreModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('stores').insert({ name, address: address || null, phone: phone || null })
    setSaving(false)
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm rounded-xl p-6" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--ink)' }}>Add store</h3>
          <button onClick={onClose}><X size={18} color="var(--ink-soft)" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Store name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} placeholder="e.g. Wuse Branch" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
          </div>
          <button disabled={saving} type="submit" className="w-full mt-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--ink)' }}>
            {saving ? 'Saving…' : 'Add store'}
          </button>
        </form>
      </div>
    </div>
  )
}
