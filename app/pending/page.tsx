import { Hourglass } from 'lucide-react'

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--paper)' }}>
      <div className="max-w-sm text-center">
        <div
          className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'var(--gold-soft)' }}
        >
          <Hourglass size={22} color="var(--gold)" />
        </div>
        <h1 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
          Waiting for activation
        </h1>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Your account was created, but it hasn&apos;t been assigned a role or a store yet.
          Ask the CEO to activate your account from the Staff page — you&apos;ll get access as soon as that&apos;s done.
        </p>
      </div>
    </div>
  )
}
