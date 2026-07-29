'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import type { Product, Role } from '@/lib/types'
import { Plus, PackagePlus, X, Search } from 'lucide-react'

export default function InventoryClient({
  role,
  myStoreId,
  stores,
}: {
  role: Role
  myStoreId: string | null
  stores: { id: string; name: string }[]
}) {
  const supabase = createClient()
  const isCeo = role === 'ceo'
  const canEditProducts = role === 'ceo' || role === 'manager'

  const [storeId, setStoreId] = useState<string | null>(myStoreId)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [restockTarget, setRestockTarget] = useState<Product | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('products').select('*').order('name')
    if (storeId) query = query.eq('store_id', storeId)
    const { data } = await query
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [storeId, supabase])

  useEffect(() => {
    load()
  }, [load])

  const filtered = products.filter((p) =>
    `${p.name} ${p.sku ?? ''} ${p.category ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={isCeo ? 'Stock across every store' : 'Stock at your store'}
        action={
          canEditProducts &&
          (storeId || isCeo) && (
            <button
              onClick={() => setShowAdd(true)}
              disabled={isCeo && !storeId}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ background: 'var(--ink)' }}
            >
              <Plus size={16} /> Add product
            </button>
          )
        }
      />

      <div className="px-8 flex flex-wrap items-center gap-3 mb-5">
        {isCeo && (
          <select
            value={storeId ?? ''}
            onChange={(e) => setStoreId(e.target.value || null)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
          >
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--ink-soft)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
          />
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--line)' }}>
                {['Product', 'Category', 'Size', 'Price', 'Stock', ''].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>No products found.</td></tr>
              ) : (
                filtered.map((p) => {
                  const low = p.quantity <= p.reorder_level
                  return (
                    <tr key={p.id} className="border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                      <td className="px-5 py-3">
                        <p className="font-medium" style={{ color: 'var(--ink)' }}>{p.name}</p>
                        {p.sku && <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{p.sku}</p>}
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{p.category ?? '—'}</td>
                      <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{p.size ?? '—'}</td>
                      <td className="px-5 py-3 font-mono-num" style={{ color: 'var(--ink)' }}>{naira(p.selling_price)}</td>
                      <td className="px-5 py-3">
                        <span
                          className="font-mono-num px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{
                            background: low ? 'var(--danger-soft)' : 'var(--success-soft)',
                            color: low ? 'var(--danger)' : 'var(--success)',
                          }}
                        >
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {canEditProducts && (
                          <button
                            onClick={() => setRestockTarget(p)}
                            className="text-xs font-medium flex items-center gap-1 ml-auto"
                            style={{ color: 'var(--gold)' }}
                          >
                            <PackagePlus size={14} /> Restock
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddProductModal
          storeId={storeId!}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
      {restockTarget && (
        <RestockModal
          product={restockTarget}
          onClose={() => setRestockTarget(null)}
          onSaved={() => { setRestockTarget(null); load() }}
        />
      )}
    </div>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md rounded-xl p-6" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--ink)' }}>{title}</h3>
          <button onClick={onClose}><X size={18} color="var(--ink-soft)" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AddProductModal({ storeId, onClose, onSaved }: { storeId: string; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ name: '', sku: '', category: '', size: '', cost_price: '', selling_price: '', quantity: '', reorder_level: '5' })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('products').insert({
      store_id: storeId,
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      size: form.size || null,
      cost_price: Number(form.cost_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      quantity: Number(form.quantity) || 0,
      reorder_level: Number(form.reorder_level) || 5,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <ModalShell title="Add product" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Product name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
          <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Foam, Spring…" />
        </div>
        <Field label="Size" value={form.size} onChange={(v) => setForm({ ...form, size: v })} placeholder="6x6, 4.5x6…" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cost price (₦)" type="number" value={form.cost_price} onChange={(v) => setForm({ ...form, cost_price: v })} />
          <Field label="Selling price (₦)" type="number" value={form.selling_price} onChange={(v) => setForm({ ...form, selling_price: v })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starting stock" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} required />
          <Field label="Reorder level" type="number" value={form.reorder_level} onChange={(v) => setForm({ ...form, reorder_level: v })} />
        </div>
        <button disabled={saving} type="submit" className="w-full mt-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--ink)' }}>
          {saving ? 'Saving…' : 'Add product'}
        </button>
      </form>
    </ModalShell>
  )
}

function RestockModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(qty)
    if (!amount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('products').update({ quantity: product.quantity + amount }).eq('id', product.id)
    await supabase.from('inventory_movements').insert({
      store_id: product.store_id,
      product_id: product.id,
      type: 'restock',
      quantity: amount,
      note: note || null,
      created_by: user?.id,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <ModalShell title={`Restock — ${product.name}`} onClose={onClose}>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        Current stock: <span className="font-mono-num font-medium">{product.quantity}</span>
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Quantity to add" type="number" value={qty} onChange={setQty} required />
        <Field label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. New delivery from factory" />
        <button disabled={saving} type="submit" className="w-full mt-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--ink)' }}>
          {saving ? 'Saving…' : 'Add stock'}
        </button>
      </form>
    </ModalShell>
  )
}

function Field({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: 'var(--line)' }}
      />
    </div>
  )
}
