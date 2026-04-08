import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import translations from './translations'

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
]

export default function TicketForm({ student, onLogout, lang, setLang, t }) {
  const [view, setView] = useState('form') // 'form' | 'tickets' | 'success'
  const [categorie, setCategorie] = useState('')
  const [description, setDescription] = useState('')
  const [priorite, setPriorite] = useState('')
  const [message, setMessage] = useState('')
  const [tickets, setTickets] = useState([])

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('nom', student['Nom'])
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  useEffect(() => {
    if (view === 'tickets') fetchTickets()
  }, [view])

  const handleSubmit = async () => {
    if (!categorie || !description || !priorite) {
      setMessage(t.fillAll)
      return
    }
    const { error } = await supabase
      .from('tickets')
      .insert([{
        nom: student['Nom'],
        chambre: student['Chambre'],
        pavillon: student['Pavillon'],
        categorie,
        description,
        priorite,
        statut: 'En attente'
      }])
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setView('success')
      setMessage('')
    }
  }

  const statusColor = (statut) => {
    if (statut === 'Résolu') return 'bg-green-100 text-green-700'
    if (statut === 'En cours') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-600'
  }

  const priorityColor = (p) => {
    if (p === 'Urgente' || p === 'Urgent' || p === 'عاجلة') return 'bg-red-100 text-red-600'
    if (p === 'Moyenne' || p === 'Medium' || p === 'متوسطة') return 'bg-yellow-100 text-yellow-600'
    return 'bg-green-100 text-green-600'
  }

  // Header shared across all views
  const Header = () => (
    <div className="bg-white rounded shadow p-4 mb-4 flex justify-between items-center">
      <div>
        <h1 className="font-bold text-lg">🔧 {t.appTitle}</h1>
        <p className="text-sm text-gray-500">
          {student['Nom']} — {t.room} {student['Chambre']}, {t.pavilion} {student['Pavillon']}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* Language switcher */}
        <div className="flex gap-1">
          {languages.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                lang === l.code
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button onClick={onLogout} className="text-sm text-red-500 hover:underline">
          {t.logout}
        </button>
      </div>
    </div>
  )

  // Bottom nav
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex">
      <button
        onClick={() => setView('form')}
        className={`flex-1 py-3 text-sm font-medium transition-colors ${
          view === 'form' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'
        }`}
      >
        ✏️ {t.newRequest}
      </button>
      <button
        onClick={() => setView('tickets')}
        className={`flex-1 py-3 text-sm font-medium transition-colors ${
          view === 'tickets' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'
        }`}
      >
        📋 {t.myTickets}
      </button>
    </div>
  )

  if (view === 'success') {
    return (
      <div dir={t.dir} className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow text-center max-w-md w-full">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">{t.successTitle}</h2>
          <p className="text-gray-500 text-sm mb-6">{t.successMsg}</p>
          <button
            onClick={() => { setView('form'); setCategorie(''); setDescription(''); setPriorite('') }}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 mb-3"
          >
            {t.anotherRequest}
          </button>
          <button
            onClick={() => setView('tickets')}
            className="w-full border border-gray-300 text-gray-600 p-2 rounded hover:bg-gray-50"
          >
            {t.myTickets}
          </button>
        </div>
      </div>
    )
  }

  if (view === 'tickets') {
    return (
      <div dir={t.dir} className="min-h-screen bg-gray-100 pb-20">
        <div className="max-w-lg mx-auto p-4">
          <Header />
          <div className="space-y-3">
            {tickets.length === 0 && (
              <div className="bg-white rounded shadow p-6 text-center text-gray-400">
                {t.noTickets}
              </div>
            )}
            {tickets.map(ticket => (
              <div key={ticket.id} className="bg-white rounded shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">{ticket.categorie}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(ticket.statut)}`}>
                    {t.statuses[ticket.statut] || ticket.statut}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                <div className="flex justify-between items-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${priorityColor(ticket.priorite)}`}>
                    {ticket.priorite}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div dir={t.dir} className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-lg mx-auto p-4">
        <Header />
        <div className="bg-white rounded shadow p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
            <select
              className="w-full border p-2 rounded"
              onChange={e => setCategorie(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>{t.categoryPlaceholder}</option>
              {t.categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.priority}</label>
            <div className="flex gap-3">
              {t.priorities.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPriorite(p)}
                  className={`flex-1 p-2 rounded border text-sm font-medium transition-colors ${
                    priorite === p
                      ? i === 2
                        ? 'bg-red-500 text-white border-red-500'
                        : i === 1
                        ? 'bg-yellow-400 text-white border-yellow-400'
                        : 'bg-green-500 text-white border-green-500'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
            <textarea
              className="w-full border p-2 rounded h-32 resize-none"
              placeholder={t.descriptionPlaceholder}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {message && <p className="text-sm text-red-500">{message}</p>}

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white p-3 rounded font-medium hover:bg-blue-700"
          >
            {t.submit}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
