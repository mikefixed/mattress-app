'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import type { Product, Role, Sale } from '@/lib/types'
import { Plus, X, Trash2, Search, Download, Pencil, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { createPortal } from 'react-dom'

type CartLine = { product: Product; quantity: number }
type SaleRow = Sale & { discount_percent?: number | null; profiles?: { full_name: string }; stores?: { name: string } }

export default function SalesClient({
  role,
  myStoreId,
  myId,
  stores,
}: {
  role: Role
  myStoreId: string | null
  myId: string
  stores: { id: string; name: string }[]
}) {
  const supabase = createClient()
  const isCeo = role === 'ceo'

  const [storeId, setStoreId] = useState<string | null>(myStoreId)
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editTarget, setEditTarget] = useState<SaleRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SaleRow | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)

  // filters
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'total_amount'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select('*, profiles:sold_by(full_name), stores:store_id(name)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (storeId) query = query.eq('store_id', storeId)
    const { data } = await query
    setSales((data as unknown as SaleRow[]) ?? [])
    setLoading(false)
  }, [storeId, supabase])

  useEffect(() => { load() }, [load])

  const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`

  const filtered = useMemo(() => {
    let rows = sales.filter((s) => {
      if (paymentFilter !== 'all' && s.payment_method !== paymentFilter) return false
      if (search && !`${s.customer_name ?? ''} ${s.customer_phone ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      if (dateFrom && new Date(s.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(s.created_at) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      const va = sortBy === 'total_amount' ? a.total_amount : new Date(a.created_at).getTime()
      const vb = sortBy === 'total_amount' ? b.total_amount : new Date(b.created_at).getTime()
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return rows
  }, [sales, paymentFilter, search, dateFrom, dateTo, sortBy, sortDir])

  function toggleSort(col: 'created_at' | 'total_amount') {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  function exportCsv() {
    const header = ['Date', 'Store', 'Customer', 'Phone', 'Sold by', 'Payment', 'Total', 'Discount %', 'Paid', 'Balance']
    const rows = filtered.map((s) => [
      format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
      s.stores?.name ?? '',
      s.customer_name ?? '',
      s.customer_phone ?? '',
      s.profiles?.full_name ?? '',
      s.payment_method,
      s.total_amount,
      Number(s.discount_percent) || 0,
      s.amount_paid,
      Number(s.total_amount) - Number(s.amount_paid),
    ])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle={isCeo ? 'Transactions across every store' : 'Record and review sales'}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium border"
              style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
            >
              <Download size={15} /> Export
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--ink)' }}
            >
              <Plus size={16} /> Record sale
            </button>
          </div>
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
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          <option value="all">All payment types</option>
          <option value="cash">Cash</option>
          <option value="transfer">Transfer</option>
          <option value="pos">POS</option>
          <option value="credit">Credit</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }} />
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }} />
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--ink-soft)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer..."
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
          />
        </div>
      </div>

      <div className="px-4 sm:px-8 pb-8">
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--line)' }}>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" style={{ color: 'var(--ink-soft)' }} onClick={() => toggleSort('created_at')}>
                  Date {sortBy === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                {isCeo && <th className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Store</th>}
                <th className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Customer</th>
                <th className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Sold by</th>
                <th className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Payment</th>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" style={{ color: 'var(--ink-soft)' }} onClick={() => toggleSort('total_amount')}>
                  Total {sortBy === 'total_amount' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-5 py-3 font-medium text-right" style={{ color: 'var(--ink-soft)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isCeo ? 7 : 6} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isCeo ? 7 : 6} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>No sales match these filters.</td></tr>
              ) : (
                filtered.map((s) => {
                  const balance = Number(s.total_amount) - Number(s.amount_paid)
                  return (
                    <tr key={s.id} className="border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                      <td className="px-5 py-3 whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>{format(new Date(s.created_at), 'd MMM, h:mm a')}</td>
                      {isCeo && <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{s.stores?.name ?? '—'}</td>}
                      <td className="px-5 py-3" style={{ color: 'var(--ink)' }}>{s.customer_name || '—'}</td>
                      <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{s.profiles?.full_name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className="capitalize px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{
                            background: s.payment_method === 'credit' && balance > 0 ? 'var(--danger-soft)' : 'var(--success-soft)',
                            color: s.payment_method === 'credit' && balance > 0 ? 'var(--danger)' : 'var(--success)',
                          }}>
                          {s.payment_method}{s.payment_method === 'credit' && balance > 0 ? ` · ${naira(balance)} owed` : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono-num font-medium" style={{ color: 'var(--ink)' }}>{naira(s.total_amount)}{Number(s.discount_percent) > 0 && (
                        <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: 'var(--gold-soft)', color: 'var(--ink)' }}>
                          −{Number(s.discount_percent)}%
                        </span>
                      )}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setReceiptId(s.id)} className="flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-black/5 text-xs font-medium" style={{ color: 'var(--ink)' }} title="View / print receipt">
                            <Printer size={14} color="var(--ink-soft)" /> Receipt
                          </button>
                          <button onClick={() => setEditTarget(s)} className="p-1 rounded-md hover:bg-black/5" title="Edit sale">
                            <Pencil size={14} color="var(--ink-soft)" />
                          </button>
                          <button onClick={() => setDeleteTarget(s)} className="p-1 rounded-md hover:bg-black/5" title="Delete sale">
                            <Trash2 size={14} color="var(--danger)" />
                          </button>
                        </div>
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

      {showNew && (
        <NewSaleModal
          isCeo={isCeo}
          defaultStoreId={storeId}
          stores={stores}
          soldBy={myId}
          onClose={() => setShowNew(false)}
          onSaved={(saleId) => { setShowNew(false); load(); setReceiptId(saleId) }}
        />
      )}
      {editTarget && (
        <EditSaleModal
          sale={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load() }}
        />
      )}
      {deleteTarget && (
        <DeleteSaleModal
          sale={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSaved={() => { setDeleteTarget(null); load() }}
        />
      )}
      {receiptId && (
        <ReceiptModal saleId={receiptId} onClose={() => setReceiptId(null)} />
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

function EditSaleModal({ sale, onClose, onSaved }: { sale: SaleRow; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [customerName, setCustomerName] = useState(sale.customer_name || '')
  const [customerPhone, setCustomerPhone] = useState(sale.customer_phone || '')
  // FIX: Added <string> to useState to fix the Vercel TypeScript build error
  const [paymentMethod, setPaymentMethod] = useState<string>(sale.payment_method || 'cash')
  const [totalAmount, setTotalAmount] = useState(String(sale.total_amount))
  const [amountPaid, setAmountPaid] = useState(String(sale.amount_paid))
  const [discount, setDiscount] = useState(String(Number(sale.discount_percent) || 0))
  const [itemsSubtotal, setItemsSubtotal] = useState(0)

  useEffect(() => {
    supabase.from('sale_items').select('subtotal').eq('sale_id', sale.id).then(({ data }) => {
      const rows = (data as { subtotal: number }[] | null) ?? []
      setItemsSubtotal(rows.reduce((sum, r) => sum + Number(r.subtotal), 0))
    })
  }, [sale.id, supabase])

  // Changing the discount recalculates the total from the items on this sale
  function changeDiscount(value: string) {
    setDiscount(value)
    const pct = Math.min(100, Math.max(0, Number(value) || 0))
    if (itemsSubtotal > 0) {
      const newTotal = Math.round(itemsSubtotal * (100 - pct)) / 100
      setTotalAmount(String(newTotal))
      if (paymentMethod !== 'credit') setAmountPaid(String(newTotal))
    }
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('sales').update({
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      payment_method: paymentMethod,
      total_amount: Number(totalAmount) || 0,
      amount_paid: Number(amountPaid) || 0,
      ...(Math.min(100, Math.max(0, Number(discount) || 0)) !== (Number(sale.discount_percent) || 0)
        ? { discount_percent: Math.min(100, Math.max(0, Number(discount) || 0)) }
        : {}),
    }).eq('id', sale.id)

    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <ModalShell title={`Edit Sale — ${format(new Date(sale.created_at), 'd MMM, h:mm a')}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Customer name</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Customer phone</label>
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Payment method</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }}>
            <option value="cash">Cash</option>
            <option value="transfer">Bank transfer</option>
            <option value="pos">POS</option>
            <option value="credit">Credit (pay later)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Discount (%)</label>
          <input type="number" min={0} max={100} step="0.01" value={discount} onChange={(e) => changeDiscount(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
          {itemsSubtotal > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
              Items total before discount: ₦{itemsSubtotal.toLocaleString('en-NG')}. Changing the discount updates the total below.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Total Amount (₦)</label>
            <input type="number" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Amount Paid (₦)</label>
            <input type="number" required value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
          </div>
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

function DeleteSaleModal({ sale, onClose, onSaved }: { sale: SaleRow; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error } = await supabase.from('sales').delete().eq('id', sale.id)
    setDeleting(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <ModalShell title="Delete Sale?" onClose={onClose}>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        This will permanently delete this sales record. 
        <br/><br/>
        <span className="font-medium" style={{ color: 'var(--danger)' }}>Note:</span> Deleting this sale does NOT automatically return the sold items to your inventory. You may need to manually restock the items from the Inventory page.
      </p>
      {error && (
        <div className="text-sm rounded-lg px-3.5 py-2.5 mb-4" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</div>
      )}
      <button
        disabled={deleting}
        onClick={handleDelete}
        className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-40"
        style={{ background: 'var(--danger)' }}
      >
        {deleting ? 'Deleting…' : 'Delete sale permanently'}
      </button>
    </ModalShell>
  )
}

function NewSaleModal({ isCeo, defaultStoreId, stores, soldBy, onClose, onSaved }: {
  isCeo: boolean; defaultStoreId: string | null; stores: { id: string; name: string }[]
  soldBy: string; onClose: () => void; onSaved: (saleId: string) => void
}) {
  const supabase = createClient()
  const [saleStoreId, setSaleStoreId] = useState<string>(defaultStoreId ?? '')
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discount, setDiscount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!saleStoreId) { setProducts([]); return }
    supabase.from('products').select('*').eq('store_id', saleStoreId).order('name').then(({ data }) => {
      setProducts((data as Product[]) ?? [])
    })
    setCart([])
  }, [saleStoreId, supabase])

  function addLine(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        return prev.map((l) => l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) => prev.map((l) => l.product.id === productId ? { ...l, quantity: qty } : l))
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId))
  }

  const money2 = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const subtotal = cart.reduce((sum, l) => sum + l.quantity * Number(l.product.selling_price), 0)
  const discountPct = Math.min(100, Math.max(0, Number(discount) || 0))
  const discountAmount = Math.round(subtotal * discountPct) / 100
  const total = Math.round((subtotal - discountAmount) * 100) / 100

  async function submit() {
    setError(null)
    if (!saleStoreId) { setError('Choose a store first.'); return }
    if (cart.length === 0) { setError('Add at least one product.'); return }
    for (const line of cart) {
      if (line.quantity > line.product.quantity) {
        setError(`Not enough stock for ${line.product.name} (only ${line.product.quantity} left).`)
        return
      }
    }
    setSaving(true)

    const amountPaid = paymentMethod === 'credit' ? 0 : total

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        store_id: saleStoreId,
        sold_by: soldBy,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        payment_method: paymentMethod,
        total_amount: total,
        amount_paid: amountPaid,
        ...(discountPct > 0 ? { discount_percent: discountPct } : {}),
      })
      .select()
      .single()

    if (saleErr || !sale) {
      setError(saleErr?.message ?? 'Could not save sale.')
      setSaving(false)
      return
    }

    await supabase.from('sale_items').insert(
      cart.map((l) => ({
        sale_id: sale.id,
        product_id: l.product.id,
        quantity: l.quantity,
        unit_price: l.product.selling_price,
        subtotal: l.quantity * Number(l.product.selling_price),
      }))
    )

    for (const line of cart) {
      await supabase.from('products').update({ quantity: line.product.quantity - line.quantity }).eq('id', line.product.id)
      await supabase.from('inventory_movements').insert({
        store_id: saleStoreId,
        product_id: line.product.id,
        type: 'sale',
        quantity: -line.quantity,
        created_by: soldBy,
      })
    }

    setSaving(false)
    onSaved(sale.id)
  }

  const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl p-6" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--ink)' }}>Record sale</h3>
          <button onClick={onClose}><X size={18} color="var(--ink-soft)" /></button>
        </div>

        {isCeo && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Store</label>
            <select
              value={saleStoreId}
              onChange={(e) => setSaleStoreId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--line)' }}
            >
              <option value="">Select a store…</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <input placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
          <input placeholder="Customer phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
        </div>

        {saleStoreId && (
          <>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>Tap a product to add it</p>
            <div className="flex flex-wrap gap-2 mb-5 max-h-32 overflow-y-auto">
              {products.length === 0 && <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>No products at this store yet.</p>}
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addLine(p)}
                  disabled={p.quantity <= 0}
                  className="text-xs px-3 py-1.5 rounded-full border disabled:opacity-40"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                >
                  {p.name} · {naira(p.selling_price)}
                </button>
              ))}
            </div>
          </>
        )}

        {cart.length > 0 && (
          <div className="border rounded-lg divide-y mb-5" style={{ borderColor: 'var(--line)' }}>
            {cart.map((l) => (
              <div key={l.product.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1" style={{ color: 'var(--ink)' }}>{l.product.name}</span>
                <input
                  type="number"
                  min={1}
                  max={l.product.quantity}
                  value={l.quantity}
                  onChange={(e) => setQty(l.product.id, Number(e.target.value))}
                  className="w-16 rounded-md border px-2 py-1 text-center font-mono-num"
                  style={{ borderColor: 'var(--line)' }}
                />
                <span className="font-mono-num w-24 text-right" style={{ color: 'var(--ink)' }}>
                  {naira(l.quantity * Number(l.product.selling_price))}
                </span>
                <button onClick={() => removeLine(l.product.id)}><Trash2 size={14} color="var(--danger)" /></button>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="flex items-center justify-between gap-3 mb-3">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>Discount (%) — leave empty for none</label>
            <input
              type="number" min={0} max={100} step="0.01" placeholder="0"
              value={discount} onChange={(e) => setDiscount(e.target.value)}
              className="w-24 rounded-lg border px-3 py-2 text-sm text-right font-mono-num" style={{ borderColor: 'var(--line)' }}
            />
          </div>
        )}
        {cart.length > 0 && discountPct > 0 && (
          <div className="text-sm mb-3 space-y-1" style={{ color: 'var(--ink-soft)' }}>
            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono-num">{money2(subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount ({discountPct}%)</span><span className="font-mono-num">−{money2(discountAmount)}</span></div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }}>
            <option value="cash">Cash</option>
            <option value="transfer">Bank transfer</option>
            <option value="pos">POS</option>
            <option value="credit">Credit (pay later)</option>
          </select>
          <span className="font-display text-xl font-semibold" style={{ color: 'var(--ink)' }}>{naira(total)}</span>
        </div>

        {paymentMethod === 'credit' && (
          <div className="text-sm rounded-lg px-3.5 py-2.5 mb-4" style={{ background: 'var(--gold-soft)', color: 'var(--ink)' }}>
            This sale will be recorded as an outstanding debt of {naira(total)} for {customerName || 'this customer'}.
            Track and settle it later from the Debtors page.
          </div>
        )}

        {error && (
          <div className="text-sm rounded-lg px-3.5 py-2.5 mb-4" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--ink)' }}
        >
          {saving ? 'Saving…' : 'Complete sale'}
        </button>
      </div>
    </div>
  )
}

// ───────────────────────── Receipt ─────────────────────────
// Business details shown at the top of every receipt. Edit these lines to change them.
const BUSINESS = {
  name: 'Naanah Amins Ventures',
  address: ['No 30, Nnamdi Azikiwe Bypass', 'Kurmin Mashi, Kaduna'],
  phones: '09121212766, 08061677979',
  email: 'naanahaminsventures@gmail.com',
}

type ReceiptItem = {
  quantity: number
  unit_price: number
  subtotal: number
  products: { name: string; sku: string | null; size: string | null } | null
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  transfer: 'Bank transfer',
  pos: 'POS',
  credit: 'Credit (pay later)',
}

function ReceiptModal({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const [supabase] = useState(() => createClient())
  const [mounted, setMounted] = useState(false)
  const [sale, setSale] = useState<SaleRow | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [itemsError, setItemsError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const { data: s, error: saleErr } = await supabase
        .from('sales')
        .select('*, profiles:sold_by(full_name), stores:store_id(name)')
        .eq('id', saleId)
        .single()
      const { data: it, error: itemsErr } = await supabase
        .from('sale_items')
        .select('quantity, unit_price, subtotal, products(name, sku, size)')
        .eq('sale_id', saleId)
      if (cancelled) return
      if (saleErr || !s) {
        setError(saleErr?.message ?? 'Could not load this sale.')
        setLoading(false)
        return
      }
      setSale(s as unknown as SaleRow)
      if (itemsErr) setItemsError(itemsErr.message)
      setItems((it as unknown as ReceiptItem[]) ?? [])
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [saleId, supabase])

  const money = (n: number) =>
    `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (!mounted) return null

  const total = sale ? Number(sale.total_amount) : 0
  const paid = sale ? Number(sale.amount_paid) : 0
  const balance = total - paid
  const itemsSubtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0)
  const discountPct = sale ? Number(sale.discount_percent) || 0 : 0
  const discountAmt = Math.max(0, itemsSubtotal - total)
  const receiptNo = sale
    ? `RCT-${format(new Date(sale.created_at), 'yyMMdd')}-${sale.id.slice(0, 6).toUpperCase()}`
    : ''

  const printCss = `
    @media print {
      body > *:not(#receipt-root) { display: none !important; }
      #receipt-root { position: static !important; background: none !important; overflow: visible !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .receipt-sheet { border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; max-width: none !important; }
    }
    @page { margin: 8mm; }
  `

  return createPortal(
    <div id="receipt-root" className="fixed inset-0 z-[60] bg-black/40 overflow-y-auto p-4">
      <style>{printCss}</style>
      <div className="mx-auto w-full max-w-sm">
        <div className="no-print flex items-center justify-between mb-3">
          <button
            onClick={() => window.print()}
            disabled={loading || !sale}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--ink)' }}
          >
            <Printer size={16} /> Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-medium bg-white"
            style={{ color: '#111' }}
          >
            <X size={16} /> Close
          </button>
        </div>

        <div className="receipt-sheet rounded-xl p-5 text-sm" style={{ background: '#fff', color: '#111' }}>
          {loading ? (
            <p className="py-10 text-center" style={{ color: '#555' }}>Loading receipt…</p>
          ) : error || !sale ? (
            <p className="py-10 text-center" style={{ color: '#b00020' }}>{error ?? 'Could not load this sale.'}</p>
          ) : (
            <>
              <div className="text-center mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" width={44} height={44} style={{ margin: '0 auto 6px', borderRadius: 8 }} />
                <p style={{ fontWeight: 700, fontSize: 16 }}>{BUSINESS.name}</p>
                {BUSINESS.address.map((l) => <p key={l} style={{ fontSize: 12, color: '#444' }}>{l}</p>)}
                <p style={{ fontSize: 12, color: '#444' }}>{BUSINESS.phones}</p>
                <p style={{ fontSize: 12, color: '#444' }}>{BUSINESS.email}</p>
              </div>

              <div style={{ borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '8px 0', fontSize: 12 }}>
                <p style={{ textAlign: 'center', fontWeight: 700, letterSpacing: 1 }}>SALES RECEIPT</p>
                <div className="flex justify-between"><span>Receipt no.</span><span>{receiptNo}</span></div>
                <div className="flex justify-between"><span>Date</span><span>{format(new Date(sale.created_at), 'd MMM yyyy, h:mm a')}</span></div>
                <div className="flex justify-between"><span>Store</span><span>{sale.stores?.name ?? '—'}</span></div>
                <div className="flex justify-between"><span>Served by</span><span>{sale.profiles?.full_name ?? '—'}</span></div>
                <div className="flex justify-between"><span>Customer</span><span>{sale.customer_name || 'Walk-in customer'}</span></div>
                {sale.customer_phone && (
                  <div className="flex justify-between"><span>Phone</span><span>{sale.customer_phone}</span></div>
                )}
              </div>

              <table className="w-full mt-3" style={{ fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                    <th style={{ paddingBottom: 4 }}>Item</th>
                    <th style={{ paddingBottom: 4, textAlign: 'center' }}>Qty</th>
                    <th style={{ paddingBottom: 4, textAlign: 'right' }}>Price</th>
                    <th style={{ paddingBottom: 4, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '8px 0', color: '#555' }}>
                        {itemsError ? `Item details unavailable: ${itemsError}` : 'No item details were saved for this sale.'}
                      </td>
                    </tr>
                  ) : (
                    items.map((i, idx) => {
                      const p = i.products
                      const label = p ? (p.sku || [p.name, p.size].filter(Boolean).join(' ')) : 'Item no longer in stock list'
                      return (
                        <tr key={idx} style={{ verticalAlign: 'top', borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '4px 4px 4px 0' }}>{label}</td>
                          <td style={{ padding: '4px 0', textAlign: 'center' }}>{i.quantity}</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>{money(i.unit_price)}</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>{money(i.subtotal)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed #999', marginTop: 8, paddingTop: 8, fontSize: 12 }}>
                {discountPct > 0 && discountAmt > 0 && (
                  <>
                    <div className="flex justify-between"><span>Subtotal</span><span>{money(itemsSubtotal)}</span></div>
                    <div className="flex justify-between" style={{ marginBottom: 4 }}><span>Discount ({discountPct}%)</span><span>−{money(discountAmt)}</span></div>
                  </>
                )}
                <div className="flex justify-between" style={{ fontSize: 15, fontWeight: 700 }}>
                  <span>TOTAL</span><span>{money(total)}</span>
                </div>
                <div className="flex justify-between mt-1"><span>Payment method</span><span>{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</span></div>
                <div className="flex justify-between"><span>Amount paid</span><span>{money(paid)}</span></div>
                {balance > 0 ? (
                  <div className="flex justify-between" style={{ fontWeight: 700, color: '#b00020' }}>
                    <span>Balance owed</span><span>{money(balance)}</span>
                  </div>
                ) : (
                  <p style={{ textAlign: 'right', fontWeight: 700, marginTop: 2 }}>PAID IN FULL</p>
                )}
              </div>

              <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12 }}>Thank you for your patronage!</p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
