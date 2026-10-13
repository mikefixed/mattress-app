'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image' // Added for the logo
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }
    // If email confirmation is off, signUp returns an active session immediately,
    // which lets this insert succeed under RLS (id = auth.uid()). If confirmation
    // is required, this will simply be skipped — the CEO can add the profile from
    // the Staff page (or the seed SQL) once the user confirms and signs in.
    if (data.user && data.session) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role: 'staff',
        store_id: null,
        is_active: false,
      })
    }
    setLoading(false)
    if (data.user) {
      setNotice(
        'Account created. Ask your CEO to assign your role and store from the Staff page before you can access the dashboard.'
      )
    }
  }

  // Reusable Logo component for this page
  const Logo = ({ size = 40 }: { size?: number }) => (
    <div className="rounded-lg overflow-hidden shrink-0" style={{ width: size, height: size, background: 'var(--gold)' }}>
      <Image 
        src="/logo.png" 
        alt="Naanah Amins Ventures Logo" 
        width={size} 
        height={size} 
        className="object-cover w-full h-full"
      />
    </div>
  )

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="tick-stripes hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: 'var(--ink)' }}>
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <span className="font-display text-lg font-semibold">Naanah Amins Ventures</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight mb-4">
            Every sale, every unit, every store — in one place.
          </h1>
          <p className="text-white/70 leading-relaxed">
            Track sales as they happen, keep stock levels honest across every branch,
            and give your team exactly the access they need — nothing more, nothing less.
          </p>
        </div>

        <p className="text-white/50 text-sm">
          Built for CEO, managers and sales staff across every location.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-8" style={{ background: 'var(--paper)' }}>
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Logo size={32} />
            <span className="font-display font-semibold" style={{ color: 'var(--ink)' }}>
              Naanah Amins Ventures
            </span>
          </div>

          <h2 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>
            {mode === 'signin'
              ? 'Sign in to your store dashboard.'
              : 'New staff and managers sign up here, then wait for the CEO to activate their role.'}
          </p>

          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                  Full name
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
                  placeholder="e.g. Musa Ibrahim"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                Email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
                placeholder="you@naanahaminsventures.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                Password
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {error}
              </div>
            )}
            {notice && (
              <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--ink)' }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setNotice(null)
            }}
            className="mt-6 text-sm w-full text-center"
            style={{ color: 'var(--gold)' }}
          >
            {mode === 'signin' ? "New staff member? Create an account" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
