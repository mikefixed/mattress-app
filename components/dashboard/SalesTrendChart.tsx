'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function SalesTrendChart({ data }: { data: { day: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--ink-soft)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₦${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
          width={44}
        />
        <Tooltip
          formatter={(value) => [`₦${Number(value).toLocaleString('en-NG')}`, 'Sales']}
          contentStyle={{ borderRadius: 8, borderColor: 'var(--line)', fontSize: 13 }}
        />
        <Bar dataKey="total" fill="var(--gold)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
