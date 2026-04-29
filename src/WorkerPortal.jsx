import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'

const PRIORITY_ORDER  = { 'Urgent': 0, 'Haute': 1, 'Normale': 2, 'Basse': 3 }
const PRIORITY_COLORS = { 'Urgent': '#ef4444', 'Haute': '#f97316', 'Normale': '#3b82f6', 'Basse': '#10b981' }
const STATUS_COLORS   = {
  'En attente': { bg: '#fef9ec', text: '#92400e', dot: '#f59e0b', border: '#fde68a' },
  'En cours':   { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', border: '#bfdbfe' },
  'Résolu':     { bg: '#f0fdf4', text: '#065f46', dot: '#10b981', border: '#a7f3d0' },
}

function sortTickets(arr) {
  return [...arr].sort((a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) ||
    new Date(b.created_at) - new Date(a.created_at)
  )
}

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

function WorkerPicker({ workers, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {workers.map(w => {
        const id  = w['id']
        const name = `${w['nom']} ${w['prenom'] || ''}`.trim()
        const on  = selected.includes(id)
        return (
          <button key={id} onClick={() => onChange(on ? selected.filter(x => x !== id) : [...selected, id])}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
            style={on
              ? { background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }
              : { background: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>
            {on ? '✓ ' : ''}{name}
          </button>
        )
      })}
      {workers.length === 0 && <p className="text-xs text-gray-400">Aucun ouvrier disponible</p>}
    </div>
  )
}

function TicketModal({ ticket, workers, onClose, onStatus, onSaveWorkers, updating }) {
  const [selWorkers, setSelWorkers] = useState(() => {
    try { return JSON.parse(ticket.assigned_workers || '[]') } catch { return [] }
  })
  const [saved, setSaved] = useState(false)

  const isUrgent = ticket.priority === 'Urgent'
  const sc = STATUS_COLORS[ticket.statut] || STATUS_COLORS['En attente']
  const pc = PRIORITY_COLORS[ticket.priority]

  const handleSave = async () => {
    await onSaveWorkers(ticket.id, selWorkers)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const statuses = ['En attente', 'En cours', 'Résolu']

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Priority accent line */}
        <div className="h-1 w-full" style={{ background: pc || '#e5e7eb' }} />

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isUrgent && (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">URGENT</span>
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: sc.dot }} />
                {ticket.statut}
              </span>
              <span className="text-xs font-mono text-gray-400">{ticket.tracking_code}</span>
            </div>
            <h3 className="font-bold text-gray-800 text-base">{ticket.nom}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {ticket.problem_type}
              {ticket.chambre && <> · Chambre <strong>{ticket.chambre}</strong></>}
              {ticket.pavillon && <> · Bât. {ticket.pavillon}</>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-2xl leading-none shrink-0 mt-0.5">×</button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Description */}
          {ticket.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Description</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{ticket.description}</p>
            </div>
          )}

          {/* Availability */}
          {ticket.availability && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Créneau</p>
              <p className="text-sm text-gray-600 font-medium">{ticket.availability}</p>
            </div>
          )}

          {/* Status change */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2.5">Changer le statut</p>
            <div className="grid grid-cols-3 gap-2">
              {statuses.map(s => {
                const c = STATUS_COLORS[s]
                const active = ticket.statut === s
                return (
                  <button key={s} disabled={updating || active} onClick={() => onStatus(ticket.id, s)}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all border disabled:opacity-60"
                    style={active
                      ? { background: c.bg, color: c.text, borderColor: c.dot }
                      : { background: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>
                    {updating && active ? '…' : s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Assign workers */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2.5">Ouvriers assignés</p>
            <WorkerPicker workers={workers} selected={selWorkers} onChange={setSelWorkers} />
            <button onClick={handleSave}
              className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold border transition-all"
              style={saved
                ? { background: '#f0fdf4', color: '#065f46', borderColor: '#a7f3d0' }
                : { background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
              {saved ? 'Enregistré' : 'Enregistrer les ouvriers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorkerPortal({ worker, onLogout }) {
  const [tickets, setTickets]     = useState([])
  const [workers, setWorkers]     = useState([])
  const [selTicket, setSelTicket] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [updating, setUpdating]   = useState(false)
  const [search, setSearch]       = useState('')
  const [filterTab, setFilterTab] = useState('all')

  useEffect(() => {
    const load = async () => {
      const [{ data: td }, { data: wd }] = await Promise.all([
        supabase.from('tickets').select('*').eq('residence_id', worker.residence_id).order('created_at', { ascending: false }),
        supabase.from('workers').select('*').eq('residence_id', worker.residence_id),
      ])
      if (td) setTickets(sortTickets(td))
      if (wd) setWorkers(wd)
      setLoading(false)
    }
    load()

    const ch = supabase.channel(`worker-portal-${worker.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, p => {
        if (p.new.residence_id === worker.residence_id)
          setTickets(prev => sortTickets([p.new, ...prev]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, p => {
        setTickets(prev => sortTickets(prev.map(t => t.id === p.new.id ? p.new : t)))
        setSelTicket(prev => prev?.id === p.new.id ? p.new : prev)
      })
      .subscribe()

    // Poll every 10s for guaranteed freshness
    const poll = setInterval(async () => {
      const { data } = await supabase.from('tickets').select('*')
        .eq('residence_id', worker.residence_id).order('created_at', { ascending: false })
      if (data) setTickets(sortTickets(data))
    }, 10000)

    // Refetch on tab focus
    const onFocus = async () => {
      const { data } = await supabase.from('tickets').select('*')
        .eq('residence_id', worker.residence_id).order('created_at', { ascending: false })
      if (data) setTickets(sortTickets(data))
    }
    window.addEventListener('focus', onFocus)

    return () => {
      supabase.removeChannel(ch)
      clearInterval(poll)
      window.removeEventListener('focus', onFocus)
    }
  }, [worker])

  const updateStatus = useCallback(async (ticketId, status) => {
    setUpdating(true)
    const upd = { statut: status }
    if (status === 'Résolu') upd.resolved_at = new Date().toISOString()
    else upd.resolved_at = null
    const { error } = await supabase.from('tickets').update(upd).eq('id', ticketId)
    if (!error) {
      setTickets(prev => sortTickets(prev.map(t => t.id === ticketId ? { ...t, ...upd } : t)))
      setSelTicket(prev => prev?.id === ticketId ? { ...prev, ...upd } : prev)
      // Notify the student
      const ticket = tickets.find(t => t.id === ticketId)
      if (ticket) {
        const msg = status === 'Résolu'
          ? `Votre demande ${ticket.tracking_code} a été résolue`
          : `Votre demande ${ticket.tracking_code} est en cours de traitement`
        await supabase.from('notifications').insert([{
          ticket_id:       ticketId,
          tracking_code:   ticket.tracking_code,
          nom:             ticket.nom,
          message_student: msg,
          type:            'status_update',
          read_by_admin:   true,
          read_by_student: false,
          residence_id:    ticket.residence_id || null,
          triggered_by_admin: worker.id || null,
        }])
      }
    }
    setUpdating(false)
  }, [tickets, worker])

  const saveAssignedWorkers = useCallback(async (ticketId, selectedWorkers) => {
    const aw = JSON.stringify(selectedWorkers)
    await supabase.from('tickets').update({ assigned_workers: aw }).eq('id', ticketId)
    setTickets(prev => sortTickets(prev.map(t => t.id === ticketId ? { ...t, assigned_workers: aw } : t)))
    setSelTicket(prev => prev?.id === ticketId ? { ...prev, assigned_workers: aw } : prev)
  }, [])

  const q = search.toLowerCase()
  const byTab = tickets.filter(t => filterTab === 'all' || t.statut === filterTab)
  const filtered = byTab.filter(t =>
    !q ||
    t.nom?.toLowerCase().includes(q) ||
    t.tracking_code?.toLowerCase().includes(q) ||
    t.problem_type?.toLowerCase().includes(q) ||
    t.chambre?.toLowerCase().includes(q)
  )

  const urgentCount = tickets.filter(t => t.priority === 'Urgent' && t.statut !== 'Résolu').length
  const pending     = tickets.filter(t => t.statut === 'En attente').length
  const inProgress  = tickets.filter(t => t.statut === 'En cours').length
  const resolved    = tickets.filter(t => t.statut === 'Résolu').length

  const TABS = [
    { key: 'all',        label: 'Tous',       count: tickets.length,  color: '#6b7280' },
    { key: 'En attente', label: 'En attente',  count: pending,         color: '#f59e0b' },
    { key: 'En cours',   label: 'En cours',    count: inProgress,      color: '#3b82f6' },
    { key: 'Résolu',     label: 'Résolus',     count: resolved,        color: '#10b981' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9' }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Avatar / icon */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <MoonIcon />
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm leading-tight truncate">
              {worker.nom} {worker.prenom}
            </p>
            <p className="text-xs text-gray-400 truncate">{worker.residence || 'Équipe technique'}</p>
          </div>

          {/* Urgent badge */}
          {urgentCount > 0 && (
            <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full shrink-0">
              {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
            </span>
          )}

          {/* Logout */}
          <button onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-all shrink-0">
            <LogoutIcon />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>

        {/* Stats row */}
        <div className="max-w-2xl mx-auto px-4 pb-3 grid grid-cols-3 gap-2">
          {[
            { label: 'En attente', value: pending,    color: '#f59e0b', bg: '#fef9ec' },
            { label: 'En cours',   value: inProgress, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Résolus',    value: resolved,   color: '#10b981', bg: '#f0fdf4' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: s.bg }}>
              <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-xs text-gray-500 leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter tabs + Search ── */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-2 space-y-3">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilterTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all shrink-0"
              style={filterTab === tab.key
                ? { background: tab.color, color: '#fff', borderColor: tab.color }
                : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}>
              {tab.label}
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={filterTab === tab.key
                  ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                  : { background: '#f3f4f6', color: '#6b7280' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <SearchIcon />
          </div>
          <input
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
            placeholder="Rechercher nom, chambre, code…"
            value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ── Ticket list ── */}
      <div className="max-w-2xl mx-auto w-full px-4 pb-8 space-y-2 flex-1">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">Aucun ticket trouvé</div>
        )}
        {filtered.map(t => {
          const sc = STATUS_COLORS[t.statut] || STATUS_COLORS['En attente']
          const pc = PRIORITY_COLORS[t.priority]
          const isUrgent = t.priority === 'Urgent'
          return (
            <button key={t.id} onClick={() => setSelTicket(t)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all overflow-hidden"
              style={{ borderLeft: `4px solid ${pc || '#e5e7eb'}` }}>
              <div className="px-4 py-3.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isUrgent && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">URGENT</span>
                    )}
                    <p className="font-bold text-gray-800 text-sm truncate">{t.nom}</p>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{t.problem_type}{t.chambre ? ` · Chambre ${t.chambre}` : ''}</p>
                  <p className="text-[11px] font-mono text-gray-300 mt-1">{t.tracking_code}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                    style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                    {t.statut}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selTicket && (
        <TicketModal
          ticket={selTicket}
          workers={workers}
          onClose={() => setSelTicket(null)}
          onStatus={updateStatus}
          onSaveWorkers={saveAssignedWorkers}
          updating={updating} />
      )}
    </div>
  )
}
