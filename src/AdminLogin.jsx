import { useState } from 'react'
import { supabase } from './supabaseClient'

const ROLE_LABELS = {
  directeur_general:    { fr: 'Directeur Général',      ar: 'المدير العام' },
  directeur_residence:  { fr: 'Directeur Résidence',     ar: 'مدير الإقامة' },
  chef_service_technique:{ fr: 'Chef Service Technique', ar: 'رئيس مصلحة الصيانة' },
}

const t = {
  en: {
    dir: 'ltr',
    title: 'Administration',
    subtitle: 'RESITECH — Dashboard',
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    loginBtn: 'Login',
    loggingIn: 'Logging in...',
    errorEmpty: 'Please fill in all fields.',
    errorCredentials: 'Incorrect username or password.',
    footer: 'Administration access only',
    back: '← Back to student portal',
  },
  fr: {
    dir: 'ltr',
    title: 'Espace Administration',
    subtitle: 'RESITECH — Tableau de bord',
    username: "Nom d'utilisateur",
    usernamePlaceholder: "Entrez votre nom d'utilisateur",
    password: 'Mot de passe',
    passwordPlaceholder: 'Entrez votre mot de passe',
    loginBtn: 'Se connecter',
    loggingIn: 'Connexion...',
    errorEmpty: 'Veuillez remplir tous les champs.',
    errorCredentials: "Nom d'utilisateur ou mot de passe incorrect.",
    footer: 'Accès réservé à l\'administration',
    back: '← Retour à l\'espace étudiant',
  },
  ar: {
    dir: 'rtl',
    title: 'لوحة الإدارة',
    subtitle: 'RESITECH — لوحة التحكم',
    username: 'اسم المستخدم',
    usernamePlaceholder: 'أدخل اسم المستخدم',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    loginBtn: 'تسجيل الدخول',
    loggingIn: 'جارٍ الدخول...',
    errorEmpty: 'يرجى ملء جميع الحقول.',
    errorCredentials: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    footer: 'الوصول مخصص للإدارة فقط',
    back: '← العودة إلى بوابة الطلاب',
  },
}

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
]

export default function AdminLogin({ onLogin, onBack }) {
  const [lang, setLang] = useState('fr')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const txt = t[lang]

  const handleLogin = async () => {
    setMessage('')
    if (!username || !password) { setMessage(txt.errorEmpty); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password.trim())
      .single()

    setLoading(false)

    if (error || !data) { setMessage(txt.errorCredentials); return }

    onLogin(data)
  }

  return (
    <div dir={txt.dir} className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0a0e1a 100%)'}}>
      {/* Ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-15" style={{background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(60px)'}} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15" style={{background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)'}} />
      </div>
      <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px'}} />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-2xl overflow-hidden" style={{background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'}}>
          <div className="h-0.5 w-full" style={{background: 'linear-gradient(90deg, transparent, #6366f1, #3b82f6, transparent)'}} />

          <div className="p-8">
            {/* Language switcher */}
            <div className="flex justify-end gap-1.5 mb-8">
              {languages.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200"
                  style={lang === l.code
                    ? {background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)'}
                    : {background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)'}}>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl" style={{background: 'linear-gradient(135deg, #6366f1, #3b82f6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)'}}>
                🔧
              </div>
              <h1 className="text-xl font-bold tracking-tight" style={{color: '#f0f6ff'}}>{txt.title}</h1>
              <p className="text-xs mt-1" style={{color: 'rgba(255,255,255,0.35)'}}>{txt.subtitle}</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{color: 'rgba(255,255,255,0.4)'}}>{txt.username}</label>
                <input
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                  style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', caretColor: '#a5b4fc'}}
                  onFocus={e => e.target.style.border = '1px solid rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  placeholder={txt.usernamePlaceholder}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{color: 'rgba(255,255,255,0.4)'}}>{txt.password}</label>
                <input
                  type="password"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                  style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', caretColor: '#a5b4fc'}}
                  onFocus={e => e.target.style.border = '1px solid rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  placeholder={txt.passwordPlaceholder}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>

              {message && (
                <div className="rounded-xl px-4 py-3 text-xs" style={{background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5'}}>
                  {message}
                </div>
              )}

              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-50 mt-2"
                style={{background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.35)'}}>
                {loading ? txt.loggingIn : txt.loginBtn}
              </button>
            </div>

            <p className="text-center text-xs mt-6" style={{color: 'rgba(255,255,255,0.2)'}}>{txt.footer}</p>

            <div className="mt-4 pt-4 text-center" style={{borderTop: '1px solid rgba(255,255,255,0.06)'}}>
              <button onClick={onBack} className="text-xs transition-colors duration-200" style={{color: 'rgba(255,255,255,0.25)'}}>
                {txt.back}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}