import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm'

const statusColors = {
  'En attente': 'bg-gray-100 text-gray-600',
  'En cours': 'bg-blue-100 text-blue-700',
  'Résolu': 'bg-green-100 text-green-700',
}
const priorityColors = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
}

const t = {
  en: {
    dir:'ltr', title:'Dashboard', serviceManager:'Service Manager',
    total:'Total', pending:'Pending', inProgress:'In Progress', resolved:'Resolved', urgent:'⚡ Urgent',
    all:'All', loading:'Loading...', noTickets:'No tickets found.',
    search:'🔍 Search by name, room, code...',
    location:'Location', type:'Type', priority:'Priority', status:'Status', date:'Date', student:'Student', room:'Room',
    changeStatus:'Change status', description:'Description', availability:'Availability',
    submittedOn:'Submitted on', resolvedOn:'Resolved on', exactLocation:'Exact spot',
    adminNote:'Admin note', adminNotePlaceholder:'Add a note for the student...', saveNote:'Save note',
    assignWorkers:'Assign workers', assignPlaceholder:'Worker names (comma separated)',
    priorities:{ High:'High', Medium:'Medium', Low:'Low' },
    statuses:{ 'En attente':'Pending', 'En cours':'In Progress', 'Résolu':'Resolved' },
    logout:'Logout', notifications:'Notifications', noNotifs:'No new notifications',
    markRead:'Mark all read', newTicket:'New ticket submitted',
    exportBtn:'Export', exportAll:'Export all', exportFiltered:'Export filtered',
    charts:'Charts', repairsByType:'Repairs by type', repairsByLocation:'Repairs by location',
    topRooms:'Most problematic rooms', feedback:'Student ratings',
    avgRating:'Average rating', noFeedback:'No ratings yet.',
  },
  fr: {
    dir:'ltr', title:'Tableau de bord', serviceManager:'Chef de service',
    total:'Total', pending:'En attente', inProgress:'En cours', resolved:'Résolus', urgent:'⚡ Urgents',
    all:'Tous', loading:'Chargement...', noTickets:'Aucun ticket trouvé.',
    search:'🔍 Rechercher par nom, chambre, code...',
    location:'Emplacement', type:'Type', priority:'Priorité', status:'Statut', date:'Date', student:'Étudiant', room:'Chambre',
    changeStatus:'Changer le statut', description:'Description', availability:'Disponibilité',
    submittedOn:'Soumis le', resolvedOn:'Résolu le', exactLocation:'Endroit précis',
    adminNote:'Note admin', adminNotePlaceholder:'Ajouter une note pour l\'étudiant...', saveNote:'Enregistrer',
    assignWorkers:'Assigner des ouvriers', assignPlaceholder:'Noms des ouvriers (séparés par virgule)',
    priorities:{ High:'Haute', Medium:'Moyenne', Low:'Faible' },
    statuses:{ 'En attente':'En attente', 'En cours':'En cours', 'Résolu':'Résolu' },
    logout:'Déconnexion', notifications:'Notifications', noNotifs:'Aucune nouvelle notification',
    markRead:'Tout marquer lu', newTicket:'Nouvelle demande soumise',
    exportBtn:'Exporter', exportAll:'Exporter tout', exportFiltered:'Exporter filtré',
    charts:'Graphiques', repairsByType:'Réparations par type', repairsByLocation:'Réparations par emplacement',
    topRooms:'Chambres les plus problématiques', feedback:'Évaluations étudiants',
    avgRating:'Note moyenne', noFeedback:'Aucune évaluation.',
  },
  ar: {
    dir:'rtl', title:'لوحة التحكم', serviceManager:'رئيس المصلحة',
    total:'المجموع', pending:'قيد الانتظار', inProgress:'جارٍ', resolved:'تم الحل', urgent:'⚡ عاجل',
    all:'الكل', loading:'جارٍ التحميل...', noTickets:'لا توجد طلبات.',
    search:'🔍 بحث...',
    location:'الموقع', type:'النوع', priority:'الأولوية', status:'الحالة', date:'التاريخ', student:'الطالب', room:'الغرفة',
    changeStatus:'تغيير الحالة', description:'الوصف', availability:'التوفر',
    submittedOn:'تاريخ التقديم', resolvedOn:'تاريخ الحل', exactLocation:'المكان الدقيق',
    adminNote:'ملاحظة الإدارة', adminNotePlaceholder:'أضف ملاحظة للطالب...', saveNote:'حفظ',
    assignWorkers:'تعيين عمال', assignPlaceholder:'أسماء العمال (مفصولة بفاصلة)',
    priorities:{ High:'عالية', Medium:'متوسطة', Low:'منخفضة' },
    statuses:{ 'En attente':'قيد الانتظار', 'En cours':'جارٍ المعالجة', 'Résolu':'تم الحل' },
    logout:'تسجيل الخروج', notifications:'الإشعارات', noNotifs:'لا توجد إشعارات جديدة',
    markRead:'تحديد الكل كمقروء', newTicket:'طلب جديد',
    exportBtn:'تصدير', exportAll:'تصدير الكل', exportFiltered:'تصدير المفلتر',
    charts:'الرسوم البيانية', repairsByType:'الإصلاحات حسب النوع', repairsByLocation:'حسب الموقع',
    topRooms:'أكثر الغرف مشكلة', feedback:'تقييمات الطلاب',
    avgRating:'متوسط التقييم', noFeedback:'لا توجد تقييمات.',
  },
}

const languages = [{ code:'en', label:'EN' },{ code:'fr', label:'FR' },{ code:'ar', label:'ع' }]

function BarChart({ data, label }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-2">
      {data.slice(0,8).map(d => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-32 truncate shrink-0">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
            <div className="bg-blue-500 h-5 rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%` }} />
            <span className="absolute right-2 top-0 text-xs text-gray-600 leading-5">{d.count}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ chef, onLogout }) {
  const [lang, setLang] = useState('fr')
  const txt = t[lang]

  const [tickets, setTickets] = useState([])
  const [workers, setWorkers] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [assignedWorkers, setAssignedWorkers] = useState('')
  const [showNotifs, setShowNotifs] = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [newTicketAlert, setNewTicketAlert] = useState(false)
  const notifRef = useRef(null)

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: td }, { data: wd }, { data: fd }, { data: nd }] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('workers').select('*'),
      supabase.from('feedback').select('*'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    if (td) setTickets(td)
    if (wd) setWorkers(wd)
    if (fd) setFeedbacks(fd)
    if (nd) setNotifications(nd)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // Realtime subscription for new tickets
    const channel = supabase
      .channel('new-tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
        setTickets(prev => [payload.new, ...prev])
        setNewTicketAlert(true)
        setNotifications(prev => [{
          id: Date.now(), ticket_id: payload.new.id,
          tracking_code: payload.new.tracking_code,
          nom: payload.new.nom,
          message_admin: `New ticket from ${payload.new.nom} — ${payload.new.problem_type}`,
          type: 'new_ticket', read_by_admin: false,
          created_at: new Date().toISOString()
        }, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter(n => !n.read_by_admin).length

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read_by_admin: true }).eq('read_by_admin', false)
    setNotifications(prev => prev.map(n => ({ ...n, read_by_admin: true })))
    setNewTicketAlert(false)
  }

  const updateStatus = async (ticketId, newStatus) => {
    setUpdating(true)
    const updateData = { statut: newStatus }
    if (newStatus === 'Résolu') updateData.resolved_at = new Date().toISOString()

    await supabase.from('tickets').update(updateData).eq('id', ticketId)

    // Create notification for student
    const ticket = tickets.find(t => t.id === ticketId)
    if (ticket) {
      await supabase.from('notifications').insert([{
        ticket_id: ticketId,
        tracking_code: ticket.tracking_code,
        nom: ticket.nom,
        message_student: `Your ticket ${ticket.tracking_code} is now: ${newStatus}`,
        type: 'status_update',
        read_by_admin: true,
      }])
    }

    setUpdating(false)
    fetchAll()
    setSelectedTicket(prev => prev ? { ...prev, statut: newStatus, resolved_at: newStatus === 'Résolu' ? new Date().toISOString() : prev.resolved_at } : null)
  }

  const saveNote = async () => {
    if (!selectedTicket) return
    setSavingNote(true)
    await supabase.from('tickets').update({ admin_note: adminNote, assigned_workers: assignedWorkers }).eq('id', selectedTicket.id)
    setSavingNote(false)
    setSelectedTicket(prev => ({ ...prev, admin_note: adminNote, assigned_workers: assignedWorkers }))
    fetchAll()
  }

  const exportToExcel = (data, filename) => {
    const rows = data.map(t => ({
      'Code': t.tracking_code,
      'Student': t.nom,
      'Room': t.chambre,
      'Pavilion': t.pavillon,
      'Location': t.location,
      'Exact Location': t.exact_location,
      'Problem Type': t.problem_type,
      'Priority': t.priorite,
      'Status': t.statut,
      'Description': t.description,
      'Availability': t.availability,
      'Admin Note': t.admin_note,
      'Assigned Workers': t.assigned_workers,
      'Submitted': new Date(t.created_at).toLocaleString(),
      'Resolved': t.resolved_at ? new Date(t.resolved_at).toLocaleString() : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets')
    XLSX.writeFile(wb, `${filename}.xlsx`)
    setShowExportMenu(false)
  }

  // Stats
  const total = tickets.length
  const pending = tickets.filter(t => t.statut === 'En attente').length
  const inProgress = tickets.filter(t => t.statut === 'En cours').length
  const resolved = tickets.filter(t => t.statut === 'Résolu').length
  const urgent = tickets.filter(t => t.priorite === 'High' && t.statut !== 'Résolu').length

  // Chart data
  const byType = Object.entries(
    tickets.reduce((acc, t) => { acc[t.problem_type] = (acc[t.problem_type] || 0) + 1; return acc }, {})
  ).map(([label, count]) => ({ label, count })).sort((a,b) => b.count - a.count)

  const byLocation = Object.entries(
    tickets.reduce((acc, t) => { acc[t.location] = (acc[t.location] || 0) + 1; return acc }, {})
  ).map(([label, count]) => ({ label, count })).sort((a,b) => b.count - a.count)

  const byRoom = Object.entries(
    tickets.reduce((acc, t) => {
      const key = `${t.chambre} / ${t.pavillon}`
      acc[key] = (acc[key] || 0) + 1; return acc
    }, {})
  ).map(([label, count]) => ({ label, count })).sort((a,b) => b.count - a.count)

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
    : null

  // Filtered tickets
  const filtered = tickets.filter(t => {
    const matchesFilter = filter === 'all' || t.statut === filter || t.priorite === filter
    const matchesSearch = !search ||
      t.nom?.toLowerCase().includes(search.toLowerCase()) ||
      t.tracking_code?.toLowerCase().includes(search.toLowerCase()) ||
      t.problem_type?.toLowerCase().includes(search.toLowerCase()) ||
      t.chambre?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div dir={txt.dir} className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <div className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            {chef['Nom']?.[0]}{chef['Prénom']?.[0]}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">{chef['Nom']} {chef['Prénom']}</p>
            <p className="text-xs text-gray-400">{txt.serviceManager}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language */}
          <div className="flex gap-1">
            {languages.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${lang === l.code ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Charts toggle */}
          <button onClick={() => setShowCharts(!showCharts)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${showCharts ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            📊 {txt.charts}
          </button>

          {/* Notifications bell */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              🔔
              {(unreadCount > 0 || newTicketAlert) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-10 w-80 bg-white border rounded-xl shadow-lg z-30 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 border-b">
                  <span className="font-semibold text-sm">{txt.notifications}</span>
                  <button onClick={markAllRead} className="text-xs text-blue-500 hover:underline">{txt.markRead}</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-6">{txt.noNotifs}</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b text-sm ${n.read_by_admin ? 'bg-white' : 'bg-blue-50'}`}>
                      <p className="font-medium text-gray-700">{n.nom}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{n.message_admin || txt.newTicket} · {n.tracking_code}</p>
                      <p className="text-gray-300 text-xs mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export */}
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              📥 {txt.exportBtn}
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-10 bg-white border rounded-xl shadow-lg z-30 w-44 overflow-hidden">
                <button onClick={() => exportToExcel(tickets, 'all-tickets')}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">{txt.exportAll}</button>
                <button onClick={() => exportToExcel(filtered, 'filtered-tickets')}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50">{txt.exportFiltered}</button>
              </div>
            )}
          </div>

          <button onClick={onLogout}
            className="text-sm text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            {txt.logout}
          </button>
        </div>
      </div>

      {/* New ticket alert banner */}
      {newTicketAlert && (
        <div className="bg-blue-600 text-white text-sm text-center py-2 flex items-center justify-center gap-3">
          <span>🔔 {txt.newTicket}!</span>
          <button onClick={() => setNewTicketAlert(false)} className="text-blue-200 hover:text-white underline text-xs">Dismiss</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: txt.total, value: total, color: 'text-gray-700', bg: 'bg-white' },
            { label: txt.pending, value: pending, color: 'text-gray-600', bg: 'bg-white' },
            { label: txt.inProgress, value: inProgress, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: txt.resolved, value: resolved, color: 'text-green-600', bg: 'bg-green-50' },
            { label: txt.urgent, value: urgent, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl border p-4 text-center shadow-sm`}>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts panel */}
        {showCharts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-sm text-gray-700 mb-4">📊 {txt.repairsByType}</h3>
              <BarChart data={byType} />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-sm text-gray-700 mb-4">📍 {txt.repairsByLocation}</h3>
              <BarChart data={byLocation} />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-sm text-gray-700 mb-4">🚨 {txt.topRooms}</h3>
              <BarChart data={byRoom} />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">⭐ {txt.feedback}</h3>
              {avgRating ? (
                <>
                  <p className="text-4xl font-bold text-yellow-500 mb-1">{avgRating} <span className="text-2xl">★</span></p>
                  <p className="text-xs text-gray-400 mb-4">{feedbacks.length} ratings</p>
                  <div className="space-y-1">
                    {[5,4,3,2,1].map(star => {
                      const count = feedbacks.filter(f => f.rating === star).length
                      const pct = feedbacks.length ? (count / feedbacks.length) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="text-yellow-400 w-4">{star}★</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3">
                            <div className="bg-yellow-400 h-3 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-400 w-4">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : <p className="text-gray-400 text-sm">{txt.noFeedback}</p>}
            </div>
          </div>
        )}

        {/* Filters + Search */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: txt.all },
              { id: 'En attente', label: txt.pending },
              { id: 'En cours', label: txt.inProgress },
              { id: 'Résolu', label: txt.resolved },
              { id: 'High', label: txt.urgent },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filter === f.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <input className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-64"
            placeholder={txt.search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table + Detail */}
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">{txt.loading}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">{txt.noTickets}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Code', txt.student, txt.room, txt.type, txt.priority, txt.status, txt.date].map(h => (
                        <th key={h} className="text-left p-3 text-xs text-gray-500 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(ticket => (
                      <tr key={ticket.id} onClick={() => {
                          setSelectedTicket(ticket)
                          setAdminNote(ticket.admin_note || '')
                          setAssignedWorkers(ticket.assigned_workers || '')
                        }}
                        className={`border-b cursor-pointer hover:bg-blue-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''}`}>
                        <td className="p-3 font-mono text-xs text-blue-500">{ticket.tracking_code}</td>
                        <td className="p-3 font-medium text-gray-700">{ticket.nom}</td>
                        <td className="p-3 text-gray-500">{ticket.chambre}</td>
                        <td className="p-3 text-gray-600">{ticket.problem_type}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors[ticket.priorite]}`}>{txt.priorities[ticket.priorite]}</span></td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[ticket.statut]}`}>{txt.statuses[ticket.statut]}</span></td>
                        <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedTicket && (
            <div className="w-96 bg-white rounded-xl border shadow-sm p-5 space-y-4 shrink-0 overflow-y-auto max-h-screen">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm font-bold text-blue-600">{selectedTicket.tracking_code}</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedTicket.nom}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="text-gray-300 hover:text-gray-500 text-lg">✕</button>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p>📍 <span className="font-medium">{txt.location}:</span> {selectedTicket.location}</p>
                {selectedTicket.exact_location && <p className="ml-5 text-xs text-gray-400">{selectedTicket.exact_location}</p>}
                <p>🔧 <span className="font-medium">{txt.type}:</span> {selectedTicket.problem_type}</p>
                <p>⚡ <span className="font-medium">{txt.priority}:</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${priorityColors[selectedTicket.priorite]}`}>{txt.priorities[selectedTicket.priorite]}</span>
                </p>
                <p>📝 <span className="font-medium">{txt.description}:</span> {selectedTicket.description}</p>
                {selectedTicket.availability && <p>🕐 <span className="font-medium">{txt.availability}:</span> {selectedTicket.availability}</p>}
                <p>📅 <span className="font-medium">{txt.submittedOn}:</span> {new Date(selectedTicket.created_at).toLocaleDateString()}</p>
                {selectedTicket.resolved_at && (
                  <p>✅ <span className="font-medium">{txt.resolvedOn}:</span> {new Date(selectedTicket.resolved_at).toLocaleString()}</p>
                )}
              </div>

              {selectedTicket.image_url && (
                <img src={selectedTicket.image_url} alt="ticket" className="w-full rounded-lg max-h-40 object-cover" onError={e => e.target.style.display='none'} />
              )}

              {/* Feedback for this ticket */}
              {(() => {
                const fb = feedbacks.find(f => f.ticket_id === selectedTicket.id)
                return fb ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-yellow-700 mb-1">⭐ Student rating</p>
                    <p className="text-yellow-500 text-lg">{'★'.repeat(fb.rating)}{'☆'.repeat(5-fb.rating)}</p>
                    {fb.note && <p className="text-xs text-gray-600 mt-1">"{fb.note}"</p>}
                  </div>
                ) : null
              })()}

              {/* Assign workers */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">👷 {txt.assignWorkers}</label>
                <input className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={txt.assignPlaceholder}
                  value={assignedWorkers}
                  onChange={e => setAssignedWorkers(e.target.value)} />
              </div>

              {/* Admin note */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📋 {txt.adminNote}</label>
                <textarea className="w-full border rounded-lg p-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={txt.adminNotePlaceholder}
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)} />
                <button onClick={saveNote} disabled={savingNote}
                  className="w-full mt-1 bg-gray-700 text-white p-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
                  {savingNote ? '...' : txt.saveNote}
                </button>
              </div>

              {/* Status update */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">{txt.changeStatus}</p>
                <div className="flex flex-col gap-2">
                  {['En attente', 'En cours', 'Résolu'].map(status => (
                    <button key={status}
                      onClick={() => updateStatus(selectedTicket.id, status)}
                      disabled={updating || selectedTicket.statut === status}
                      className={`p-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 ${
                        selectedTicket.statut === status
                          ? statusColors[status] + ' border-transparent font-semibold'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {selectedTicket.statut === status ? `✓ ${txt.statuses[status]}` : txt.statuses[status]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
