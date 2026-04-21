import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'
import translations from './translations'
import { assignPriority, generateTrackingCode, nightShiftLabel } from './utils'
import { PM, LM, SM, PrioM, tf, toEnKey, toEnLoc } from './constants'

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
]

const priorityColors = {
  High:   'text-red-400 border border-red-500/30',
  Medium: 'text-amber-400 border border-amber-500/30',
  Low:    'text-emerald-400 border border-emerald-500/30',
}
const priorityBg = {
  High:   'rgba(239,68,68,0.1)',
  Medium: 'rgba(245,158,11,0.1)',
  Low:    'rgba(16,185,129,0.1)',
}

const statusColors = {
  'En attente': 'text-amber-400',
  'En cours':   'text-blue-400',
  'Résolu':     'text-emerald-400',
}
const statusBg = {
  'En attente': 'rgba(245,158,11,0.1)',
  'En cours':   'rgba(59,130,246,0.1)',
  'Résolu':     'rgba(16,185,129,0.1)',
}
const statusBorder = {
  'En attente': 'rgba(245,158,11,0.25)',
  'En cours':   'rgba(59,130,246,0.25)',
  'Résolu':     'rgba(16,185,129,0.25)',
}

const NEEDS_AVAILABILITY = ['room']


const glassCard = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
}
const glassInput = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0',
}

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
      <div className="rounded-xl p-3 mt-3" style={{background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.15)'}}>
        <p className="text-xs font-medium mb-1" style={{color:'rgba(251,191,36,0.7)'}}>⭐ {t.feedbackThanks}</p>
        <p className="text-lg" style={{color:'#fbbf24'}}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</p>
      </div>
    )
  }

  return (
    <div className="pt-3 mt-3" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
      <p className="text-sm font-medium mb-2" style={{color:'rgba(255,255,255,0.7)'}}>{t.feedbackPrompt}</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(star => (
          <button key={star} type="button" onClick={() => setRating(star)}
            className="text-2xl transition-transform hover:scale-110"
            style={{color: star <= rating ? '#fbbf24' : 'rgba(255,255,255,0.15)'}}>
            ★
          </button>
        ))}
      </div>
      <textarea
        className="w-full rounded-xl p-2 text-sm h-20 resize-none mb-2 focus:outline-none transition-all"
        style={glassInput}
        placeholder={t.feedbackNotePlaceholder}
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <button type="button" onClick={handleSubmit} disabled={rating === 0 || saving}
        className="w-full py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
        style={{background:'rgba(16,185,129,0.2)',color:'#34d399',border:'1px solid rgba(16,185,129,0.3)'}}>
        {saving ? '...' : t.feedbackSubmit}
      </button>
    </div>
  )
}

// ── TicketCard — defined OUTSIDE main ─────────────────────────────────────────
function TicketCard({ ticket, lang, t, feedbacks, onFeedbackSubmit }) {
  const existingFeedback = feedbacks.find(f => f.ticket_id === ticket.id)

  return (
    <div className="rounded-xl p-4" style={glassCard}>
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="font-medium text-sm" style={{color:'#e2e8f0'}}>{tf(ticket.problem_type, lang, PM)}</span>
          <span className="text-xs ml-2" style={{color:'rgba(255,255,255,0.3)'}}>· {tf(ticket.location, lang, LM)}</span>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium"
          style={{background:statusBg[ticket.statut],color:ticket.statut==='En attente'?'#fbbf24':ticket.statut==='En cours'?'#60a5fa':'#34d399',border:`1px solid ${statusBorder[ticket.statut]}`}}>
          {tf(ticket.statut, lang, SM)}
        </span>
      </div>

      {ticket.exact_location && (
        <p className="text-xs mb-1" style={{color:'rgba(255,255,255,0.3)'}}>📍 {ticket.exact_location}</p>
      )}
      <p className="text-sm mb-2 line-clamp-2" style={{color:'rgba(255,255,255,0.5)'}}>{ticket.description}</p>

      {ticket.admin_note && (
        <div className="rounded-lg p-2 mb-2" style={{background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.15)'}}>
          <p className="text-xs font-medium mb-0.5" style={{color:'rgba(96,165,250,0.7)'}}>
            📋 {lang === 'ar' ? 'ملاحظة الإدارة' : lang === 'fr' ? 'Note admin' : 'Admin note'}
          </p>
          <p className="text-xs" style={{color:'#93c5fd'}}>{ticket.admin_note}</p>
        </div>
      )}

      {ticket.resolved_at && (
        <p className="text-xs mb-1" style={{color:'#34d399'}}>
          ✅ {lang === 'ar' ? 'تم الحل:' : lang === 'fr' ? 'Résolu le:' : 'Resolved:'} {new Date(ticket.resolved_at).toLocaleString()}
        </p>
      )}

      <div className="flex justify-between items-center">
        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[ticket.priorite]}`}
          style={{background:priorityBg[ticket.priorite]}}>
          {tf(ticket.priorite, lang, PrioM)}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{color:'#60a5fa'}}>{ticket.tracking_code}</span>
          <span className="text-xs" style={{color:'rgba(255,255,255,0.2)'}}>{new Date(ticket.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {ticket.image_url && (
        <img src={ticket.image_url} alt="ticket"
          className="mt-2 w-full rounded-xl max-h-40 object-cover"
          onError={e => e.target.style.display = 'none'} />
      )}

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
  const imagePreviewRef = useRef(null)
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

  const fetchNotifications = useCallback(async () => {
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

    const notifChannel = supabase
      .channel('student-notifs-' + safeName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const n = payload.new
        if (n.type === 'status_update' && n.nom === student['Nom']) {
          setNotifications(prev => [n, ...prev])
        }
      })
      .subscribe()

    const ticketChannel = supabase
      .channel('student-tickets-' + safeName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, payload => {
        if (payload.new.nom === student['Nom']) {
          setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
          setTrackedTicket(prev => prev?.id === payload.new.id ? payload.new : prev)
        }
      })
      .subscribe()

    const feedbackChannel = supabase
      .channel('student-feedback-' + safeName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, payload => {
        if (payload.new.nom === student['Nom']) {
          setFeedbacks(prev => {
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

  // Revoke object URL on unmount to prevent memory leak
  useEffect(() => {
    return () => { if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current) }
  }, [])

  // Close notif dropdown on outside click
  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => { if (view === 'tickets') fetchTickets() }, [view, fetchTickets])

  const unreadNotifs = notifications.filter(n => !n.read_by_student).length

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
    if (!allowed.includes(file.type)) {
      setMessage(lang === 'ar' ? 'يرجى استخدام صور JPG أو PNG أو WEBP فقط.' : lang === 'fr' ? 'Veuillez utiliser uniquement des images JPG, PNG ou WEBP.' : 'Please use JPG, PNG or WEBP images only.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage(lang === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 5 ميغابايت.' : lang === 'fr' ? "La photo doit faire moins de 5 Mo." : 'Image must be under 5 MB.')
      return
    }
    const url = URL.createObjectURL(file)
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current)
    imagePreviewRef.current = url
    setImageFile(file)
    setImagePreview(url)
  }

  const uploadImage = async (file, code) => {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `tickets/${code}.${ext}`
    const { error } = await supabase.storage.from('ticket-images').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('Upload error:', error); return null }
    const { data } = supabase.storage.from('ticket-images').getPublicUrl(path)
    return data.publicUrl
  }

  const checkDuplicate = async () => {
    const enProblemType = toEnKey(problemType)
    const enLocation    = toEnLoc(t.locations?.[location] || location)

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
    setLocation(''); setProblemType(''); setPriority('')
    setDescription(''); setAvailability(''); setExactLocation('')
    setAvailabilityStart(''); setAvailabilityEnd('')
    setImageFile(null)
    if (imagePreviewRef.current) { URL.revokeObjectURL(imagePreviewRef.current); imagePreviewRef.current = null }
    setImagePreview(null)
  }

  const handleTrack = async () => {
    setTrackError(''); setTrackedTicket(null)
    const { data, error } = await supabase
      .from('tickets').select('*')
      .eq('tracking_code', trackInput.trim().toUpperCase()).single()
    if (error || !data) setTrackError(t.trackNotFound)
    else setTrackedTicket(data)
  }

  const handleFeedbackSubmit = async (ticket, rating, note) => {
    const { data, error } = await supabase.from('feedback').insert([{
      ticket_id:     ticket.id,
      tracking_code: ticket.tracking_code,
      nom:           student['Nom'],
      chambre:       student['Chambre'],
      pavillon:      student['Pavillon'],
      rating,
      note: note || null,
    }]).select().single()

    if (!error && data) {
      setFeedbacks(prev => {
        if (prev.some(f => f.ticket_id === data.ticket_id)) return prev
        return [...prev, data]
      })
    }
  }

  // ── Shared UI components ───────────────────────────────────────────────────
  const Header = () => (
    <div className="rounded-xl p-4 mb-4 flex justify-between items-center" style={glassCard}>
      <div>
        <h1 className="font-bold text-base" style={{color:'#f0f6ff'}}>🔧 {t.appTitle}</h1>
        <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>
          {student['Nom']} · {t.room} {student['Chambre']} · {t.pavilion} {student['Pavillon']}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <div className="flex gap-1">
          {languages.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className="px-2 py-0.5 rounded-lg text-xs font-medium transition-all"
              style={lang === l.code
                ?{background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}
                :{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.08)'}}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markNotifsRead() }}
            className="relative p-1.5 rounded-lg transition-all"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <span style={{color:'rgba(255,255,255,0.5)'}}>🔔</span>
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
                style={{background:'#ef4444',fontSize:9}}>
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-9 w-72 rounded-xl z-30 overflow-hidden"
              style={{background:'rgba(10,14,23,0.98)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 16px 48px rgba(0,0,0,0.6)'}}>
              <div className="px-4 py-3 flex justify-between items-center" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <span className="font-semibold text-sm" style={{color:'#f0f6ff'}}>
                  🔔 {lang === 'ar' ? 'الإشعارات' : lang === 'fr' ? 'Notifications' : 'Notifications'}
                </span>
                {notifications.length > 0 && (
                  <button onClick={markNotifsRead} className="text-xs transition-colors" style={{color:'#60a5fa'}}>
                    {lang === 'ar' ? 'تحديد كمقروء' : lang === 'fr' ? 'Tout lire' : 'Mark all read'}
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y" style={{borderColor:'rgba(255,255,255,0.04)'}}>
                {notifications.length === 0 ? (
                  <p className="text-center text-sm py-6" style={{color:'rgba(255,255,255,0.3)'}}>
                    {lang === 'ar' ? 'لا توجد إشعارات' : lang === 'fr' ? 'Aucune notification' : 'No notifications yet'}
                  </p>
                ) : notifications.map((n, i) => (
                  <div key={n.id || i}
                    className="px-4 py-3 text-sm"
                    style={{background:!n.read_by_student?'rgba(59,130,246,0.05)':'transparent'}}>
                    <div className="flex items-start gap-2">
                      {!n.read_by_student && (
                        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{background:'#60a5fa'}} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug" style={{color:'rgba(255,255,255,0.7)'}}>
                          {n.message_student || (
                            lang === 'ar' ? `تم تحديث حالة طلبك ${n.tracking_code}`
                            : lang === 'fr' ? `Votre demande ${n.tracking_code} a été mise à jour`
                            : `Your request ${n.tracking_code} was updated`
                          )}
                        </p>
                        <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.25)'}}>
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

        <button onClick={onLogout} className="text-xs transition-colors" style={{color:'#f87171'}}>{t.logout}</button>
      </div>
    </div>
  )

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 flex z-10" style={{background:'rgba(8,11,18,0.95)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
      {[
        { id: 'form',    icon: '✏️', label: t.newRequest },
        { id: 'tickets', icon: '📋', label: t.myTickets },
        { id: 'track',   icon: '🔍', label: t.trackNav },
      ].map(tab => (
        <button key={tab.id} onClick={() => setView(tab.id)}
          className="flex-1 py-3 text-xs font-medium flex flex-col items-center gap-0.5 transition-all"
          style={{color: view === tab.id ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                  borderTop: view === tab.id ? '2px solid #3b82f6' : '2px solid transparent'}}>
          <span style={{ fontSize: 16 }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )

  // ── Views ──────────────────────────────────────────────────────────────────

  if (view === 'success') {
    return (
      <div dir={t.dir} className="min-h-screen flex items-center justify-center p-4" style={{background:'linear-gradient(135deg, #080b12 0%, #0a0e1a 50%, #08101a 100%)'}}>
        <div className="rounded-2xl p-8 text-center max-w-sm w-full" style={{...glassCard,boxShadow:'0 32px 80px rgba(0,0,0,0.5)'}}>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2" style={{color:'#f0f6ff'}}>{t.successTitle}</h2>
          <p className="text-sm mb-6" style={{color:'rgba(255,255,255,0.4)'}}>{t.successMsg}</p>
          <div className="rounded-xl p-4 mb-2" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)'}}>
            <p className="text-xs mb-1" style={{color:'rgba(96,165,250,0.6)'}}>{t.trackingCode}</p>
            <p className="text-2xl font-mono font-bold tracking-widest" style={{color:'#60a5fa'}}>{trackingCode}</p>
          </div>
          <p className="text-xs mb-6" style={{color:'rgba(255,255,255,0.25)'}}>{t.screenshotNote}</p>
          <button onClick={() => setView('form')}
            className="w-full py-2.5 rounded-xl text-sm font-medium mb-3 transition-all"
            style={{background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}}>
            {t.trackAnother}
          </button>
          <button onClick={() => { fetchTickets(); setView('tickets') }}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.08)'}}>
            {t.myTickets}
          </button>
        </div>
      </div>
    )
  }

  if (view === 'track') {
    return (
      <div dir={t.dir} className="min-h-screen pb-20" style={{background:'linear-gradient(135deg, #080b12 0%, #0a0e1a 50%, #08101a 100%)'}}>
        <div className="max-w-lg mx-auto p-4">
          <Header />
          <div className="rounded-xl p-6" style={glassCard}>
            <h2 className="font-bold text-lg mb-4" style={{color:'#f0f6ff'}}>{t.trackTitle}</h2>
            <div className="flex gap-2 mb-4">
              <input
                className="flex-1 rounded-xl p-2 text-sm font-mono uppercase focus:outline-none transition-all"
                style={glassInput}
                placeholder={t.trackPlaceholder}
                value={trackInput}
                onChange={e => setTrackInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
              />
              <button onClick={handleTrack}
                className="px-4 rounded-xl text-sm font-medium transition-all"
                style={{background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}}>
                {t.trackBtn}
              </button>
            </div>

            {trackError && <p className="text-sm" style={{color:'#f87171'}}>{trackError}</p>}

            {trackedTicket && (
              <div className="rounded-xl p-4 space-y-2" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm font-bold" style={{color:'#60a5fa'}}>{trackedTicket.tracking_code}</span>
                  <span className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{background:statusBg[trackedTicket.statut],color:trackedTicket.statut==='En attente'?'#fbbf24':trackedTicket.statut==='En cours'?'#60a5fa':'#34d399',border:`1px solid ${statusBorder[trackedTicket.statut]}`}}>
                    {tf(trackedTicket.statut, lang, SM)}
                  </span>
                </div>
                <div className="text-sm space-y-1.5" style={{color:'rgba(255,255,255,0.5)'}}>
                  <p>📍 <span className="font-medium" style={{color:'rgba(255,255,255,0.6)'}}>{t.locationLabel}:</span> {tf(trackedTicket.location, lang, LM)}</p>
                  {trackedTicket.exact_location && (
                    <p className="ml-5 text-xs" style={{color:'rgba(255,255,255,0.3)'}}>{trackedTicket.exact_location}</p>
                  )}
                  <p>🔧 <span className="font-medium" style={{color:'rgba(255,255,255,0.6)'}}>{t.typeLabel}:</span> {tf(trackedTicket.problem_type, lang, PM)}</p>
                  <p>⚡ <span className="font-medium" style={{color:'rgba(255,255,255,0.6)'}}>{t.priorityLabel}:</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${priorityColors[trackedTicket.priorite]}`}
                      style={{background:priorityBg[trackedTicket.priorite]}}>
                      {tf(trackedTicket.priorite, lang, PrioM)}
                    </span>
                  </p>
                  <p>📝 <span className="font-medium" style={{color:'rgba(255,255,255,0.6)'}}>{t.descLabel}:</span> {trackedTicket.description}</p>
                  {trackedTicket.availability && (
                    <p>🕐 <span className="font-medium" style={{color:'rgba(255,255,255,0.6)'}}>{t.availabilityLabel}:</span> {trackedTicket.availability}</p>
                  )}
                  <p>📅 <span className="font-medium" style={{color:'rgba(255,255,255,0.6)'}}>{t.dateLabel}:</span> {new Date(trackedTicket.created_at).toLocaleDateString()}</p>
                  {trackedTicket.resolved_at && (
                    <p style={{color:'#34d399'}}>✅ <span className="font-medium">
                      {lang === 'ar' ? 'تاريخ الحل' : lang === 'fr' ? 'Résolu le' : 'Resolved'}:
                    </span> {new Date(trackedTicket.resolved_at).toLocaleString()}</p>
                  )}
                </div>

                {trackedTicket.admin_note && (
                  <div className="rounded-xl p-3" style={{background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.15)'}}>
                    <p className="text-xs font-medium mb-1" style={{color:'rgba(96,165,250,0.7)'}}>
                      📋 {lang === 'ar' ? 'ملاحظة الإدارة' : lang === 'fr' ? 'Note admin' : 'Note from admin'}
                    </p>
                    <p className="text-sm" style={{color:'#93c5fd'}}>{trackedTicket.admin_note}</p>
                  </div>
                )}

                {trackedTicket.image_url && (
                  <img src={trackedTicket.image_url} alt="ticket"
                    className="w-full rounded-xl mt-2 max-h-48 object-cover"
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
      <div dir={t.dir} className="min-h-screen pb-20" style={{background:'linear-gradient(135deg, #080b12 0%, #0a0e1a 50%, #08101a 100%)'}}>
        <div className="max-w-lg mx-auto p-4">
          <Header />
          {loadingTickets && (
            <p className="text-center text-sm py-8" style={{color:'rgba(255,255,255,0.3)'}}>...</p>
          )}
          {!loadingTickets && tickets.length === 0 && (
            <div className="rounded-xl p-8 text-center text-sm" style={{...glassCard,color:'rgba(255,255,255,0.3)'}}>
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
    <div dir={t.dir} className="min-h-screen pb-20" style={{background:'linear-gradient(135deg, #080b12 0%, #0a0e1a 50%, #08101a 100%)'}}>
      <div className="max-w-lg mx-auto p-4">
        <Header />
        <div className="rounded-xl p-6 space-y-5" style={glassCard}>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{color:'rgba(255,255,255,0.4)'}}>{t.location} *</label>
            <div className="flex gap-2">
              {Object.entries(t.locations).map(([key, label]) => (
                <button key={key} onClick={() => setLocation(key)}
                  className="flex-1 p-2 rounded-xl text-sm font-medium transition-all"
                  style={location === key
                    ?{background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.4)'}
                    :{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Exact location */}
          {location && (
            <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-xs mb-1" style={{color:'rgba(255,255,255,0.3)'}}>
                📍 {lang === 'ar' ? 'الموقع الدقيق' : lang === 'fr' ? 'Emplacement exact' : 'Exact location'}
              </p>
              {location === 'room' ? (
                <p className="text-sm font-medium" style={{color:'#e2e8f0'}}>
                  {t.room} {student['Chambre']} — {t.pavilion} {student['Pavillon']}
                </p>
              ) : (
                <input
                  className="w-full rounded-lg p-2 text-sm mt-1 focus:outline-none transition-all"
                  style={glassInput}
                  placeholder={t.exactLocationPlaceholder?.[location] || ''}
                  value={exactLocation}
                  maxLength={200}
                  onChange={e => setExactLocation(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Problem type */}
          {location && t.problemTypes?.[location] && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{color:'rgba(255,255,255,0.4)'}}>{t.problemType} *</label>
              <div className="grid grid-cols-2 gap-2">
                {t.problemTypes[location].map(type => (
                  <button key={type} onClick={() => setProblemType(type)}
                    className="p-2 rounded-xl text-sm text-start transition-all"
                    style={problemType === type
                      ?{background:'rgba(59,130,246,0.15)',color:'#93c5fd',border:'1px solid rgba(59,130,246,0.35)'}
                      :{background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.07)'}}>
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
                <span className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>{t.priorityAuto}:</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${priorityColors[priority]}`}
                  style={{background:priorityBg[priority]}}>
                  {tf(priority, lang, PrioM)}
                </span>
              </div>
              {isHighPriority && <p className="text-xs" style={{color:'#f87171'}}>{t.priorityHighNote}</p>}
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.4)'}}>{t.description} *</label>
              <span className="text-xs" style={{color: description.length > 900 ? '#f87171' : 'rgba(255,255,255,0.2)'}}>{description.length}/1000</span>
            </div>
            <textarea
              className="w-full rounded-xl p-3 text-sm h-28 resize-none focus:outline-none transition-all"
              style={glassInput}
              placeholder={t.descriptionPlaceholder}
              value={description}
              maxLength={1000}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Availability */}
          {needsAvailability && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{color:'rgba(255,255,255,0.4)'}}>{t.availability} *</label>
              <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.3)'}}>{t.availabilityNote}</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{color:'rgba(255,255,255,0.3)'}}>{t.dir === 'rtl' ? 'من' : 'From'}</label>
                  <input type="time" min="08:00" max="17:00"
                    className="w-full rounded-xl p-2 text-sm focus:outline-none transition-all"
                    style={glassInput}
                    value={availabilityStart}
                    onChange={e => { setAvailabilityStart(e.target.value); setAvailability('') }} />
                </div>
                <span className="pb-2" style={{color:'rgba(255,255,255,0.3)'}}>→</span>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{color:'rgba(255,255,255,0.3)'}}>{t.dir === 'rtl' ? 'إلى' : 'To'}</label>
                  <input type="time" min="08:00" max="17:00"
                    className="w-full rounded-xl p-2 text-sm focus:outline-none transition-all"
                    style={glassInput}
                    value={availabilityEnd}
                    onChange={e => { setAvailabilityEnd(e.target.value); setAvailability('') }} />
                </div>
              </div>
              {timeError && (
                <p className="text-xs mt-1" style={{color:'#f87171'}}>
                  {t.dir === 'rtl' ? 'وقت النهاية يجب أن يكون بعد وقت البداية' : 'End time must be after start time'}
                </p>
              )}
              {isHighPriority && (
                <button
                  onClick={() => { setAvailabilityStart(''); setAvailabilityEnd(''); setAvailability(nightShiftLabel[lang]) }}
                  className="mt-3 w-full p-2 rounded-xl text-sm transition-all"
                  style={availability === nightShiftLabel[lang]
                    ?{background:'rgba(239,68,68,0.2)',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)'}
                    :{background:'rgba(239,68,68,0.06)',color:'rgba(248,113,113,0.7)',border:'1px solid rgba(239,68,68,0.15)'}}>
                  {nightShiftLabel[lang]}
                </button>
              )}
            </div>
          )}

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{color:'rgba(255,255,255,0.4)'}}>{t.image}</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              ref={fileRef} className="hidden" onChange={handleImageChange} />
            <button onClick={() => fileRef.current.click()}
              className="w-full border-2 border-dashed rounded-xl p-4 text-sm transition-all hover:border-blue-500/30"
              style={{borderColor:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.02)'}}>
              {imageFile ? `✅ ${t.imageSelected}: ${imageFile.name}` : `📷 ${t.imageBtn}`}
            </button>
            <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.2)'}}>
              {lang === 'ar' ? 'JPG، PNG، WEBP — بحد أقصى 5 ميغابايت' : lang === 'fr' ? 'JPG, PNG, WEBP — max 5 Mo' : 'JPG, PNG, WEBP — max 5 MB'}
            </p>
            {imagePreview && (
              <div className="mt-2 relative">
                <img src={imagePreview} alt="preview" className="w-full rounded-xl max-h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => { if (imagePreviewRef.current) { URL.revokeObjectURL(imagePreviewRef.current); imagePreviewRef.current = null } setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{background:'rgba(0,0,0,0.6)',color:'#fff'}}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Error / duplicate message */}
          {message && (
            <div className="rounded-xl px-4 py-3" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)'}}>
              <p className="text-sm" style={{color:'#fca5a5'}}>{message}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !!timeError}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{background:'linear-gradient(135deg, #3b82f6, #6366f1)',color:'#fff',boxShadow:'0 8px 24px rgba(59,130,246,0.25)'}}>
            {submitting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
            {submitting
              ? (lang === 'ar' ? 'جارٍ الإرسال...' : lang === 'fr' ? 'Envoi en cours...' : 'Submitting...')
              : t.submit}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}