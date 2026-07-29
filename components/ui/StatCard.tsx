import type { LucideIcon } from 'lucide-react'

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'default' | 'warning'
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: tone === 'warning' ? 'var(--danger-soft)' : 'var(--gold-soft)' }}
        >
          <Icon size={16} color={tone === 'warning' ? 'var(--danger)' : 'var(--gold)'} />
        </div>
      </div>
      <p className="font-mono-num text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
    </div>
  )
}
