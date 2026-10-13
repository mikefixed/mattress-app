'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import type { Store } from '@/lib/types'
import { Plus, X, MapPin, Trash2, Search, Pencil } from 'lucide-react' // Added Pencil icon

export default function StoresClient({ stores }: { stores: Store[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null)
  const [editTarget, setEditTarget] = useState<Store | null>(null) // Added state for Edit
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => stores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [stores, search]
  )

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

      {stores.length > 4 && (
        <div className="px-4 sm:px-8 mb-5">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--ink-soft)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores..."
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
            />
          </div>
        </div>
      )}

      <div className="px-4 sm:px-8 pb-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>No stores match.</p>
        )}
        {filtered.map((s) => (
          <div key={s.id} className="rounded-xl border p-5 relative" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            
            {/* Edit and Delete Buttons */}
            <div className="absolute top-4 right-4 flex gap-1">
              <button
                onClick={() => setEditTarget(s)}
                className="p-1.5 rounded-md hover:bg-black/5"
                title="Edit store"
              >
                <Pencil size={15} color="var(--ink-soft)" />
              </button>
              <button
                onClick={() => setDeleteTarget(s)}
                className="p-1.5 rounded-md hover:bg-black/5"
                title="Delete store"
              >
                <Trash2 size={15} color="var(--danger)" />
              </button>
            </div>

            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--gold-soft)' }}>
              <MapPin size={16} color="var(--gold)" />
            </div>
            <h3 className="font-display font-semibold pr-16" style={{ color: 'var(--ink)' }}>{s.name}</h3>
            {s.address && <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{s.address}</p>}
            {s.phone && <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>{s.phone}</p>}
          </div>
        ))}
      </div>

      {showAdd && <AddStoreModal onClose={() => setShowAdd(false)} />}
      {editTarget && <EditStoreModal store={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && <DeleteStoreModal store={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  )
}

// New Edit Store Modal
function EditStoreModal({ store, onClose }: { store: Store; onClose: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [name, setName] = useState(store.name || '')
  const [address, setAddress] = useState(store.address || '')
  const [phone, setPhone] = useState(store.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    const { error } = await supabase
      .from('stores')
      .update({ name, address: address || null, phone: phone || null })
      .eq('id', store.id)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm rounded-xl p-6" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--ink)' }}>Edit store</h3>
          <button onClick={onClose}><X size={18} color="var(--ink-soft)" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Store name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
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
          {error && (
            <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</div>
          )}
          <button disabled={saving} type="submit" className="w-full mt-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--ink)' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
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

function DeleteStoreModal({ store, onClose }: { store: Store; onClose: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canDelete = confirmText.trim().toLowerCase() === store.name.trim().toLowerCase()

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error } = await supabase.from('stores').delete().eq('id', store.id)
    setDeleting(false)
    if (error) { setError(error.message); return }
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm rounded-xl p-6" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--danger)' }}>Delete {store.name}?</h3>
          <button onClick={onClose}><X size={18} color="var(--ink-soft)" /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
          This permanently deletes this store along with every product, sale, and stock record tied to it.
          This cannot be undone. Staff assigned to this store will become unassigned.
        </p>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>
          Type <span className="font-medium" style={{ color: 'var(--ink)' }}>{store.name}</span> to confirm
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm mb-4"
          style={{ borderColor: 'var(--line)' }}
        />
        {error && (
          <div className="text-sm rounded-lg px-3.5 py-2.5 mb-4" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</div>
        )}
        <button
          disabled={!canDelete || deleting}
          onClick={handleDelete}
          className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-40"
          style={{ background: 'var(--danger)' }}
        >
          {deleting ? 'Deleting…' : 'Delete store permanently'}
        </button>
      </div>
    </div>
  )
}
