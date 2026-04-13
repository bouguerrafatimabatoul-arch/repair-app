import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'
import translations from './translations'
import { assignPriority, generateTrackingCode, nightShiftLabel } from './utils'

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
]

const priorityColors = {
  High:   'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-green-100 text-green-700 border-green-200',
}

const statusColors = {
  'En attente': 'bg-gray-100 text-gray-600',
  'En cours':   'bg-blue-100 text-blue-700',
  'Résolu':     'bg-green-100 text-green-700',
}

const NEEDS_AVAILABILITY = ['room']

// ── Translation maps ───────────────────────────────────────────────────────────
const PM = {
  'Electricity':{en:'Electricity',fr:'Électricité',ar:'الكهرباء'},
  'Électricité':{en:'Electricity',fr:'Électricité',ar:'الكهرباء'},
  'الكهرباء':{en:'Electricity',fr:'Électricité',ar:'الكهرباء'},
  'Heating':{en:'Heating',fr:'Chauffage',ar:'التدفئة'},
  'Chauffage':{en:'Heating',fr:'Chauffage',ar:'التدفئة'},
  'التدفئة':{en:'Heating',fr:'Chauffage',ar:'التدفئة'},
  'Furniture':{en:'Furniture',fr:'Mobilier',ar:'الأثاث'},
  'Mobilier':{en:'Furniture',fr:'Mobilier',ar:'الأثاث'},
  'الأثاث':{en:'Furniture',fr:'Mobilier',ar:'الأثاث'},
  'Door / Window':{en:'Door / Window',fr:'Porte / Fenêtre',ar:'باب / نافذة'},
  'Porte / Fenêtre':{en:'Door / Window',fr:'Porte / Fenêtre',ar:'باب / نافذة'},
  'باب / نافذة':{en:'Door / Window',fr:'Porte / Fenêtre',ar:'باب / نافذة'},
  'Lighting':{en:'Lighting',fr:'Éclairage',ar:'الإضاءة'},
  'Éclairage':{en:'Lighting',fr:'Éclairage',ar:'الإضاءة'},
  'الإضاءة':{en:'Lighting',fr:'Éclairage',ar:'الإضاءة'},
  'Doors':{en:'Doors',fr:'Portes',ar:'الأبواب'},
  'Portes':{en:'Doors',fr:'Portes',ar:'الأبواب'},
  'الأبواب':{en:'Doors',fr:'Portes',ar:'الأبواب'},
  'Security':{en:'Security',fr:'Sécurité',ar:'الأمن'},
  'Sécurité':{en:'Security',fr:'Sécurité',ar:'الأمن'},
  'الأمن':{en:'Security',fr:'Sécurité',ar:'الأمن'},
  'Cleanliness':{en:'Cleanliness',fr:'Propreté',ar:'النظافة'},
  'Propreté':{en:'Cleanliness',fr:'Propreté',ar:'النظافة'},
  'النظافة':{en:'Cleanliness',fr:'Propreté',ar:'النظافة'},
  'Plumbing':{en:'Plumbing',fr:'Plomberie',ar:'السباكة'},
  'Plomberie':{en:'Plumbing',fr:'Plomberie',ar:'السباكة'},
  'السباكة':{en:'Plumbing',fr:'Plomberie',ar:'السباكة'},
  'Water Leakage':{en:'Water Leakage',fr:"Fuite d'eau",ar:'تسرب المياه'},
  "Fuite d'eau":{en:'Water Leakage',fr:"Fuite d'eau",ar:'تسرب المياه'},
  'تسرب المياه':{en:'Water Leakage',fr:"Fuite d'eau",ar:'تسرب المياه'},
  'Other':{en:'Other',fr:'Autre',ar:'أخرى'},
  'Autre':{en:'Other',fr:'Autre',ar:'أخرى'},
  'أخرى':{en:'Other',fr:'Autre',ar:'أخرى'},
}
const LM = {
  'Room':{en:'Room',fr:'Chambre',ar:'الغرفة'},
  'Chambre':{en:'Room',fr:'Chambre',ar:'الغرفة'},
  'الغرفة':{en:'Room',fr:'Chambre',ar:'الغرفة'},
  'Pavilion':{en:'Pavilion',fr:'Pavillon',ar:'الجناح'},
  'Pavillon':{en:'Pavilion',fr:'Pavillon',ar:'الجناح'},
  'الجناح':{en:'Pavilion',fr:'Pavillon',ar:'الجناح'},
  'Toilets':{en:'Toilets',fr:'Toilettes',ar:'الحمامات'},
  'Toilettes':{en:'Toilets',fr:'Toilettes',ar:'الحمامات'},
  'الحمامات':{en:'Toilets',fr:'Toilettes',ar:'الحمامات'},
}
const SM = {
  'En attente':{en:'Pending',fr:'En attente',ar:'قيد الانتظار'},
  'En cours':{en:'In Progress',fr:'En cours',ar:'جارٍ المعالجة'},
  'Résolu':{en:'Completed',fr:'Résolu',ar:'تم الحل'},
}
const PrioM = {
  High:{en:'High',fr:'Haute',ar:'عالية'},
  Medium:{en:'Medium',fr:'Moyenne',ar:'متوسطة'},
  Low:{en:'Low',fr:'Faible',ar:'منخفضة'},
}
const tf = (v, lang, map) => map?.[v]?.[lang] ?? v

// ── Duplicate-check: normalise a problem_type to its English key ───────────────
const toEnKey = (v) => PM[v]?.en ?? v
const toEnLoc = (v) => LM[v]?.en ?? v

// ── FeedbackWidget — defined OUTSIDE main to prevent remounting ────────────────
function FeedbackWidget({ ticket, existingFeedback, lang, t, onSubmit }) {
  const [rating, setRating] = useState(0)
  const [note,   setNote]   = useState('')
  const [done,   setDone]   = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return
    setSaving(true)
    await onSubmit(ticket, rating, note)
    setDone(true)
    setSaving(false)
  }

  if (existingFeedback || done) {
    const r = existingFeedback?.rating ?? rating
    return (
      <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mt-3">
        <p className="text-xs font-medium text-yellow-700 mb-1">⭐ {t.feedbackThanks}</p>
        <p className="text-yellow-400 text-lg">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</p>
      </div>
    )
  }

  return (
    <div className="border-t pt-3 mt-3">
      <p className="text-sm font-medium text-gray-700 mb-2">{t.feedbackPrompt}</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(star => (
          <button key={star} type="button" onClick={() => setRating(star)}
            className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>
            ★
          </button>
        ))}
      </div>
      <textarea
        className="w-full border rounded-lg p-2 text-sm h-20 resize-none mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder={t.feedbackNotePlaceholder}
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <button type="button" onClick={handleSubmit} disabled={rating === 0 || saving}
        className="w-full bg-green-600 text-white p-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
        {saving ? '...' : t.feedbackSubmit}
      </button>
    </div>
  )
}

// ── TicketCard — defined OUTSIDE main ─────────────────────────────────────────
function TicketCard({ ticket, lang, t, feedbacks, onFeedbackSubmit }) {
  const priorityColor  = priorityColors[ticket.priorite]  || 'bg-gray-100 text-gray-600 border-gray-200'
  const statusColor    = statusColors[ticket.statut]       || 'bg-gray-100 text-gray-600'
  const existingFeedback = feedbacks.find(f => f.ticket_id === ticket.id)

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="font-medium text-sm">{tf(ticket.problem_type, lang, PM)}</span>
          <span className="text-xs text-gray-400 ml-2">· {tf(ticket.location, lang, LM)}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
          {tf(ticket.statut, lang, SM)}
        </span>
      </div>

      {ticket.exact_location && (
        <p className="text-xs text-gray-400 mb-1">📍 {ticket.exact_location}</p>
      )}
      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{ticket.description}</p>

      {ticket.admin_note && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mb-2">
          <p className="text-xs text-blue-600 font-medium mb-0.5">
            📋 {lang === 'ar' ? 'ملاحظة الإدارة' : lang === 'fr' ? 'Note admin' : 'Admin note'}
          </p>
          <p className="text-xs text-blue-700">{ticket.admin_note}</p>
        </div>
      )}

      {ticket.resolved_at && (
        <p className="text-xs text-green-600 mb-1">
          ✅ {lang === 'ar' ? 'تم الحل:' : lang === 'fr' ? 'Résolu le:' : 'Resolved:'} {new Date(ticket.resolved_at).toLocaleString()}
        </p>
      )}

      <div className="flex justify-between items-center">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor}`}>
          {tf(ticket.priorite, lang, PrioM)}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-blue-400">{ticket.tracking_code}</span>
          <span className="text-xs text-gray-300">{new Date(ticket.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {ticket.image_url && (
        <img src={ticket.image_url} alt="ticket"
          className="mt-2 w-full rounded-lg max-h-40 object-cover"
          onError={e => e.target.style.display = 'none'} />
      )}

      {/* FIX 3: feedback only shows on resolved tickets */}
      {ticket.statut === 'Résolu' && (
        <FeedbackWidget
          ticket={ticket}
          existingFeedback={existingFeedback}
          lang={lang}
          t={t}
          onSubmit={onFeedbackSubmit}
        />
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TicketForm({ student, onLogout, lang, setLang }) {
  const t = translations[lang]
  const [view, setView] = useState('form')

  // Form state
  const [location,          setLocation]          = useState('')
  const [exactLocation,     setExactLocation]      = useState('')
  const [problemType,       setProblemType]         = useState('')
  const [priority,          setPriority]            = useState('')
  const [description,       setDescription]         = useState('')
  const [availability,      setAvailability]        = useState('')
  const [availabilityStart, setAvailabilityStart]   = useState('')
  const [availabilityEnd,   setAvailabilityEnd]     = useState('')
  const [imageFile,         setImageFile]           = useState(null)
  const [imagePreview,      setImagePreview]        = useState(null)
  const [message,           setMessage]             = useState('')
  const [submitting,        setSubmitting]          = useState(false)
  const [trackingCode,      setTrackingCode]        = useState('')
  const fileRef = useRef()

  // Data
  const [tickets,       setTickets]       = useState([])
  const [loadingTickets,setLoadingTickets]= useState(false)
  const [feedbacks,     setFeedbacks]     = useState([])

  // Track view
  const [trackInput,    setTrackInput]    = useState('')
  const [trackedTicket, setTrackedTicket] = useState(null)
  const [trackError,    setTrackError]    = useState('')

  // Notifications
  const [notifications, setNotifications] = useState([])
  const [showNotifs,    setShowNotifs]    = useState(false)
  const notifRef = useRef(null)

  // ── FIX 1: Notification fetch — query by ticket_id membership, not just nom ──
  // We fetch all status_update notifications where the tracking_code belongs to
  // this student. This works even if read_by_student column doesn't exist yet.
  const fetchNotifications = useCallback(async () => {
    // First get the student's ticket tracking codes
    const { data: myTickets } = await supabase
      .from('tickets')
      .select('tracking_code')
      .eq('nom', student['Nom'])

    if (!myTickets || myTickets.length === 0) return

    const codes = myTickets.map(t => t.tracking_code)

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'status_update')
      .in('tracking_code', codes)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) setNotifications(data)
  }, [student])

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true)
    const [{ data: td }, { data: fd }] = await Promise.all([
      supabase.from('tickets').select('*').eq('nom', student['Nom']).order('created_at', { ascending: false }),
      // FIX 2: fetch feedbacks by nom too so we catch all of the student's feedback
      supabase.from('feedback').select('*').eq('nom', student['Nom']),
    ])
    if (td) setTickets(td)
    if (fd) setFeedbacks(fd)
    setLoadingTickets(false)
  }, [student])

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    fetchNotifications()

    const safeName = student['Nom'].replace(/[^a-zA-Z0-9]/g, '_')

    // Listen for new status_update notifications whose tracking_code belongs
    // to this student — handled by filtering inside the callback
    const notifChannel = supabase
      .channel('student-notifs-' + safeName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const n = payload.new
        // Only care about status updates directed at this student
        if (n.type === 'status_update' && n.nom === student['Nom']) {
          setNotifications(prev => [n, ...prev])
        }
      })
      .subscribe()

    // Listen for ticket updates (status changes, admin notes, etc.)
    const ticketChannel = supabase
      .channel('student-tickets-' + safeName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, payload => {
        if (payload.new.nom === student['Nom']) {
          setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
          setTrackedTicket(prev => prev?.id === payload.new.id ? payload.new : prev)
        }
      })
      .subscribe()

    // FIX 2: Listen for new feedback rows so dashboard updates in realtime
    const feedbackChannel = supabase
      .channel('student-feedback-' + safeName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, payload => {
        if (payload.new.nom === student['Nom']) {
          setFeedbacks(prev => {
            // Avoid duplicates (we also insert locally below)
            if (prev.some(f => f.ticket_id === payload.new.ticket_id)) return prev
            return [...prev, payload.new]
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(ticketChannel)
      supabase.removeChannel(feedbackChannel)
    }
  }, [student, fetchNotifications])

  // Close notif dropdown on outside click
  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => { if (view === 'tickets') fetchTickets() }, [view, fetchTickets])

  const unreadNotifs = notifications.filter(n => !n.read_by_student).length

  // FIX 1: mark notifications read using tracking_code IN list (no read_by_student dependency)
  const markNotifsRead = async () => {
    const unread = notifications.filter(n => !n.read_by_student)
    if (unread.length === 0) return
    const ids = unread.map(n => n.id).filter(Boolean)
    if (ids.length > 0) {
      try {
        await supabase.from('notifications').update({ read_by_student: true }).in('id', ids)
      } catch {
        // Column may not exist — silently ignore, local state still updates
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, read_by_student: true })))
  }

  // ── Form logic ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setProblemType(''); setPriority(''); setExactLocation('')
    setAvailability(''); setAvailabilityStart(''); setAvailabilityEnd('')
  }, [location])

  useEffect(() => {
    if (problemType) setPriority(assignPriority(problemType))
  }, [problemType])

  const handleImageChange = e => {
    const file = e.target.files[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { alert('Please use JPG, PNG or WEBP images only.'); return }
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async (file, code) => {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `tickets/${code}.${ext}`
    const { error } = await supabase.storage.from('ticket-images').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('Upload error:', error); return null }
    const { data } = supabase.storage.from('ticket-images').getPublicUrl(path)
    return data.publicUrl
  }

  // ── FIX 3: Duplicate detection before submit ───────────────────────────────
  // Normalise to English keys so "Électricité" and "Electricity" are the same.
  const checkDuplicate = async () => {
    const enProblemType = toEnKey(problemType)
    const enLocation    = toEnLoc(t.locations?.[location] || location)

    // Fetch all non-resolved tickets for this student
    const { data } = await supabase
      .from('tickets')
      .select('id, problem_type, location, statut')
      .eq('nom', student['Nom'])
      .neq('statut', 'Résolu')

    if (!data) return null

    return data.find(existing => {
      return toEnKey(existing.problem_type) === enProblemType &&
             toEnLoc(existing.location) === enLocation
    }) || null
  }

  const handleSubmit = async () => {
    setMessage('')
    if (!location || !problemType || !description) { setMessage(t.fillAll); return }
    if (location !== 'room' && !exactLocation.trim()) { setMessage(t.fillExactLocation); return }

    const isNightShift = availability === nightShiftLabel[lang]
    if (NEEDS_AVAILABILITY.includes(location) && !isNightShift) {
      if (!availabilityStart || !availabilityEnd) { setMessage(t.fillAll); return }
      if (availabilityEnd <= availabilityStart) {
        setMessage(t.dir === 'rtl'
          ? 'وقت النهاية يجب أن يكون بعد وقت البداية'
          : 'End time must be after start time')
        return
      }
    }

    // FIX 3: block duplicate before any network write
    setSubmitting(true)
    const duplicate = await checkDuplicate()
    if (duplicate) {
      const dupMsg = {
        en: `You already have an open request for this problem (${tf(duplicate.problem_type,'en',PM)}) — please wait for it to be resolved before submitting a new one.`,
        fr: `Vous avez déjà une demande ouverte pour ce problème (${tf(duplicate.problem_type,'fr',PM)}) — veuillez attendre qu'elle soit résolue avant d'en soumettre une nouvelle.`,
        ar: `لديك طلب مفتوح بالفعل لهذه المشكلة (${tf(duplicate.problem_type,'ar',PM)}) — يرجى الانتظار حتى يتم حله قبل تقديم طلب جديد.`,
      }
      setMessage(dupMsg[lang] || dupMsg.en)
      setSubmitting(false)
      return
    }

    const code = generateTrackingCode()
    let imageUrl = null
    if (imageFile) imageUrl = await uploadImage(imageFile, code)

    const finalAvailability = isNightShift ? nightShiftLabel[lang]
      : availabilityStart && availabilityEnd ? `${availabilityStart} → ${availabilityEnd}` : null

    const { error } = await supabase.from('tickets').insert([{
      tracking_code:  code,
      nom:            student['Nom'],
      chambre:        student['Chambre'],
      pavillon:       student['Pavillon'],
      location:       t.locations[location],
      exact_location: location === 'room'
        ? `${t.room} ${student['Chambre']} — ${t.pavilion} ${student['Pavillon']}`
        : exactLocation,
      problem_type:   problemType,
      priorite:       priority,
      description,
      availability:   NEEDS_AVAILABILITY.includes(location) ? finalAvailability : null,
      image_url:      imageUrl,
      statut:         'En attente',
    }])

    if (!error) {
      // Insert admin notification (dashboard picks this up via realtime)
      await supabase.from('notifications').insert([{
        tracking_code:  code,
        nom:            student['Nom'],
        message_admin:  `${student['Nom']} — ${problemType}`,
        type:           'new_ticket',
        read_by_admin:  false,
      }])
    }

    setSubmitting(false)
    if (error) { setMessage('Error: ' + error.message); return }

    setTrackingCode(code)
    setView('success')
    // Reset form
    setLocation(''); setProblemType(''); setPriority('')
    setDescription(''); setAvailability(''); setExactLocation('')
    setAvailabilityStart(''); setAvailabilityEnd('')
    setImageFile(null); setImagePreview(null)
  }

  const handleTrack = async () => {
    setTrackError(''); setTrackedTicket(null)
    const { data, error } = await supabase
      .from('tickets').select('*')
      .eq('tracking_code', trackInput.trim().toUpperCase()).single()
    if (error || !data) setTrackError(t.trackNotFound)
    else setTrackedTicket(data)
  }

  // FIX 2: handleFeedbackSubmit now saves ALL required fields including tracking_code
  // so the dashboard can join/display them correctly
  const handleFeedbackSubmit = async (ticket, rating, note) => {
    const { data, error } = await supabase.from('feedback').insert([{
      ticket_id:     ticket.id,
      tracking_code: ticket.tracking_code,   // ← was missing — dashboard needs this
      nom:           student['Nom'],
      chambre:       student['Chambre'],
      pavillon:      student['Pavillon'],
      rating,
      note: note || null,
    }]).select().single()

    if (!error && data) {
      // Update local state with the real DB row (has id, created_at, etc.)
      setFeedbacks(prev => {
        if (prev.some(f => f.ticket_id === data.ticket_id)) return prev
        return [...prev, data]
      })
    }
  }

  // ── Shared UI components ───────────────────────────────────────────────────
  const Header = () => (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex justify-between items-center">
      <div>
        <h1 className="font-bold text-base">🔧 {t.appTitle}</h1>
        <p className="text-xs text-gray-400">
          {student['Nom']} · {t.room} {student['Chambre']} · {t.pavilion} {student['Pavillon']}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <div className="flex gap-1">
          {languages.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${lang === l.code ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markNotifsRead() }}
            className="relative p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
            🔔
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-9 w-72 bg-white border rounded-xl shadow-lg z-30 overflow-hidden">
              <div className="px-4 py-3 border-b flex justify-between items-center">
                <span className="font-semibold text-sm">
                  🔔 {lang === 'ar' ? 'الإشعارات' : lang === 'fr' ? 'Notifications' : 'Notifications'}
                </span>
                {notifications.length > 0 && (
                  <button onClick={markNotifsRead} className="text-xs text-blue-500 hover:underline">
                    {lang === 'ar' ? 'تحديد كمقروء' : lang === 'fr' ? 'Tout lire' : 'Mark all read'}
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">
                    {lang === 'ar' ? 'لا توجد إشعارات' : lang === 'fr' ? 'Aucune notification' : 'No notifications yet'}
                  </p>
                ) : notifications.map((n, i) => (
                  <div key={n.id || i}
                    className={`px-4 py-3 text-sm ${!n.read_by_student ? 'bg-blue-50' : 'bg-white'}`}>
                    <div className="flex items-start gap-2">
                      {!n.read_by_student && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-xs font-medium leading-snug">
                          {n.message_student || (
                            lang === 'ar' ? `تم تحديث حالة طلبك ${n.tracking_code}`
                            : lang === 'fr' ? `Votre demande ${n.tracking_code} a été mise à jour`
                            : `Your request ${n.tracking_code} was updated`
                          )}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={onLogout} className="text-xs text-red-400 hover:underline">{t.logout}</button>
      </div>
    </div>
  )

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex z-10">
      {[
        { id: 'form',    icon: '✏️', label: t.newRequest },
        { id: 'tickets', icon: '📋', label: t.myTickets },
        { id: 'track',   icon: '🔍', label: t.trackNav },
      ].map(tab => (
        <button key={tab.id} onClick={() => setView(tab.id)}
          className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-0.5 transition-colors ${view === tab.id ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-400'}`}>
          <span style={{ fontSize: 16 }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )

  // ── Views ──────────────────────────────────────────────────────────────────

  if (view === 'success') {
    return (
      <div dir={t.dir} className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">{t.successTitle}</h2>
          <p className="text-gray-500 text-sm mb-6">{t.successMsg}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
            <p className="text-xs text-blue-500 mb-1">{t.trackingCode}</p>
            <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">{trackingCode}</p>
          </div>
          <p className="text-xs text-gray-400 mb-6">{t.screenshotNote}</p>
          <button onClick={() => setView('form')}
            className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 mb-3 text-sm">
            {t.trackAnother}
          </button>
          <button onClick={() => { fetchTickets(); setView('tickets') }}
            className="w-full border border-gray-200 text-gray-600 p-2 rounded-lg hover:bg-gray-50 text-sm">
            {t.myTickets}
          </button>
        </div>
      </div>
    )
  }

  if (view === 'track') {
    return (
      <div dir={t.dir} className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-lg mx-auto p-4">
          <Header />
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">{t.trackTitle}</h2>
            <div className="flex gap-2 mb-4">
              <input
                className="flex-1 border rounded-lg p-2 text-sm font-mono uppercase"
                placeholder={t.trackPlaceholder}
                value={trackInput}
                onChange={e => setTrackInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
              />
              <button onClick={handleTrack}
                className="bg-blue-600 text-white px-4 rounded-lg text-sm hover:bg-blue-700">
                {t.trackBtn}
              </button>
            </div>

            {trackError && <p className="text-red-500 text-sm">{trackError}</p>}

            {trackedTicket && (
              <div className="border rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm font-bold text-blue-600">{trackedTicket.tracking_code}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[trackedTicket.statut] || 'bg-gray-100 text-gray-600'}`}>
                    {tf(trackedTicket.statut, lang, SM)}
                  </span>
                </div>
                <div className="text-sm space-y-1.5 text-gray-600">
                  <p>📍 <span className="font-medium">{t.locationLabel}:</span> {tf(trackedTicket.location, lang, LM)}</p>
                  {trackedTicket.exact_location && (
                    <p className="ml-5 text-xs text-gray-400">{trackedTicket.exact_location}</p>
                  )}
                  <p>🔧 <span className="font-medium">{t.typeLabel}:</span> {tf(trackedTicket.problem_type, lang, PM)}</p>
                  <p>⚡ <span className="font-medium">{t.priorityLabel}:</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs border ${priorityColors[trackedTicket.priorite] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {tf(trackedTicket.priorite, lang, PrioM)}
                    </span>
                  </p>
                  <p>📝 <span className="font-medium">{t.descLabel}:</span> {trackedTicket.description}</p>
                  {trackedTicket.availability && (
                    <p>🕐 <span className="font-medium">{t.availabilityLabel}:</span> {trackedTicket.availability}</p>
                  )}
                  <p>📅 <span className="font-medium">{t.dateLabel}:</span> {new Date(trackedTicket.created_at).toLocaleDateString()}</p>
                  {trackedTicket.resolved_at && (
                    <p>✅ <span className="font-medium">
                      {lang === 'ar' ? 'تاريخ الحل' : lang === 'fr' ? 'Résolu le' : 'Resolved'}:
                    </span> {new Date(trackedTicket.resolved_at).toLocaleString()}</p>
                  )}
                </div>

                {trackedTicket.admin_note && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-600 mb-1">
                      📋 {lang === 'ar' ? 'ملاحظة الإدارة' : lang === 'fr' ? 'Note admin' : 'Note from admin'}
                    </p>
                    <p className="text-sm text-blue-700">{trackedTicket.admin_note}</p>
                  </div>
                )}

                {trackedTicket.image_url && (
                  <img src={trackedTicket.image_url} alt="ticket"
                    className="w-full rounded-lg mt-2 max-h-48 object-cover"
                    onError={e => e.target.style.display = 'none'} />
                )}

                {trackedTicket.statut === 'Résolu' && (
                  <FeedbackWidget
                    ticket={trackedTicket}
                    existingFeedback={feedbacks.find(f => f.ticket_id === trackedTicket.id)}
                    lang={lang}
                    t={t}
                    onSubmit={handleFeedbackSubmit}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (view === 'tickets') {
    return (
      <div dir={t.dir} className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-lg mx-auto p-4">
          <Header />
          {loadingTickets && (
            <p className="text-center text-gray-400 text-sm py-8">...</p>
          )}
          {!loadingTickets && tickets.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400 text-sm">
              {t.noTickets}
            </div>
          )}
          <div className="space-y-3">
            {tickets.map(ticket => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                lang={lang}
                t={t}
                feedbacks={feedbacks}
                onFeedbackSubmit={handleFeedbackSubmit}
              />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  const needsAvailability = NEEDS_AVAILABILITY.includes(location)
  const isHighPriority    = priority === 'High'
  const timeError         = availabilityStart && availabilityEnd && availabilityEnd <= availabilityStart

  return (
    <div dir={t.dir} className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto p-4">
        <Header />
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.location} *</label>
            <div className="flex gap-2">
              {Object.entries(t.locations).map(([key, label]) => (
                <button key={key} onClick={() => setLocation(key)}
                  className={`flex-1 p-2 rounded-lg border text-sm font-medium transition-colors ${location === key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Exact location */}
          {location && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                📍 {lang === 'ar' ? 'الموقع الدقيق' : lang === 'fr' ? 'Emplacement exact' : 'Exact location'}
              </p>
              {location === 'room' ? (
                <p className="text-sm font-medium text-gray-700">
                  {t.room} {student['Chambre']} — {t.pavilion} {student['Pavillon']}
                </p>
              ) : (
                <input
                  className="w-full bg-white border rounded-lg p-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={t.exactLocationPlaceholder?.[location] || ''}
                  value={exactLocation}
                  onChange={e => setExactLocation(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Problem type */}
          {location && t.problemTypes?.[location] && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.problemType} *</label>
              <div className="grid grid-cols-2 gap-2">
                {t.problemTypes[location].map(type => (
                  <button key={type} onClick={() => setProblemType(type)}
                    className={`p-2 rounded-lg border text-sm text-start transition-colors ${problemType === type ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Priority (auto) */}
          {priority && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t.priorityAuto}:</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium border ${priorityColors[priority]}`}>
                  {tf(priority, lang, PrioM)}
                </span>
              </div>
              {isHighPriority && <p className="text-xs text-red-500">{t.priorityHighNote}</p>}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.description} *</label>
            <textarea
              className="w-full border rounded-lg p-3 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={t.descriptionPlaceholder}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Availability */}
          {needsAvailability && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.availability} *</label>
              <p className="text-xs text-gray-400 mb-3">{t.availabilityNote}</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">{t.dir === 'rtl' ? 'من' : 'From'}</label>
                  <input type="time" min="08:00" max="17:00"
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={availabilityStart}
                    onChange={e => { setAvailabilityStart(e.target.value); setAvailability('') }} />
                </div>
                <span className="text-gray-400 pb-2">→</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">{t.dir === 'rtl' ? 'إلى' : 'To'}</label>
                  <input type="time" min="08:00" max="17:00"
                    className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={availabilityEnd}
                    onChange={e => { setAvailabilityEnd(e.target.value); setAvailability('') }} />
                </div>
              </div>
              {timeError && (
                <p className="text-red-400 text-xs mt-1">
                  {t.dir === 'rtl' ? 'وقت النهاية يجب أن يكون بعد وقت البداية' : 'End time must be after start time'}
                </p>
              )}
              {isHighPriority && (
                <button
                  onClick={() => { setAvailabilityStart(''); setAvailabilityEnd(''); setAvailability(nightShiftLabel[lang]) }}
                  className={`mt-3 w-full p-2 rounded-lg border text-sm transition-colors ${availability === nightShiftLabel[lang] ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-500 hover:bg-red-50'}`}>
                  {nightShiftLabel[lang]}
                </button>
              )}
            </div>
          )}

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.image}</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              ref={fileRef} className="hidden" onChange={handleImageChange} />
            <button onClick={() => fileRef.current.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">
              {imageFile ? `✅ ${t.imageSelected}: ${imageFile.name}` : `📷 ${t.imageBtn}`}
            </button>
            {imagePreview && (
              <img src={imagePreview} alt="preview" className="mt-2 w-full rounded-lg max-h-40 object-cover" />
            )}
          </div>

          {/* Error / duplicate message */}
          {message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{message}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !!timeError}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {submitting ? '...' : t.submit}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}