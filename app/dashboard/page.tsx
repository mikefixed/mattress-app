import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/get-profile'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import SalesTrendChart from '@/components/dashboard/SalesTrendChart'
import { DollarSign, Package, AlertTriangle, HandCoins, CalendarDays } from 'lucide-react'
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns'

export default async function DashboardHome() {
  const { profile } = await getCurrentProfile()
  const supabase = await createClient()
  const isCeo = profile.role === 'ceo'

  const startToday = startOfDay(new Date())
  const startWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
  const startMonth = startOfMonth(new Date())
  const sevenDaysAgo = startOfDay(subDays(new Date(), 6))

  let salesQuery = supabase
    .from('sales')
    .select('total_amount, amount_paid, payment_method, created_at, store_id, stores:store_id(name)')
    .gte('created_at', sevenDaysAgo.toISOString())
  let productsQuery = supabase.from('products').select('id, quantity, reorder_level, name, cost_price')

  if (!isCeo && profile.store_id) {
    salesQuery = salesQuery.eq('store_id', profile.store_id)
    productsQuery = productsQuery.eq('store_id', profile.store_id)
  }

  const [{ data: sales }, { data: products }, { data: allCreditSales }] = await Promise.all([
    salesQuery,
    productsQuery,
    (() => {
      let q = supabase.from('sales').select('total_amount, amount_paid, store_id').eq('payment_method', 'credit')
      if (!isCeo && profile.store_id) q = q.eq('store_id', profile.store_id)
      return q
    })(),
  ])

  type SaleRow = { total_amount: number; amount_paid: number; payment_method: string; created_at: string; store_id: string; stores?: { name: string } | { name: string }[] }
  const rows = (sales ?? []) as unknown as SaleRow[]

  const todaySales = rows.filter((s) => new Date(s.created_at) >= startToday)
  const weekSales = rows.filter((s) => new Date(s.created_at) >= startWeek)
  const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0)
  const weekTotal = weekSales.reduce((sum, s) => sum + Number(s.total_amount), 0)

  const outstandingDebt = (allCreditSales ?? []).reduce(
    (sum, s) => sum + Math.max(Number(s.total_amount) - Number(s.amount_paid), 0),
    0
  )

  const lowStock = (products ?? []).filter((p) => p.quantity <= p.reorder_level)
  const inventoryValue = (products ?? []).reduce((sum, p) => sum + Number(p.cost_price) * p.quantity, 0)

  // 7-day trend
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(new Date(), 6 - i)
    const dayStart = startOfDay(day)
    const dayEnd = startOfDay(subDays(day, -1))
    const total = rows
      .filter((s) => new Date(s.created_at) >= dayStart && new Date(s.created_at) < dayEnd)
      .reduce((sum, s) => sum + Number(s.total_amount), 0)
    return { day: format(day, 'EEE'), total }
  })

  // per-store breakdown for CEO, this month
  let storeBreakdown: { name: string; total: number; count: number }[] = []
  if (isCeo) {
    const { data: monthSales } = await supabase
      .from('sales')
      .select('total_amount, store_id, stores:store_id(name)')
      .gte('created_at', startMonth.toISOString())
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const s of (monthSales ?? []) as unknown as SaleRow[]) {
      const storeName = Array.isArray(s.stores) ? s.stores[0]?.name : s.stores?.name
      const key = s.store_id
      const existing = map.get(key) ?? { name: storeName ?? 'Unknown', total: 0, count: 0 }
      existing.total += Number(s.total_amount)
      existing.count += 1
      map.set(key, existing)
    }
    storeBreakdown = Array.from(map.values()).sort((a, b) => b.total - a.total)
  }

  const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile.full_name.split(' ')[0]}`}
        subtitle={isCeo ? 'Performance across all stores' : 'A snapshot of your store'}
      />

      <div className="px-4 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sales today" value={naira(todayTotal)} icon={DollarSign} />
        <StatCard label="Sales this week" value={naira(weekTotal)} icon={CalendarDays} />
        <StatCard label="Outstanding debt" value={naira(outstandingDebt)} icon={HandCoins} tone={outstandingDebt > 0 ? 'warning' : 'default'} />
        <StatCard
          label="Low stock items"
          value={String(lowStock.length)}
          icon={AlertTriangle}
          tone={lowStock.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="px-4 sm:px-8 mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <h2 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>Last 7 days</h2>
          <SalesTrendChart data={chartData} />
        </div>

        <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <h2 className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>Inventory value</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>At cost price, current stock</p>
          <p className="font-mono-num text-3xl font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <Package size={22} color="var(--gold)" /> {naira(inventoryValue)}
          </p>
        </div>
      </div>

      {isCeo && storeBreakdown.length > 0 && (
        <div className="px-4 sm:px-8 mt-6">
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
              <h2 className="font-display font-semibold text-sm" style={{ color: 'var(--ink)' }}>Sales by store, this month</h2>
            </div>
            <ul className="divide-y" style={{ borderColor: 'var(--line)' }}>
              {storeBreakdown.map((s) => (
                <li key={s.name} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <span style={{ color: 'var(--ink)' }}>{s.name}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--ink-soft)' }}>{s.count} sale{s.count === 1 ? '' : 's'}</span>
                  </div>
                  <span className="font-mono-num font-medium" style={{ color: 'var(--ink)' }}>{naira(s.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-8 mt-6 pb-8">
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
            <h2 className="font-display font-semibold text-sm" style={{ color: 'var(--ink)' }}>
              Items needing restock
            </h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
              Every product is above its reorder level.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--line)' }}>
              {lowStock.slice(0, 8).map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--ink)' }}>{p.name}</span>
                  <span className="font-mono-num" style={{ color: 'var(--danger)' }}>
                    {p.quantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
