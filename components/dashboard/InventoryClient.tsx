'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import type { Product, Role } from '@/lib/types'
import { Plus, PackagePlus, X, Search, ArrowUpDown, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

type Movement = {
  id: string
  type: string
  quantity: number
  note: string | null
  created_at: string
  stores?: { name: string }
  products?: { name: string }
  profiles?: { full_name: string }
}

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
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'selling_price'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showAdd, setShowAdd] = useState(false)
  const [restockTarget, setRestockTarget] = useState<Product | null>(null)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let pQuery = supabase.from('products').select('*').order('name')
    let mQuery = supabase
      .from('inventory_movements')
      .select('*, stores:store_id(name), products:product_id(name), profiles:created_by(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (storeId) { pQuery = pQuery.eq('store_id', storeId); mQuery = mQuery.eq('store_id', storeId) }
    const [{ data: p }, { data: m }] = await Promise.all([pQuery, mQuery])
    setProducts((p as Product[]) ?? [])
    setMovements((m as unknown as Movement[]) ?? [])
    setLoading(false)
  }, [storeId, supabase])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[],
    [products]
  )

  const filtered = useMemo(() => {
    let rows = products.filter((p) => {
      if (!`${p.name} ${p.sku ?? ''} ${p.category ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (stockFilter === 'low' && !(p.quantity > 0 && p.quantity <= p.reorder_level)) return false
      if (stockFilter === 'out' && p.quantity > 0) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      const va = a[sortBy]
      const vb = b[sortBy]
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [products, search, categoryFilter, stockFilter, sortBy, sortDir])

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`

  async function handleDeleteMovement(movementId: string) {
    if (window.confirm('Delete this log entry? Note: This will NOT automatically adjust the current product stock.')) {
      await supabase.from('inventory_movements').delete().eq('id', movementId)
      load()
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={isCeo ? 'Stock across every store' : 'Stock at your store'}
        action={
          canEditProducts && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--ink)' }}
            >
              <Plus size={16} /> Add product
            </button>
          )
        }
      />

      <div className="px-4 sm:px-8 flex flex-wrap items-center gap-3 mb-5">
        {isCeo && (
          <select
            value={storeId ?? ''}
            onChange={(e) => setStoreId(e.target.value || null)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
          >
            <option value="">All stores</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          <option value="all">All stock levels</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
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

      <div className="px-4 sm:px-8 pb-6">
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--line)' }}>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" style={{ color: 'var(--ink-soft)' }} onClick={() => toggleSort('name')}>
                  <span className="inline-flex items-center gap-1">Product <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Category</th>
                <th className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Size</th>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" style={{ color: 'var(--ink-soft)' }} onClick={() => toggleSort('selling_price')}>
                  <span className="inline-flex items-center gap-1">Price <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" style={{ color: 'var(--ink-soft)' }} onClick={() => toggleSort('quantity')}>
                  <span className="inline-flex items-center gap-1">Stock <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-5 py-3 font-medium text-right" style={{ color: 'var(--ink-soft)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>No products match these filters.</td></tr>
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
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {canEditProducts && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setRestockTarget(p)}
                              className="text-xs font-medium flex items-center gap-1"
                              style={{ color: 'var(--gold)' }}
                            >
                              <PackagePlus size={14} /> Restock
                            </button>
                            <button
                              onClick={() => setEditTarget(p)}
                              className="p-1 rounded-md hover:bg-black/5"
                              title="Edit product"
                            >
                              <Pencil size={14} color="var(--ink-soft)" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1 rounded-md hover:bg-black/5"
                              title="Delete product"
                            >
                              <Trash2 size={14} color="var(--danger)" />
                            </button>
                          </div>
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
      </div>

      <div className="px-4 sm:px-8 pb-8">
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
            <h2 className="font-display font-semibold text-sm" style={{ color: 'var(--ink)' }}>Recent stock movements</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--line)' }}>
                {['Date', ...(isCeo ? ['Store'] : []), 'Product', 'Type', 'Change', 'Note', 'By', ''].map((h, i) => (
                  <th key={i} className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={isCeo ? 8 : 7} className="px-5 py-8 text-center" style={{ color: 'var(--ink-soft)' }}>No stock movements yet.</td></tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                    <td className="px-5 py-3 whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>{format(new Date(m.created_at), 'd MMM, h:mm a')}</td>
                    {isCeo && <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{m.stores?.name ?? '—'}</td>}
                    <td className="px-5 py-3" style={{ color: 'var(--ink)' }}>{m.products?.name ?? '—'}</td>
                    <td className="px-5 py-3 capitalize" style={{ color: 'var(--ink-soft)' }}>{m.type}</td>
                    <td className="px-5 py-3 font-mono-num font-medium" style={{ color: m.quantity >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{m.note ?? '—'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{m.profiles?.full_name ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteMovement(m.id)}
                        className="p-1 rounded-md hover:bg-black/5"
                        title="Delete log"
                      >
                        <Trash2 size={14} color="var(--danger)" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddProductModal
          isCeo={isCeo}
          defaultStoreId={storeId}
          stores={stores}
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
      {editTarget && (
        <EditProductModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load() }}
        />
      )}
      {deleteTarget && (
        <DeleteProductModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSaved={() => { setDeleteTarget(null); load() }}
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

function EditProductModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: product.name || '',
    sku: product.sku || '',
    category: product.category || '',
    size: product.size || '',
    cost_price: String(product.cost_price ?? ''),
    selling_price: String(product.selling_price ?? ''),
    quantity: String(product.quantity ?? 0),
    reorder_level: String(product.reorder_level ?? 5),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const oldQty = product.quantity
    const newQty = Number(form.quantity) || 0
    const qtyDiff = newQty - oldQty

    const { error: updateErr } = await supabase.from('products').update({
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      size: form.size || null,
      cost_price: Number(form.cost_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      quantity: newQty,
      reorder_level: Number(form.reorder_level) || 5,
    }).eq('id', product.id)

    if (updateErr) {
      setError(updateErr.message)
      setSaving(false)
      return
    }

    // If they changed the quantity manually, log it so the history reflects the change
    if (qtyDiff !== 0) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('inventory_movements').insert({
        store_id: product.store_id,
        product_id: product.id,
        type: 'adjustment',
        quantity: qtyDiff,
        note: 'Manual edit via product update',
        created_by: user?.id,
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <ModalShell title={`Edit — ${product.name}`} onClose={onClose}>
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
          <Field label="Current stock" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} required />
          <Field label="Reorder level" type="number" value={form.reorder_level} onChange={(v) => setForm({ ...form, reorder_level: v })} />
        </div>
        {error && (
          <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</div>
        )}
        <button disabled={saving} type="submit" className="w-full mt-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--ink)' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </ModalShell>
  )
}

function DeleteProductModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <ModalShell title={`Delete ${product.name}?`} onClose={onClose}>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        This permanently deletes this product and all its stock movement history. This cannot be undone.
      </p>
      {error && (
        <div className="text-sm rounded-lg px-3.5 py-2.5 mb-4" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</div>
      )}
      <button
        disabled={saving}
        onClick={handleDelete}
        className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-40"
        style={{ background: 'var(--danger)' }}
      >
        {saving ? 'Deleting…' : 'Delete product permanently'}
      </button>
    </ModalShell>
  )
}

function AddProductModal({ isCeo, defaultStoreId, stores, onClose, onSaved }: {
  isCeo: boolean; defaultStoreId: string | null; stores: { id: string; name: string }[]
  onClose: () => void; onSaved: () => void
}) {
  const supabase = createClient()
  const [productStoreId, setProductStoreId] = useState(defaultStoreId ?? '')
  const [form, setForm] = useState({ name: '', sku: '', category: '', size: '', cost_price: '', selling_price: '', quantity: '', reorder_level: '5' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!productStoreId) { setError('Choose a store first.'); return }
    setSaving(true)
    setError(null)
    const qty = Number(form.quantity) || 0

    const { data: product, error: insertErr } = await supabase.from('products').insert({
      store_id: productStoreId,
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      size: form.size || null,
      cost_price: Number(form.cost_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      quantity: qty,
      reorder_level: Number(form.reorder_level) || 5,
    }).select().single()

    if (insertErr || !product) {
      setError(insertErr?.message ?? 'Could not save product.')
      setSaving(false)
      return
    }

    if (qty > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('inventory_movements').insert({
        store_id: productStoreId,
        product_id: product.id,
        type: 'adjustment',
        quantity: qty,
        note: 'Initial stock',
        created_by: user?.id,
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <ModalShell title="Add product" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {isCeo && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Store</label>
            <select
              required
              value={productStoreId}
              onChange={(e) => setProductStoreId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--line)' }}
            >
              <option value="">Select a store…</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
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
        {error && (
          <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</div>
        )}
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
