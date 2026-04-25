import { useState } from 'react'
import { supabase } from './supabaseClient'

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

function getShiftDate() {
  const now = new Date()
  const h = now.getHours()
  // After midnight but before 8am → shift started yesterday evening
  if (h < 8) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }
  return now.toISOString().split('T')[0]
}

function isNightShiftTime() {
  const h = new Date().getHours()
  return h >= 17 || h < 8
}

export default function WorkerLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async () => {
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Nom d\'utilisateur et mot de passe requis')
      return
    }
    setLoading(true)

    const { data: worker, error: dbErr } = await supabase
      .from('workers')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .eq('password', password.trim())
      .single()

    if (dbErr || !worker) {
      setLoading(false)
      setError('Identifiants incorrects')
      return
    }

    if (!isNightShiftTime()) {
      setLoading(false)
      setError('Accès disponible uniquement de 17h00 à 08h00')
      return
    }

    const shiftDate = getShiftDate()
    const { data: assignment } = await supabase
      .from('night_shift_assignments')
      .select('id')
      .eq('worker_id', worker.id)
      .eq('shift_date', shiftDate)
      .maybeSingle()

    setLoading(false)

    if (!assignment) {
      setError('Vous n\'êtes pas assigné à l\'équipe de nuit pour cette période')
      return
    }

    onLogin(worker)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0a0e1a 100%)' }}>
      {/* Ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
          <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #6366f1, #8b5cf6, transparent)' }} />

          <div className="p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)', color: '#fff' }}>
                <MoonIcon />
              </div>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: '#f0f6ff' }}>Équipe de nuit</h1>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Accès 17h00 → 08h00</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>Nom d'utilisateur</label>
                <input
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', caretColor: '#818cf8' }}
                  onFocus={e => e.target.style.border = '1px solid rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  placeholder="residence_nom_prenom"
                  value={username}
                  autoCapitalize="none"
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>Mot de passe</label>
                <input
                  type="password"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', caretColor: '#818cf8' }}
                  onFocus={e => e.target.style.border = '1px solid rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  placeholder="JJMMAAAA"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>

              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                )}
                {loading ? 'Connexion…' : 'Accéder'}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl px-4 py-3 text-xs text-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={onBack}
                className="w-full text-center text-xs transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.2)' }}>
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
