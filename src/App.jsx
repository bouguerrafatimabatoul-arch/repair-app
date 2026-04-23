import { useState } from 'react'
import { supabase } from './supabaseClient'
import TicketForm from './TicketForm'
import AdminLogin from './AdminLogin'
import Dashboard from './Dashboard'
import translations from './translations'

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
]

export default function App() {
  const [lang, setLang] = useState('fr')
  const [matriculeBac, setMatriculeBac] = useState('')
  const [anneeBac, setAnneeBac] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [student, setStudent] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [showAdminLogin, setShowAdminLogin] = useState(false)

  const t = translations[lang]

  const handleStudentLogin = async () => {
    setMessage('')
    const mat = matriculeBac.trim()
    const year = anneeBac.trim()
    if (!mat || !year) { setMessage(t.loginError); return }
    if (!/^\d+$/.test(mat) || !/^\d{4}$/.test(year)) { setMessage(t.loginError); return }

    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('matricule_bac', mat)
      .eq('annee_bac', parseInt(year))
      .single()
    setLoading(false)

    if (error || !data) { setMessage(t.loginError); return }
    setStudent(data)
  }

  if (admin) return <Dashboard admin={admin} onLogout={() => setAdmin(null)} />

  if (showAdminLogin) return <AdminLogin onLogin={setAdmin} onBack={() => setShowAdminLogin(false)} />

  if (student) return (
    <TicketForm student={student} onLogout={() => setStudent(null)} lang={lang} setLang={setLang} />
  )

  return (
    <div dir={t.dir} className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0a0e1a 100%)'}}>
      {/* Ambient background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)'}} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15" style={{background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(60px)'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10" style={{background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)', filter: 'blur(80px)'}} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px'}} />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'}}>
          {/* Top accent bar */}
          <div className="h-0.5 w-full" style={{background: 'linear-gradient(90deg, transparent, #3b82f6, #6366f1, transparent)'}} />

          <div className="p-8">
            {/* Language switcher */}
            <div className="flex justify-end gap-1.5 mb-8">
              {languages.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200"
                  style={lang === l.code
                    ? {background: 'rgba(59,130,246,0.25)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.4)'}
                    : {background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)'}}>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)'}}>
                  🔧
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight" style={{color: '#f0f6ff'}}>{t.appTitle}</h1>
                  <p className="text-xs mt-0.5" style={{color: 'rgba(255,255,255,0.35)'}}>{t.appSubtitle}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{color: 'rgba(255,255,255,0.4)'}}>{t.bacMatricule}</label>
                <input
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                  style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', caretColor: '#60a5fa'}}
                  onFocus={e => e.target.style.border = '1px solid rgba(59,130,246,0.5)'}
                  onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  placeholder={t.bacMatriculePlaceholder}
                  value={matriculeBac}
                  maxLength={20}
                  onChange={e => setMatriculeBac(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleStudentLogin()} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{color: 'rgba(255,255,255,0.4)'}}>{t.bacYear}</label>
                <input
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                  style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', caretColor: '#60a5fa'}}
                  onFocus={e => e.target.style.border = '1px solid rgba(59,130,246,0.5)'}
                  onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  placeholder={t.bacYearPlaceholder} type="number"
                  onChange={e => setAnneeBac(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStudentLogin()} />
              </div>

              <button onClick={handleStudentLogin} disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.35)'}}>
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                )}
                {t.login}
              </button>
            </div>

            {message && (
              <div className="mt-4 rounded-xl px-4 py-3 text-xs text-center" style={{background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5'}}>
                {message}
              </div>
            )}

            <div className="mt-8 pt-6" style={{borderTop: '1px solid rgba(255,255,255,0.06)'}}>
              <button onClick={() => setShowAdminLogin(true)}
                className="w-full text-center text-xs transition-colors duration-200"
                style={{color: 'rgba(255,255,255,0.2)'}}>
                Accès administration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}