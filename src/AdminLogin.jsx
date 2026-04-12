import { useState } from 'react'
import { supabase } from './supabaseClient'

const CHEF_JOB_TITLE = 'رئيس مصلحة النظافة و الصيانة و الأمن الداخلي'

const t = {
  en: {
    dir: 'ltr',
    title: 'Administration',
    subtitle: 'University Residence — Dashboard',
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    loginBtn: 'Login',
    loggingIn: 'Logging in...',
    errorEmpty: 'Please fill in all fields.',
    errorCredentials: 'Incorrect username or password.',
    errorAccess: 'Access denied. Only the service manager can access this platform.',
    footer: 'Access reserved for the service manager only',
    back: '← Back to student portal',
  },
  fr: {
    dir: 'ltr',
    title: 'Espace Administration',
    subtitle: 'Résidence Universitaire — Tableau de bord',
    username: "Nom d'utilisateur",
    usernamePlaceholder: "Entrez votre nom d'utilisateur",
    password: 'Mot de passe',
    passwordPlaceholder: 'Entrez votre mot de passe',
    loginBtn: 'Se connecter',
    loggingIn: 'Connexion...',
    errorEmpty: 'Veuillez remplir tous les champs.',
    errorCredentials: "Nom d'utilisateur ou mot de passe incorrect.",
    errorAccess: 'Accès refusé. Seul le chef de service peut accéder à cette plateforme.',
    footer: 'Accès réservé au chef de service uniquement',
    back: '← Retour à l\'espace étudiant',
  },
  ar: {
    dir: 'rtl',
    title: 'لوحة الإدارة',
    subtitle: 'الإقامة الجامعية — لوحة التحكم',
    username: 'اسم المستخدم',
    usernamePlaceholder: 'أدخل اسم المستخدم',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    loginBtn: 'تسجيل الدخول',
    loggingIn: 'جارٍ الدخول...',
    errorEmpty: 'يرجى ملء جميع الحقول.',
    errorCredentials: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    errorAccess: 'تم رفض الوصول. هذه المنصة مخصصة لرئيس المصلحة فقط.',
    footer: 'الوصول مخصص لرئيس المصلحة فقط',
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

    // Debug: log what we're querying
    console.log('Trying login with username:', username)

    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password.trim())
      .single()

    console.log('Result:', data, 'Error:', error)
    setLoading(false)

    if (error || !data) { setMessage(txt.errorCredentials); return }

    const jobTitle = data['job title'] || data['Job title'] || data['job_title'] || ''
    console.log('Job title found:', jobTitle)

    if (jobTitle.trim() !== CHEF_JOB_TITLE) {
      setMessage(txt.errorAccess)
      return
    }

    onLogin(data)
  }

  return (
    <div dir={txt.dir} className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10">

        {/* Language switcher */}
        <div className="flex justify-end gap-2 mb-6">
          {languages.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                lang === l.code ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span style={{ fontSize: 28 }}>🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{txt.title}</h1>
          <p className="text-gray-400 text-sm mt-1">{txt.subtitle}</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{txt.username}</label>
            <input
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder={txt.usernamePlaceholder}
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{txt.password}</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder={txt.passwordPlaceholder}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {message && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{message}</p>
            </div>
          )}

          <button onClick={handleLogin} disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2">
            {loading ? txt.loggingIn : txt.loginBtn}
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">{txt.footer}</p>

        <div className="mt-4 text-center">
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 underline">
            {txt.back}
          </button>
        </div>
      </div>
    </div>
  )
}
