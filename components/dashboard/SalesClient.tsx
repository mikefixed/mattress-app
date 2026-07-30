'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import type { Product, Role, Sale } from '@/lib/types'
import { Plus, X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

type CartLine = { product: Product; quantity: number }

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
  const [sales, setSales] = useState<(Sale & { profiles?: { full_name: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select('*, profiles:sold_by(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (storeId) query = query.eq('store_id', storeId)
    const { data } = await query
    setSales((data as unknown as (Sale & { profiles?: { full_name: string } })[]) ?? [])
    setLoading(false)
  }, [storeId, supabase])

  useEffect(() => { load() }, [load])

  const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`
  const canRecordSale = storeId || !isCeo

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle={isCeo ? 'Transactions across every store' : 'Record and review sales'}
        action={
          canRecordSale && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--ink)' }}
            >
              <Plus size={16} /> Record sale
            </button>
          )
        }
      />

      <div className="px-4 sm:px-8 mb-5">
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
      </div>

      <div className="px-4 sm:px-8 pb-8">
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--line)' }}>
                {['Date', 'Customer', 'Sold by', 'Payment', 'Total'].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>Loading…</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>No sales recorded yet.</td></tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                    <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{format(new Date(s.created_at), 'd MMM, h:mm a')}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--ink)' }}>{s.customer_name || '—'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{s.profiles?.full_name ?? '—'}</td>
                    <td className="px-5 py-3 capitalize" style={{ color: 'var(--ink-soft)' }}>{s.payment_method}</td>
                    <td className="px-5 py-3 font-mono-num font-medium" style={{ color: 'var(--ink)' }}>{naira(s.total_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {showNew && (
        <NewSaleModal
          storeId={storeId!}
          soldBy={myId}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }}
        />
      )}
    </div>
  )
}

function NewSaleModal({ storeId, soldBy, onClose, onSaved }: {
  storeId: string; soldBy: string; onClose: () => void; onSaved: () => void
}) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('products').select('*').eq('store_id', storeId).order('name').then(({ data }) => {
      setProducts((data as Product[]) ?? [])
    })
  }, [storeId, supabase])

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

  const total = cart.reduce((sum, l) => sum + l.quantity * Number(l.product.selling_price), 0)

  async function submit() {
    setError(null)
    if (cart.length === 0) { setError('Add at least one product.'); return }
    for (const line of cart) {
      if (line.quantity > line.product.quantity) {
        setError(`Not enough stock for ${line.product.name} (only ${line.product.quantity} left).`)
        return
      }
    }
    setSaving(true)

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        store_id: storeId,
        sold_by: soldBy,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        payment_method: paymentMethod,
        total_amount: total,
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
        store_id: storeId,
        product_id: line.product.id,
        type: 'sale',
        quantity: -line.quantity,
        created_by: soldBy,
      })
    }

    setSaving(false)
    onSaved()
  }

  const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl p-6" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--ink)' }}>Record sale</h3>
          <button onClick={onClose}><X size={18} color="var(--ink-soft)" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <input placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
          <input placeholder="Customer phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
        </div>

        <p className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>Tap a product to add it</p>
        <div className="flex flex-wrap gap-2 mb-5 max-h-32 overflow-y-auto">
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

        <div className="flex items-center justify-between mb-5">
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }}>
            <option value="cash">Cash</option>
            <option value="transfer">Bank transfer</option>
            <option value="pos">POS</option>
            <option value="credit">Credit</option>
          </select>
          <span className="font-display text-xl font-semibold" style={{ color: 'var(--ink)' }}>{naira(total)}</span>
        </div>

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
