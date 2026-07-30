export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-4 sm:px-8 pt-6 sm:pt-8 pb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
