import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/get-profile'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { DollarSign, Package, AlertTriangle, ShoppingCart } from 'lucide-react'

export default async function DashboardHome() {
  const { profile } = await getCurrentProfile()
  const supabase = await createClient()
  const isCeo = profile.role === 'ceo'

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  let salesQuery = supabase.from('sales').select('total_amount, created_at')
  let productsQuery = supabase.from('products').select('id, quantity, reorder_level, name')

  if (!isCeo && profile.store_id) {
    salesQuery = salesQuery.eq('store_id', profile.store_id)
    productsQuery = productsQuery.eq('store_id', profile.store_id)
  }

  const [{ data: sales }, { data: products }] = await Promise.all([salesQuery, productsQuery])

  const todaySales = (sales ?? []).filter((s) => new Date(s.created_at) >= startOfToday)
  const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0)
  const monthTotal = (sales ?? []).reduce((sum, s) => sum + Number(s.total_amount), 0)
  const lowStock = (products ?? []).filter((p) => p.quantity <= p.reorder_level)

  const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile.full_name.split(' ')[0]}`}
        subtitle={isCeo ? 'Performance across all stores' : "Today's snapshot for your store"}
      />

      <div className="px-4 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sales today" value={naira(todayTotal)} icon={DollarSign} />
        <StatCard label="Sales, all time" value={naira(monthTotal)} icon={ShoppingCart} />
        <StatCard label="Products tracked" value={String((products ?? []).length)} icon={Package} />
        <StatCard
          label="Low stock items"
          value={String(lowStock.length)}
          icon={AlertTriangle}
          tone={lowStock.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="px-4 sm:px-8 mt-8">
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
