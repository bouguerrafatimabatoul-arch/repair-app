import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import translations from './translations'
import { assignPriority, generateTrackingCode, nightShiftLabel } from './utils'

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
]

const priorityColors = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
}

const statusColors = {
  'En attente': 'bg-gray-100 text-gray-600',
  'En cours': 'bg-blue-100 text-blue-700',
  'Résolu': 'bg-green-100 text-green-700',
}

const NEEDS_AVAILABILITY = ['room']

export default function TicketForm({ student, onLogout, lang, setLang }) {
  const t = translations[lang]
  const [view, setView] = useState('form')

  const [location, setLocation] = useState('')
  const [exactLocation, setExactLocation] = useState('')
  const [problemType, setProblemType] = useState('')
  const [priority, setPriority] = useState('')
  const [description, setDescription] = useState('')
  const [availability, setAvailability] = useState('')
  const [availabilityStart, setAvailabilityStart] = useState('')
  const [availabilityEnd, setAvailabilityEnd] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')
  const fileRef = useRef()

  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [trackInput, setTrackInput] = useState('')
  const [trackedTicket, setTrackedTicket] = useState(null)
  const [trackError, setTrackError] = useState('')
  const [rating, setRating] = useState(0)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackDone, setFeedbackDone] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  // Fetch student notifications
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('nom', student['Nom'])
      .eq('type', 'status_update')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  useEffect(() => {
    fetchNotifications()
    // Realtime: listen for status updates on this student's tickets
    const channel = supabase
      .channel('student-notifs-' + student['Nom'])
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.new.nom === student['Nom']) {
          setNotifications(prev => [payload.new, ...prev])
        }
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

  const unreadNotifs = notifications.filter(n => !n.read_by_student).length

  const markNotifsRead = async () => {
    await supabase.from('notifications').update({ read_by_student: true })
      .eq('nom', student['Nom']).eq('read_by_student', false)
    setNotifications(prev => prev.map(n => ({ ...n, read_by_student: true })))
  }

  useEffect(() => {
    setProblemType(''); setPriority(''); setExactLocation('')
    setAvailability(''); setAvailabilityStart(''); setAvailabilityEnd('')
  }, [location])

  useEffect(() => { if (problemType) setPriority(assignPriority(problemType)) }, [problemType])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      alert('Please use JPG, PNG or WEBP images only. JFIF is not supported.')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async (file, code) => {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `tickets/${code}.${ext}`
    const { error } = await supabase.storage.from('ticket-images').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('Upload error:', error); return null }
    const { data } = supabase.storage.from('ticket-images').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    setMessage('')
    if (!location || !problemType || !description) { setMessage(t.fillAll); return }
    if (location !== 'room' && !exactLocation.trim()) { setMessage(t.fillExactLocation); return }

    const isNightShift = availability === nightShiftLabel[lang]
    if (NEEDS_AVAILABILITY.includes(location) && !isNightShift) {
      if (!availabilityStart || !availabilityEnd) { setMessage(t.fillAll); return }
      if (availabilityEnd <= availabilityStart) {
        setMessage(t.dir === 'rtl' ? 'وقت النهاية يجب أن يكون بعد وقت البداية' : 'End time must be after start time')
        return
      }
    }

    setSubmitting(true)
    const code = generateTrackingCode()
    let imageUrl = null
    if (imageFile) imageUrl = await uploadImage(imageFile, code)

    const finalAvailability = isNightShift ? nightShiftLabel[lang]
      : availabilityStart && availabilityEnd ? `${availabilityStart} → ${availabilityEnd}` : null

    const { error } = await supabase.from('tickets').insert([{
      tracking_code: code, nom: student['Nom'], chambre: student['Chambre'], pavillon: student['Pavillon'],
      location: t.locations[location],
      exact_location: location === 'room' ? `${t.room} ${student['Chambre']} — ${t.pavilion} ${student['Pavillon']}` : exactLocation,
      problem_type: problemType, priorite: priority, description,
      availability: NEEDS_AVAILABILITY.includes(location) ? finalAvailability : null,
      image_url: imageUrl, statut: 'En attente',
    }])

    // Create admin notification
    if (!error) {
      await supabase.from('notifications').insert([{
        tracking_code: code, nom: student['Nom'],
        message_admin: `New ticket from ${student['Nom']} — ${problemType}`,
        type: 'new_ticket', read_by_admin: false,
      }])
    }

    setSubmitting(false)
    if (error) { setMessage('Error: ' + error.message); return }

    setTrackingCode(code); setView('success')
    setLocation(''); setProblemType(''); setPriority('')
    setDescription(''); setAvailability(''); setExactLocation('')
    setAvailabilityStart(''); setAvailabilityEnd('')
    setImageFile(null); setImagePreview(null)
  }

  const fetchTickets = async () => {
    setLoadingTickets(true)
    const { data } = await supabase.from('tickets').select('*')
      .eq('nom', student['Nom']).order('created_at', { ascending: false })
    if (data) setTickets(data)
    setLoadingTickets(false)
  }

  useEffect(() => { if (view === 'tickets') fetchTickets() }, [view])

  const handleTrack = async () => {
    setTrackError(''); setTrackedTicket(null)
    const { data, error } = await supabase.from('tickets').select('*')
      .eq('tracking_code', trackInput.trim().toUpperCase()).single()
    if (error || !data) setTrackError(t.trackNotFound)
    else { setTrackedTicket(data); setFeedbackDone(false); setRating(0) }
  }

  const handleFeedback = async () => {
    await supabase.from('feedback').insert([{
      ticket_id: trackedTicket?.id, rating, note: feedbackNote, nom: student['Nom'],
    }])
    setFeedbackDone(true)
  }

  const Header = () => (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex justify-between items-center">
      <div>
        <h1 className="font-bold text-base">🔧 {t.appTitle}</h1>
        <p className="text-xs text-gray-400">{student['Nom']} · {t.room} {student['Chambre']} · {t.pavilion} {student['Pavillon']}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {languages.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${lang === l.code ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Bell notification */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markNotifsRead() }}
            className="relative p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
            🔔
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadNotifs}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-9 w-72 bg-white border rounded-xl shadow-lg z-30 overflow-hidden">
              <div className="px-4 py-3 border-b">
                <span className="font-semibold text-sm">Notifications</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">No notifications</p>
                ) : notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b text-sm ${n.read_by_student ? 'bg-white' : 'bg-blue-50'}`}>
                    <p className="text-gray-700 text-xs">{n.message_student}</p>
                    <p className="text-gray-300 text-xs mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
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
        { id: 'form', icon: '✏️', label: t.newRequest },
        { id: 'tickets', icon: '📋', label: t.myTickets },
        { id: 'track', icon: '🔍', label: t.trackNav },
      ].map(tab => (
        <button key={tab.id} onClick={() => setView(tab.id)}
          className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-0.5 transition-colors ${view === tab.id ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-400'}`}>
          <span style={{ fontSize: 16 }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )

  const TicketCard = ({ ticket }) => (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="font-medium text-sm">{ticket.problem_type}</span>
          <span className="text-xs text-gray-400 ml-2">· {ticket.location}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[ticket.statut]}`}>{t.statuses[ticket.statut]}</span>
      </div>
      {ticket.exact_location && <p className="text-xs text-gray-400 mb-1">📍 {ticket.exact_location}</p>}
      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{ticket.description}</p>
      {ticket.admin_note && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mb-2">
          <p className="text-xs text-blue-600 font-medium mb-0.5">📋 Admin note</p>
          <p className="text-xs text-blue-700">{ticket.admin_note}</p>
        </div>
      )}
      {ticket.resolved_at && (
        <p className="text-xs text-green-600 mb-1">✅ Resolved: {new Date(ticket.resolved_at).toLocaleString()}</p>
      )}
      <div className="flex justify-between items-center">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[ticket.priorite]}`}>{t.priorities[ticket.priorite]}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-blue-400">{ticket.tracking_code}</span>
          <span className="text-xs text-gray-300">{new Date(ticket.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      {ticket.image_url && (
        <img src={ticket.image_url} alt="ticket" className="mt-2 w-full rounded-lg max-h-40 object-cover" onError={e => e.target.style.display='none'} />
      )}
    </div>
  )

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
          <button onClick={() => setView('form')} className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 mb-3 text-sm">{t.trackAnother}</button>
          <button onClick={() => setView('tickets')} className="w-full border border-gray-200 text-gray-600 p-2 rounded-lg hover:bg-gray-50 text-sm">{t.myTickets}</button>
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
              <input className="flex-1 border rounded-lg p-2 text-sm font-mono uppercase"
                placeholder={t.trackPlaceholder} value={trackInput}
                onChange={e => setTrackInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrack()} />
              <button onClick={handleTrack} className="bg-blue-600 text-white px-4 rounded-lg text-sm hover:bg-blue-700">{t.trackBtn}</button>
            </div>
            {trackError && <p className="text-red-500 text-sm">{trackError}</p>}
            {trackedTicket && (
              <div className="border rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm font-bold text-blue-600">{trackedTicket.tracking_code}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[trackedTicket.statut]}`}>{t.statuses[trackedTicket.statut]}</span>
                </div>
                <div className="text-sm space-y-1.5 text-gray-600">
                  <p>📍 <span className="font-medium">{t.locationLabel}:</span> {trackedTicket.location}</p>
                  {trackedTicket.exact_location && <p className="ml-5 text-xs text-gray-400">{trackedTicket.exact_location}</p>}
                  <p>🔧 <span className="font-medium">{t.typeLabel}:</span> {trackedTicket.problem_type}</p>
                  <p>⚡ <span className="font-medium">{t.priorityLabel}:</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs border ${priorityColors[trackedTicket.priorite]}`}>{t.priorities[trackedTicket.priorite]}</span>
                  </p>
                  <p>📝 <span className="font-medium">{t.descLabel}:</span> {trackedTicket.description}</p>
                  {trackedTicket.availability && <p>🕐 <span className="font-medium">{t.availabilityLabel}:</span> {trackedTicket.availability}</p>}
                  <p>📅 <span className="font-medium">{t.dateLabel}:</span> {new Date(trackedTicket.created_at).toLocaleDateString()}</p>
                  {trackedTicket.resolved_at && (
                    <p>✅ <span className="font-medium">Resolved:</span> {new Date(trackedTicket.resolved_at).toLocaleString()}</p>
                  )}
                </div>
                {trackedTicket.admin_note && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-600 mb-1">📋 Note from admin</p>
                    <p className="text-sm text-blue-700">{trackedTicket.admin_note}</p>
                  </div>
                )}
                {trackedTicket.image_url && (
                  <img src={trackedTicket.image_url} alt="ticket" className="w-full rounded-lg mt-2 max-h-48 object-cover" onError={e => e.target.style.display='none'} />
                )}
                {trackedTicket.statut === 'Résolu' && !feedbackDone && (
                  <div className="border-t pt-3 mt-2">
                    <p className="font-medium text-sm mb-2">{t.feedbackPrompt}</p>
                    <div className="flex gap-1 mb-3">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => setRating(star)}
                          className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
                      ))}
                    </div>
                    <textarea className="w-full border rounded-lg p-2 text-sm h-20 resize-none mb-2"
                      placeholder={t.feedbackNotePlaceholder} onChange={e => setFeedbackNote(e.target.value)} />
                    <button onClick={handleFeedback} className="w-full bg-green-600 text-white p-2 rounded-lg text-sm hover:bg-green-700">{t.feedbackSubmit}</button>
                  </div>
                )}
                {feedbackDone && <p className="text-green-600 text-sm font-medium text-center pt-2 border-t">{t.feedbackThanks}</p>}
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
          {loadingTickets && <p className="text-center text-gray-400 text-sm py-8">...</p>}
          {!loadingTickets && tickets.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400 text-sm">{t.noTickets}</div>
          )}
          <div className="space-y-3">{tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}</div>
        </div>
        <BottomNav />
      </div>
    )
  }

  const needsAvailability = NEEDS_AVAILABILITY.includes(location)
  const isHighPriority = priority === 'High'
  const timeError = availabilityStart && availabilityEnd && availabilityEnd <= availabilityStart

  return (
    <div dir={t.dir} className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto p-4">
        <Header />
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">

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

          {location && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">📍 {t.exactLocationLabel || 'Exact location'}</p>
              {location === 'room' ? (
                <p className="text-sm font-medium text-gray-700">{t.room} {student['Chambre']} — {t.pavilion} {student['Pavillon']}</p>
              ) : (
                <input className="w-full bg-white border rounded-lg p-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={t.exactLocationPlaceholder[location]} value={exactLocation}
                  onChange={e => setExactLocation(e.target.value)} />
              )}
            </div>
          )}

          {location && (
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

          {priority && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t.priorityAuto}:</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium border ${priorityColors[priority]}`}>{t.priorities[priority]}</span>
              </div>
              {isHighPriority && <p className="text-xs text-red-500">{t.priorityHighNote}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.description} *</label>
            <textarea className="w-full border rounded-lg p-3 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={t.descriptionPlaceholder} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* 6. Availability — only for room problems */}
          {needsAvailability && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.availability} *</label>
              <p className="text-xs text-gray-400 mb-2">{t.availabilityNote}</p>
              <div className="grid grid-cols-3 gap-2">
                {daySlots.map(slot => (
                  <button key={slot} onClick={() => setAvailability(slot)}
                    className={`p-2 rounded-lg border text-sm font-mono transition-colors ${
                      availability === slot
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {slot}
                  </button>
                ))}
                {/* Night shift only shown for high priority */}
                {isHighPriority && (
                  <button
                    onClick={() => setAvailability(nightShiftLabel[lang])}
                    className={`col-span-3 p-2 rounded-lg border text-sm transition-colors ${
                      availability === nightShiftLabel[lang]
                        ? 'bg-red-600 text-white border-red-600'
                        : 'border-red-200 text-red-500 hover:bg-red-50'
                    }`}>
                    {nightShiftLabel[lang]}
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.image}</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" ref={fileRef} className="hidden" onChange={handleImageChange} />
            <button onClick={() => fileRef.current.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">
              {imageFile ? `✅ ${t.imageSelected}: ${imageFile.name}` : `📷 ${t.imageBtn}`}
            </button>
            {imagePreview && <img src={imagePreview} alt="preview" className="mt-2 w-full rounded-lg max-h-40 object-cover" />}
          </div>

          {message && <p className="text-red-500 text-sm">{message}</p>}

          <button onClick={handleSubmit} disabled={submitting || timeError}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {submitting ? '...' : t.submit}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
