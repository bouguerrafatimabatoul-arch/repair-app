import { useState } from 'react'
import { supabase } from './supabaseClient'
import TicketForm from './TicketForm'
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
  const [student, setStudent] = useState(null)

  const t = translations[lang]

  const handleLogin = async () => {
    setMessage('')
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('Matricule de Bac', matriculeBac)
      .eq('Annee de Bac', parseInt(anneeBac))
      .single()

    if (error || !data) {
      setMessage(t.loginError)
      return
    }
    setStudent(data)
  }

  if (student) {
    return (
      <TicketForm
        student={student}
        onLogout={() => setStudent(null)}
        lang={lang}
        setLang={setLang}
        t={t}
      />
    )
  }

  return (
    <div dir={t.dir} className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">

        {/* Language switcher */}
        <div className="flex justify-end gap-2 mb-6">
          {languages.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                lang === l.code
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-bold mb-1">🔧 {t.appTitle}</h1>
        <p className="text-gray-500 text-sm mb-6">{t.appSubtitle}</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.bacMatricule}
        </label>
        <input
          className="w-full border p-2 mb-4 rounded"
          placeholder={t.bacMatriculePlaceholder}
          onChange={e => setMatriculeBac(e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.bacYear}
        </label>
        <input
          className="w-full border p-2 mb-6 rounded"
          placeholder={t.bacYearPlaceholder}
          type="number"
          onChange={e => setAnneeBac(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          {t.login}
        </button>

        {message && (
          <p className="mt-4 text-sm text-center text-red-500">{message}</p>
        )}
      </div>
    </div>
  )
}
