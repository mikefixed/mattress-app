'use client'

import { useEffect, useState, useCallback, useMemo, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import type { DebtPayment, Sale } from '@/lib/types'
import { Search, X, ChevronDown, ChevronUp, HandCoins } from 'lucide-react'
import { format } from 'date-fns'

type DebtRow = Sale & { stores?: { name: string } }

export default function DebtorsClient({
  isCeo,
  myStoreId,
  myId,
  stores,
}: {
  isCeo: boolean
  myStoreId: string | null
  myId: string
  stores: { id: string; name: string }[]
}) {
  const supabase = createClient()
  const [storeId, setStoreId] = useState<string | null>(myStoreId)
  const [debts, setDebts] = useState<DebtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSettled, setShowSettled] = useState(false)
  const [payTarget, setPayTarget] = useState<DebtRow | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [history, setHistory] = useState<DebtPayment[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select('*, stores:store_id(name)')
      .eq('payment_method', 'credit')
      .order('created_at', { ascending: false })
    if (storeId) query = query.eq('store_id', storeId)
    const { data } = await query
    setDebts((data as unknown as DebtRow[]) ?? [])
    setLoading(false)
  }, [storeId, supabase])

  useEffect(() => { load() }, [load])

  const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`

  const filtered = useMemo(() => {
    return debts
      .map((d) => ({ ...d, balance: Number(d.total_amount) - Number(d.amount_paid) }))
      .filter((d) => (showSettled ? true : d.balance > 0.009))
      .filter((d) => !search || `${d.customer_name ?? ''} ${d.customer_phone ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  }, [debts, showSettled, search])

  const totalOutstanding = filtered.reduce((sum, d) => sum + Math.max(d.balance, 0), 0)

  async function toggleExpand(sale: DebtRow) {
    if (expanded === sale.id) { setExpanded(null); return }
    setExpanded(sale.id)
    const { data } = await supabase.from('debt_payments').select('*').eq('sale_id', sale.id).order('created_at', { ascending: false })
    setHistory((data as DebtPayment[]) ?? [])
  }

  return (
    <div>
      <PageHeader
        title="Debtors"
        subtitle="Customers who bought on credit, and what they still owe."
      />

      <div className="px-4 sm:px-8 grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>Total outstanding</p>
          <p className="font-mono-num text-2xl font-semibold" style={{ color: 'var(--danger)' }}>{naira(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>Open debtor accounts</p>
          <p className="font-mono-num text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{filtered.filter(d => d.balance > 0.009).length}</p>
        </div>
      </div>

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
        <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer" style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}>
          <input type="checkbox" checked={showSettled} onChange={(e) => setShowSettled(e.target.checked)} />
          Show settled debts
        </label>
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
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--line)' }}>
                {['Date', ...(isCeo ? ['Store'] : []), 'Customer', 'Total', 'Paid', 'Balance', ''].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ color: 'var(--ink-soft)' }}>No debtors to show.</td></tr>
              ) : (
                filtered.map((d) => (
                  <Fragment key={d.id}>
                    <tr className="border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                      <td className="px-5 py-3 whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>{format(new Date(d.created_at), 'd MMM yyyy')}</td>
                      {isCeo && <td className="px-5 py-3" style={{ color: 'var(--ink-soft)' }}>{d.stores?.name ?? '—'}</td>}
                      <td className="px-5 py-3">
                        <p style={{ color: 'var(--ink)' }}>{d.customer_name || 'Unnamed customer'}</p>
                        {d.customer_phone && <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{d.customer_phone}</p>}
                      </td>
                      <td className="px-5 py-3 font-mono-num" style={{ color: 'var(--ink)' }}>{naira(d.total_amount)}</td>
                      <td className="px-5 py-3 font-mono-num" style={{ color: 'var(--success)' }}>{naira(d.amount_paid)}</td>
                      <td className="px-5 py-3 font-mono-num font-medium" style={{ color: d.balance > 0.009 ? 'var(--danger)' : 'var(--success)' }}>
                        {d.balance > 0.009 ? naira(d.balance) : 'Settled'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          {d.balance > 0.009 && (
                            <button onClick={() => setPayTarget(d)} className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--gold)' }}>
                              <HandCoins size={14} /> Record payment
                            </button>
                          )}
                          <button onClick={() => toggleExpand(d)} style={{ color: 'var(--ink-soft)' }}>
                            {expanded === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === d.id && (
                      <tr>
                        <td colSpan={7} className="px-5 py-3" style={{ background: 'var(--paper)' }}>
                          <p className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>Payment history</p>
                          {history.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>No payments recorded yet.</p>
                          ) : (
                            <ul className="space-y-1">
                              {history.map((h) => (
                                <li key={h.id} className="flex items-center justify-between text-xs">
                                  <span style={{ color: 'var(--ink-soft)' }}>{format(new Date(h.created_at), 'd MMM yyyy, h:mm a')}{h.note ? ` — ${h.note}` : ''}</span>
                                  <span className="font-mono-num font-medium" style={{ color: 'var(--success)' }}>{naira(h.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {payTarget && (
        <RecordPaymentModal
          sale={payTarget}
          recordedBy={myId}
          onClose={() => setPayTarget(null)}
          onSaved={() => { setPayTarget(null); load() }}
        />
      )}
    </div>
  )
}

function RecordPaymentModal({ sale, recordedBy, onClose, onSaved }: {
  sale: DebtRow; recordedBy: string; onClose: () => void; onSaved: () => void
}) {
  const supabase = createClient()
  const balance = Number(sale.total_amount) - Number(sale.amount_paid)
  const [amount, setAmount] = useState(String(balance))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG')}`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true)
    setError(null)

    await supabase.from('debt_payments').insert({
      sale_id: sale.id,
      store_id: sale.store_id,
      amount: amt,
      note: note || null,
      recorded_by: recordedBy,
    })
    await supabase.from('sales').update({ amount_paid: Number(sale.amount_paid) + amt }).eq('id', sale.id)

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm rounded-xl p-6" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--ink)' }}>Record payment</h3>
          <button onClick={onClose}><X size={18} color="var(--ink-soft)" /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
          {sale.customer_name || 'This customer'} owes <span className="font-mono-num font-medium" style={{ color: 'var(--danger)' }}>{naira(balance)}</span>
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Amount received</label>
            <input type="number" step="0.01" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }} placeholder="e.g. Part payment, cash" />
          </div>
          {error && (
            <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</div>
          )}
          <button disabled={saving} type="submit" className="w-full mt-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--ink)' }}>
            {saving ? 'Saving…' : 'Record payment'}
          </button>
        </form>
      </div>
    </div>
  )
}
