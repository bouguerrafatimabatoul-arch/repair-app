import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from './supabaseClient'
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm'

// ─── Priority escalation ───────────────────────────────────────────────────────
function getEffectivePriority(ticket, settings) {
  if (ticket.statut === 'Résolu') return ticket.priorite
  const ageH = (Date.now() - new Date(ticket.created_at).getTime()) / 3_600_000
  let p = ticket.priorite
  if (p === 'Low'    && ageH >= settings.escalateLowToMedium)  p = 'Medium'
  if (p === 'Medium' && ageH >= settings.escalateMediumToHigh) p = 'High'
  return p
}
function priorityRank(p) { return p==='High'?0:p==='Medium'?1:2 }

// ─── Translation maps ──────────────────────────────────────────────────────────
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
  'Room':{en:'Room',fr:'Chambre',ar:'الغرفة'},'Chambre':{en:'Room',fr:'Chambre',ar:'الغرفة'},'الغرفة':{en:'Room',fr:'Chambre',ar:'الغرفة'},
  'Pavilion':{en:'Pavilion',fr:'Pavillon',ar:'الجناح'},'Pavillon':{en:'Pavilion',fr:'Pavillon',ar:'الجناح'},'الجناح':{en:'Pavilion',fr:'Pavillon',ar:'الجناح'},
  'Toilets':{en:'Toilets',fr:'Toilettes',ar:'الحمامات'},'Toilettes':{en:'Toilets',fr:'Toilettes',ar:'الحمامات'},'الحمامات':{en:'Toilets',fr:'Toilettes',ar:'الحمامات'},
}
const tf = (v,lang,map) => map[v]?.[lang] ?? v

// All problem types flat list for dropdowns
const ALL_PROBLEM_TYPES = [
  'Electricity','Heating','Furniture','Door / Window','Other',
  'Lighting','Doors','Security','Cleanliness',
  'Plumbing','Water Leakage',
]
const ALL_LOCATIONS = ['Room','Pavilion','Toilets']

// ─── Translations ──────────────────────────────────────────────────────────────
const T = {
  en:{dir:'ltr',title:'Dashboard',serviceManager:'Service Manager',
    total:'Total',pending:'Pending',inProgress:'In Progress',resolved:'Resolved',urgent:'Urgent',
    loading:'Loading…',noTickets:'No tickets found.',search:'Search name, room, code…',
    location:'Location',type:'Type',priority:'Priority',status:'Status',date:'Date',student:'Student',room:'Room',
    changeStatus:'Change status',description:'Description',availability:'Availability',
    submittedOn:'Submitted',resolvedOn:'Resolved',exactLocation:'Exact spot',
    adminNote:'Admin note',adminNotePlaceholder:'Note for the student…',saveNote:'Save',
    assignWorkers:'Assign workers',noWorkers:'No workers available',toolsUsed:'Tools used',toolsUsedPlaceholder:'e.g. Drill, Wrench, Wire 2.5mm…',
    priorities:{High:'High',Medium:'Medium',Low:'Low'},
    statuses:{'En attente':'Pending','En cours':'In Progress','Résolu':'Resolved'},
    logout:'Logout',notifications:'Notifications',noNotifs:'No notifications',
    markRead:'Mark all read',newTicket:'New Ticket',
    exportBtn:'Export',exportAll:'Export all',exportFiltered:'Export filtered',
    charts:'Analytics',image:'Photo',
    repairsByType:'By type',repairsByLocation:'By location',topRooms:'Top rooms',
    feedback:'Ratings',noFeedback:'No ratings yet.',weeklyTrend:'Weekly trend',
    resolutionRate:'Resolution rate',priorityBreakdown:'Priority split',
    escalated:'Escalated',originalPriority:'Original',
    settings:'Settings',settingsTitle:'Settings',
    escalationTitle:'Auto-escalation thresholds',
    escalateLowLabel:'Low → Medium after (hours)',escalateMediumLabel:'Medium → High after (hours)',
    tableColsTitle:'Visible columns',ticketsPerPageLabel:'Tickets per page',
    save:'Save settings',saved:'Saved!',
    printAll:'Print all',printFiltered:'Print filtered',
    addWorkerTitle:'Add new worker',addWorkerName:'Last name',addWorkerFirst:'First name',
    addWorkerMatricule:'Matricule',addWorkerGrade:'Grade',addWorkerBtn:'Add worker',
    addWorkerJobTitle:'Job title',addWorkerSaved:'Worker added!',addWorkerError:'Error adding worker.',
    filtersTitle:'Filters',filterDate:'Date range',filterFrom:'From',filterTo:'To',
    filterPavillon:'Pavilion',filterStatus:'Status',filterPriority:'Priority',
    filterType:'Problem type',filterLocation:'Location',filterAll:'All',
    clearFilters:'Clear',activeFilters:'filter',activeFiltersPlural:'filters',
    // New ticket modal
    newTicketTitle:'Add New Ticket',newTicketStudent:'Student name',newTicketRoom:'Room',
    newTicketPavillon:'Pavilion',newTicketLocation:'Location',newTicketType:'Problem type',
    newTicketPriority:'Priority',newTicketDesc:'Description',newTicketAvail:'Availability (optional)',
    newTicketExact:'Exact location',newTicketSubmit:'Create Ticket',newTicketCancel:'Cancel',
    newTicketSuccess:'Ticket created!',newTicketError:'Error creating ticket.',
    // Edit ticket modal
    editTicketTitle:'Edit Ticket',editTicketSave:'Save changes',editTicketCancel:'Cancel',
    editTicketSuccess:'Ticket updated!',editTicketError:'Error updating ticket.',
    editTicketDelete:'Delete ticket',editTicketDeleteConfirm:'Are you sure you want to delete this ticket? This action cannot be undone.',
  },
  fr:{dir:'ltr',title:'Tableau de bord',serviceManager:'Chef de service',
    total:'Total',pending:'En attente',inProgress:'En cours',resolved:'Résolus',urgent:'Urgents',
    loading:'Chargement…',noTickets:'Aucun ticket.',search:'Nom, chambre, code…',
    location:'Emplacement',type:'Type',priority:'Priorité',status:'Statut',date:'Date',student:'Étudiant',room:'Chambre',
    changeStatus:'Changer le statut',description:'Description',availability:'Disponibilité',
    submittedOn:'Soumis',resolvedOn:'Résolu',exactLocation:'Endroit précis',
    adminNote:'Note admin',adminNotePlaceholder:"Note pour l'étudiant…",saveNote:'Enregistrer',
    assignWorkers:'Assigner des ouvriers',noWorkers:'Aucun ouvrier',toolsUsed:'Outils utilisés',toolsUsedPlaceholder:'ex: Perceuse, Clé, Câble 2.5mm…',
    priorities:{High:'Haute',Medium:'Moyenne',Low:'Faible'},
    statuses:{'En attente':'En attente','En cours':'En cours','Résolu':'Résolu'},
    logout:'Déconnexion',notifications:'Notifications',noNotifs:'Aucune notification',
    markRead:'Tout marquer lu',newTicket:'Nouveau ticket',
    exportBtn:'Exporter',exportAll:'Exporter tout',exportFiltered:'Exporter filtré',
    charts:'Analytique',image:'Photo',
    repairsByType:'Par type',repairsByLocation:'Par emplacement',topRooms:'Top chambres',
    feedback:'Évaluations',noFeedback:'Aucune évaluation.',weeklyTrend:'7 derniers jours',
    resolutionRate:'Taux de résolution',priorityBreakdown:'Répartition priorité',
    escalated:'Escaladé',originalPriority:'Originale',
    settings:'Paramètres',settingsTitle:'Paramètres',
    escalationTitle:"Seuils d'escalade automatique",
    escalateLowLabel:'Faible → Moyenne après (heures)',escalateMediumLabel:'Moyenne → Haute après (heures)',
    tableColsTitle:'Colonnes visibles',ticketsPerPageLabel:'Tickets par page',
    save:'Enregistrer',saved:'Sauvegardé !',
    printAll:'Imprimer tout',printFiltered:'Imprimer filtré',
    addWorkerTitle:'Ajouter un ouvrier',addWorkerName:'Nom',addWorkerFirst:'Prénom',
    addWorkerMatricule:'Matricule',addWorkerGrade:'Grade',addWorkerBtn:'Ajouter',
    addWorkerSaved:'Ouvrier ajouté !',addWorkerError:"Erreur lors de l'ajout.",
    filtersTitle:'Filtres',filterDate:'Plage de dates',filterFrom:'Du',filterTo:'Au',
    filterPavillon:'Pavillon',filterStatus:'Statut',filterPriority:'Priorité',
    filterType:'Type de problème',filterLocation:'Emplacement',filterAll:'Tous',
    clearFilters:'Effacer',activeFilters:'filtre actif',activeFiltersPlural:'filtres actifs',
    newTicketTitle:'Ajouter un ticket',newTicketStudent:'Nom de l\'étudiant',newTicketRoom:'Chambre',
    newTicketPavillon:'Pavillon',newTicketLocation:'Emplacement',newTicketType:'Type de problème',
    newTicketPriority:'Priorité',newTicketDesc:'Description',newTicketAvail:'Disponibilité (optionnel)',
    newTicketExact:'Emplacement exact',newTicketSubmit:'Créer le ticket',newTicketCancel:'Annuler',
    newTicketSuccess:'Ticket créé !',newTicketError:'Erreur lors de la création.',
    editTicketTitle:'Modifier le ticket',editTicketSave:'Enregistrer',editTicketCancel:'Annuler',
    editTicketSuccess:'Ticket mis à jour !',editTicketError:'Erreur lors de la mise à jour.',
    editTicketDelete:'Supprimer',editTicketDeleteConfirm:'Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible.',
  },
  ar:{dir:'rtl',title:'لوحة التحكم',serviceManager:'رئيس المصلحة',
    total:'المجموع',pending:'قيد الانتظار',inProgress:'جارٍ',resolved:'تم الحل',urgent:'عاجل',
    loading:'جارٍ التحميل…',noTickets:'لا توجد طلبات.',search:'بحث…',
    location:'الموقع',type:'النوع',priority:'الأولوية',status:'الحالة',date:'التاريخ',student:'الطالب',room:'الغرفة',
    changeStatus:'تغيير الحالة',description:'الوصف',availability:'التوفر',
    submittedOn:'تاريخ التقديم',resolvedOn:'تاريخ الحل',exactLocation:'المكان الدقيق',
    adminNote:'ملاحظة الإدارة',adminNotePlaceholder:'ملاحظة للطالب…',saveNote:'حفظ',
    assignWorkers:'تعيين عمال',noWorkers:'لا يوجد عمال',toolsUsed:'الأدوات المستخدمة',toolsUsedPlaceholder:'مثال: مثقاب، مفتاح ربط، سلك 2.5مم…',
    priorities:{High:'عالية',Medium:'متوسطة',Low:'منخفضة'},
    statuses:{'En attente':'قيد الانتظار','En cours':'جارٍ','Résolu':'تم الحل'},
    logout:'تسجيل الخروج',notifications:'الإشعارات',noNotifs:'لا توجد إشعارات',
    markRead:'تحديد الكل كمقروء',newTicket:'طلب جديد',
    exportBtn:'تصدير',exportAll:'تصدير الكل',exportFiltered:'تصدير المفلتر',
    charts:'تحليلات',image:'صورة',
    repairsByType:'حسب النوع',repairsByLocation:'حسب الموقع',topRooms:'أكثر الغرف',
    feedback:'تقييمات',noFeedback:'لا توجد تقييمات.',weeklyTrend:'الاتجاه الأسبوعي',
    resolutionRate:'معدل الحل',priorityBreakdown:'توزيع الأولويات',
    escalated:'مُصعَّد',originalPriority:'الأصلية',
    settings:'الإعدادات',settingsTitle:'الإعدادات',
    escalationTitle:'حدود تصعيد الأولوية التلقائي',
    escalateLowLabel:'منخفضة → متوسطة بعد (ساعة)',escalateMediumLabel:'متوسطة → عالية بعد (ساعة)',
    tableColsTitle:'الأعمدة المرئية',ticketsPerPageLabel:'طلبات لكل صفحة',
    save:'حفظ الإعدادات',saved:'تم الحفظ!',
    printAll:'طباعة الكل',printFiltered:'طباعة المفلتر',
    addWorkerTitle:'إضافة عامل جديد',addWorkerName:'اللقب',addWorkerFirst:'الاسم',
    addWorkerMatricule:'الرقم التسلسلي',addWorkerGrade:'الرتبة',addWorkerBtn:'إضافة',
    addWorkerJobTitle:'المسمى الوظيفي',addWorkerSaved:'تم إضافة العامل!',addWorkerError:'خطأ في الإضافة.',
    filtersTitle:'الفلاتر',filterDate:'نطاق التاريخ',filterFrom:'من',filterTo:'إلى',
    filterPavillon:'الجناح',filterStatus:'الحالة',filterPriority:'الأولوية',
    filterType:'نوع المشكلة',filterLocation:'الموقع',filterAll:'الكل',
    clearFilters:'مسح',activeFilters:'فلتر نشط',activeFiltersPlural:'فلاتر نشطة',
    newTicketTitle:'إضافة طلب جديد',newTicketStudent:'اسم الطالب',newTicketRoom:'الغرفة',
    newTicketPavillon:'الجناح',newTicketLocation:'الموقع',newTicketType:'نوع المشكلة',
    newTicketPriority:'الأولوية',newTicketDesc:'الوصف',newTicketAvail:'التوفر (اختياري)',
    newTicketExact:'الموقع الدقيق',newTicketSubmit:'إنشاء الطلب',newTicketCancel:'إلغاء',
    newTicketSuccess:'تم إنشاء الطلب!',newTicketError:'خطأ في الإنشاء.',
    editTicketTitle:'تعديل الطلب',editTicketSave:'حفظ التعديلات',editTicketCancel:'إلغاء',
    editTicketSuccess:'تم تحديث الطلب!',editTicketError:'خطأ في التحديث.',
    editTicketDelete:'حذف الطلب',editTicketDeleteConfirm:'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
  },
}

const LANGS = [{code:'en',label:'EN'},{code:'fr',label:'FR'},{code:'ar',label:'ع'}]
const DEFAULT_SETTINGS = {
  escalateLowToMedium:48, escalateMediumToHigh:24, ticketsPerPage:25,
  visibleCols:{code:true,student:true,room:true,pavilion:true,type:true,priority:true,status:true,date:true},
}
const SC = {'En attente':'bg-gray-100 text-gray-600','En cours':'bg-blue-100 text-blue-700','Résolu':'bg-green-100 text-green-700'}
const PC = {High:'bg-red-100 text-red-700',Medium:'bg-yellow-100 text-yellow-700',Low:'bg-green-100 text-green-700'}
const PB = {High:'border-l-[3px] border-red-400',Medium:'border-l-[3px] border-yellow-400',Low:'border-l-[3px] border-green-400'}

function generateTrackingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'RQ-'
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

function assignPriority(type) {
  const high = ['Electricity','Électricité','الكهرباء','Water Leakage',"Fuite d'eau",'تسرب المياه','Security','Sécurité','الأمن','Door / Window','Porte / Fenêtre','باب / نافذة']
  const medium = ['Heating','Chauffage','التدفئة','Plumbing','Plomberie','السباكة','Lighting','Éclairage','الإضاءة','Doors','Portes','الأبواب']
  if (high.includes(type)) return 'High'
  if (medium.includes(type)) return 'Medium'
  return 'Low'
}

// ─── Mini charts ───────────────────────────────────────────────────────────────
function Donut({slices,size=96}){
  const total=slices.reduce((s,sl)=>s+sl.value,0)
  if(!total) return <div className="text-xs text-gray-400 py-4 text-center">—</div>
  const r=38,c=2*Math.PI*r; let cum=0
  return(
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="16"/>
      {slices.map((sl,i)=>{const d=sl.value/total*c,off=c-cum*c;cum+=sl.value/total;return(
        <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={sl.color} strokeWidth="16"
          strokeDasharray={`${d} ${c-d}`} strokeDashoffset={off}
          style={{transform:'rotate(-90deg)',transformOrigin:'50% 50%'}}/>
      )})}
      <text x="50" y="54" textAnchor="middle" fontSize="13" fontWeight="600" fill="#374151">{total}</text>
    </svg>
  )
}
function HBar({label,count,max,color='#3b82f6'}){
  return(
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs text-gray-500 w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className="h-3 rounded-full" style={{width:`${max>0?count/max*100:0}%`,background:color,transition:'width .4s'}}/>
      </div>
      <span className="text-xs font-medium text-gray-600 w-4 text-right">{count}</span>
    </div>
  )
}
function Spark({data,color='#3b82f6',h=44}){
  if(!data||data.length<2)return null
  const max=Math.max(...data,1),w=200
  const pts=data.map((v,i)=>`${i/(data.length-1)*w},${h-v/max*h*.88-2}`).join(' ')
  return(
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={pts}/>
    </svg>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({toasts,onDismiss}){
  return(
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" style={{maxWidth:320}}>
      {toasts.map(t=>(
        <div key={t.id} className="pointer-events-auto bg-white border border-blue-200 rounded-xl shadow-xl px-4 py-3 flex items-start gap-3"
          style={{animation:'slideInRight .3s ease'}}>
          <span style={{fontSize:18}}>🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{t.title||t.nom}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{t.body||''}</p>
          </div>
          <button onClick={()=>onDismiss(t.id)} className="text-gray-300 hover:text-gray-500 shrink-0">✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── Worker picker ─────────────────────────────────────────────────────────────
function WorkerPicker({workers,selected,onChange,txt}){
  const [open,setOpen]=useState(false)
  const ref=useRef()
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)
  },[])
  const toggle=id=>onChange(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id])
  const names=workers.filter(w=>selected.includes(w['N°'])).map(w=>`${w['Nom']} ${w['Prénom']||''}`.trim())
  return(
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(!open)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-left flex justify-between items-center hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200">
        <span className={names.length?'text-gray-700':'text-gray-400'}>
          {names.length?names.join(', '):txt.assignWorkers}
        </span>
        <span className="text-gray-400 text-xs ml-2">{open?'▲':'▼'}</span>
      </button>
      {open&&(
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
          {workers.length===0
            ?<p className="text-xs text-gray-400 p-3">{txt.noWorkers}</p>
            :workers.map(w=>{
              const id=w['N°'],name=`${w['Nom']} ${w['Prénom']||''}`.trim()
              const role=w['job title']||w['job_title']||w['Job title']||''
              const sel=selected.includes(id)
              return(
                <button key={id} onClick={()=>toggle(id)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 ${sel?'bg-blue-50':''}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${sel?'bg-blue-600 border-blue-600':'border-gray-300'}`}>
                    {sel&&<span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{name}</p>
                    {role&&<p className="text-xs text-gray-400 truncate">{role}</p>}
                  </div>
                </button>
              )
            })
          }
        </div>
      )}
    </div>
  )
}

// ─── NEW TICKET MODAL ──────────────────────────────────────────────────────────
function NewTicketModal({ txt, lang, workers, onClose, onCreated, addToast }) {
  const [form, setForm] = useState({
    nom: '', chambre: '', pavillon: '', location: 'Room',
    exact_location: '', problem_type: 'Electricity', priorite: 'High',
    description: '', availability: '', statut: 'En attente',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [selWorkers, setSelWorkers] = useState([])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-assign priority when type changes
  useEffect(() => {
    set('priorite', assignPriority(form.problem_type))
  }, [form.problem_type])

  const handleSubmit = async () => {
    setError('')
    if (!form.nom.trim() || !form.chambre.trim() || !form.pavillon.trim() || !form.description.trim()) {
      setError(lang === 'ar' ? 'يرجى ملء جميع الحقول الإلزامية' : lang === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill in all required fields')
      return
    }
    setSaving(true)
    const code = generateTrackingCode()
    const { data, error: err } = await supabase.from('tickets').insert([{
      tracking_code:  code,
      nom:            form.nom.trim(),
      chambre:        form.chambre.trim(),
      pavillon:       form.pavillon.trim(),
      location:       form.location,
      exact_location: form.exact_location.trim() || null,
      problem_type:   form.problem_type,
      priorite:       form.priorite,
      description:    form.description.trim(),
      availability:   form.availability.trim() || null,
      statut:         form.statut,
      assigned_workers: selWorkers.length ? JSON.stringify(selWorkers) : null,
    }]).select().single()
    setSaving(false)
    if (err) { setError(txt.newTicketError + ' ' + err.message); return }
    await supabase.from('notifications').insert([{
      ticket_id: data.id, tracking_code: code, nom: form.nom.trim(),
      message_admin: `${form.nom} — ${form.problem_type} (admin créé)`,
      type: 'new_ticket', read_by_admin: true,
    }])
    addToast({ id: Date.now(), title: txt.newTicketSuccess, body: `${form.nom} · ${code}` })
    onCreated(data)
    onClose()
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" dir={txt.dir}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">+</div>
            <h2 className="font-semibold text-gray-800 text-lg">{txt.newTicketTitle}</h2>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Student info */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">
              {lang==='ar'?'معلومات الطالب':lang==='fr'?"Infos de l'étudiant":'Student Info'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={labelCls}>{txt.newTicketStudent} *</label>
                <input className={inputCls} value={form.nom} onChange={e=>set('nom',e.target.value)} placeholder="Nom complet" />
              </div>
              <div>
                <label className={labelCls}>{txt.newTicketRoom} *</label>
                <input className={inputCls} value={form.chambre} onChange={e=>set('chambre',e.target.value)} placeholder="ex: 214" />
              </div>
              <div>
                <label className={labelCls}>{txt.newTicketPavillon} *</label>
                <input className={inputCls} value={form.pavillon} onChange={e=>set('pavillon',e.target.value)} placeholder="ex: A" />
              </div>
            </div>
          </div>

          {/* Problem details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{txt.newTicketLocation}</label>
              <select className={inputCls} value={form.location} onChange={e=>set('location',e.target.value)}>
                {ALL_LOCATIONS.map(l=><option key={l} value={l}>{tf(l,lang,LM)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{txt.newTicketExact}</label>
              <input className={inputCls} value={form.exact_location} onChange={e=>set('exact_location',e.target.value)}
                placeholder={lang==='ar'?'المكان الدقيق':lang==='fr'?"Précisez l'endroit":'Exact spot'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{txt.newTicketType}</label>
              <select className={inputCls} value={form.problem_type} onChange={e=>set('problem_type',e.target.value)}>
                {ALL_PROBLEM_TYPES.map(t=><option key={t} value={t}>{tf(t,lang,PM)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{txt.newTicketPriority}</label>
              <select className={`${inputCls} ${PC[form.priorite]} border-0 font-medium`} value={form.priorite} onChange={e=>set('priorite',e.target.value)}>
                {['High','Medium','Low'].map(p=><option key={p} value={p}>{txt.priorities[p]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{txt.newTicketDesc} *</label>
            <textarea className={`${inputCls} h-24 resize-none`} value={form.description}
              onChange={e=>set('description',e.target.value)}
              placeholder={lang==='ar'?'اشرح المشكلة...':lang==='fr'?'Décrivez le problème...':'Describe the problem...'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{txt.newTicketAvail}</label>
              <input className={inputCls} value={form.availability} onChange={e=>set('availability',e.target.value)}
                placeholder="08:00 → 17:00" />
            </div>
            <div>
              <label className={labelCls}>{txt.status}</label>
              <select className={inputCls} value={form.statut} onChange={e=>set('statut',e.target.value)}>
                {['En attente','En cours','Résolu'].map(s=><option key={s} value={s}>{txt.statuses[s]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>👷 {txt.assignWorkers}</label>
            <WorkerPicker workers={workers} selected={selWorkers} onChange={setSelWorkers} txt={txt} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              {txt.newTicketCancel}
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? '…' : txt.newTicketSubmit}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── EDIT TICKET MODAL ─────────────────────────────────────────────────────────
function EditTicketModal({ ticket, txt, lang, workers, onClose, onSaved, onDeleted, addToast }) {
  const [form, setForm] = useState({
    nom:            ticket.nom            || '',
    chambre:        ticket.chambre        || '',
    pavillon:       ticket.pavillon       || '',
    location:       ticket.location       || 'Room',
    exact_location: ticket.exact_location || '',
    problem_type:   ticket.problem_type   || 'Electricity',
    priorite:       ticket.priorite       || 'Medium',
    description:    ticket.description    || '',
    availability:   ticket.availability   || '',
    statut:         ticket.statut         || 'En attente',
    admin_note:     ticket.admin_note     || '',
    tools_used:     ticket.tools_used     || '',
  })
  const [selWorkers, setSelWorkers] = useState(()=>{ try{return JSON.parse(ticket.assigned_workers||'[]')}catch{return[]} })
  const [saving,  setSaving]  = useState(false)
  const [deleting,setDeleting]= useState(false)
  const [error,   setError]   = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSave = async () => {
    setError('')
    if (!form.nom.trim() || !form.description.trim()) {
      setError(lang==='ar'?'يرجى ملء الحقول الإلزامية':lang==='fr'?'Champs obligatoires manquants':'Required fields missing')
      return
    }
    setSaving(true)
    const updates = {
      nom:            form.nom.trim(),
      chambre:        form.chambre.trim(),
      pavillon:       form.pavillon.trim(),
      location:       form.location,
      exact_location: form.exact_location.trim() || null,
      problem_type:   form.problem_type,
      priorite:       form.priorite,
      description:    form.description.trim(),
      availability:   form.availability.trim() || null,
      statut:         form.statut,
      admin_note:     form.admin_note.trim() || null,
      tools_used:     form.tools_used.trim() || null,
      assigned_workers: selWorkers.length ? JSON.stringify(selWorkers) : null,
    }
    if (form.statut === 'Résolu' && ticket.statut !== 'Résolu') updates.resolved_at = new Date().toISOString()
    if (form.statut !== 'Résolu') updates.resolved_at = null

    const { data, error: err } = await supabase.from('tickets').update(updates).eq('id', ticket.id).select().single()
    setSaving(false)
    if (err) { setError(txt.editTicketError + ' ' + err.message); return }

    // Notify student if status changed
    if (form.statut !== ticket.statut) {
      await supabase.from('notifications').insert([{
        ticket_id: ticket.id, tracking_code: ticket.tracking_code, nom: ticket.nom,
        message_student: `Your ticket ${ticket.tracking_code} is now: ${form.statut}`,
        type: 'status_update', read_by_admin: true,
      }])
    }
    addToast({ id: Date.now(), title: txt.editTicketSuccess, body: ticket.tracking_code })
    onSaved(data)
    onClose()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('tickets').delete().eq('id', ticket.id)
    setDeleting(false)
    addToast({ id: Date.now(), title: lang==='ar'?'تم حذف الطلب':lang==='fr'?'Ticket supprimé':'Ticket deleted', body: ticket.tracking_code })
    onDeleted(ticket.id)
    onClose()
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" dir={txt.dir}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <div>
            <p className="font-mono text-sm font-bold text-blue-600">{ticket.tracking_code}</p>
            <h2 className="font-semibold text-gray-800">{txt.editTicketTitle}</h2>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Student info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {lang==='ar'?'معلومات الطالب':lang==='fr'?"Infos de l'étudiant":'Student Info'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={labelCls}>{txt.student} *</label>
                <input className={inputCls} value={form.nom} onChange={e=>set('nom',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{txt.room}</label>
                <input className={inputCls} value={form.chambre} onChange={e=>set('chambre',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{txt.filterPavillon}</label>
                <input className={inputCls} value={form.pavillon} onChange={e=>set('pavillon',e.target.value)} />
              </div>
            </div>
          </div>

          {/* Problem details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{txt.location}</label>
              <select className={inputCls} value={form.location} onChange={e=>set('location',e.target.value)}>
                {ALL_LOCATIONS.map(l=><option key={l} value={l}>{tf(l,lang,LM)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{txt.exactLocation}</label>
              <input className={inputCls} value={form.exact_location} onChange={e=>set('exact_location',e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{txt.type}</label>
              <select className={inputCls} value={form.problem_type} onChange={e=>set('problem_type',e.target.value)}>
                {ALL_PROBLEM_TYPES.map(t=><option key={t} value={t}>{tf(t,lang,PM)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{txt.priority}</label>
              <select className={`${inputCls} font-medium`} value={form.priorite} onChange={e=>set('priorite',e.target.value)}>
                {['High','Medium','Low'].map(p=><option key={p} value={p}>{txt.priorities[p]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{txt.description} *</label>
            <textarea className={`${inputCls} h-24 resize-none`} value={form.description} onChange={e=>set('description',e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{txt.availability}</label>
              <input className={inputCls} value={form.availability} onChange={e=>set('availability',e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{txt.status}</label>
              <select className={`${inputCls} ${SC[form.statut]} border-transparent font-medium`} value={form.statut} onChange={e=>set('statut',e.target.value)}>
                {['En attente','En cours','Résolu'].map(s=><option key={s} value={s}>{txt.statuses[s]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{txt.adminNote}</label>
            <textarea className={`${inputCls} h-20 resize-none`} value={form.admin_note}
              onChange={e=>set('admin_note',e.target.value)} placeholder={txt.adminNotePlaceholder} />
          </div>

          <div>
            <label className={labelCls}>🔧 {txt.toolsUsed}</label>
            <input className={inputCls} value={form.tools_used} onChange={e=>set('tools_used',e.target.value)}
              placeholder={txt.toolsUsedPlaceholder} />
          </div>

          <div>
            <label className={labelCls}>👷 {txt.assignWorkers}</label>
            <WorkerPicker workers={workers} selected={selWorkers} onChange={setSelWorkers} txt={txt} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              {txt.editTicketCancel}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-2 flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? '…' : txt.editTicketSave}
            </button>
          </div>

          {/* Delete section */}
          <div className="border-t pt-4">
            {!confirmDelete
              ? <button onClick={()=>setConfirmDelete(true)}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors">
                  🗑 {txt.editTicketDelete}
                </button>
              : <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700 mb-3">{txt.editTicketDeleteConfirm}</p>
                  <div className="flex gap-2">
                    <button onClick={()=>setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white">
                      {lang==='ar'?'إلغاء':lang==='fr'?'Annuler':'Cancel'}
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                      className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                      {deleting?'…':(lang==='ar'?'تأكيد الحذف':lang==='fr'?'Confirmer':'Confirm Delete')}
                    </button>
                  </div>
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── View-only Ticket modal (with Edit button) ─────────────────────────────────
function TicketModal({ticket,ep,txt,lang,feedbacks,workers,onClose,onStatus,onSave,updating,onEdit}){
  const [note,setNote]=useState(ticket.admin_note||'')
  const [tools,setTools]=useState(ticket.tools_used||'')
  const [sel,setSel]=useState(()=>{try{return JSON.parse(ticket.assigned_workers||'[]')}catch{return[]}})
  const [saving,setSaving]=useState(false)
  const fb=feedbacks.find(f=>f.ticket_id===ticket.id)
  const escalated=ep!==ticket.priorite
  const handleSave=async()=>{setSaving(true);await onSave(ticket.id,note,JSON.stringify(sel),tools);setSaving(false)}
  return(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.45)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" dir={txt.dir}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start rounded-t-2xl z-10">
          <div>
            <p className="font-mono text-sm font-bold text-blue-600">{ticket.tracking_code}</p>
            <p className="font-semibold text-gray-800 text-lg mt-0.5">{ticket.nom}</p>
            <p className="text-xs text-gray-400">{ticket.chambre} · {ticket.pavillon}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${SC[ticket.statut]}`}>{txt.statuses[ticket.statut]}</span>
            {/* Edit button */}
            <button onClick={onEdit}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 text-xs font-medium border border-gray-200 transition-colors">
              ✏️ {lang==='ar'?'تعديل':lang==='fr'?'Modifier':'Edit'}
            </button>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl ml-1">✕</button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${PC[ep]}`}>⚡ {txt.priorities[ep]}</span>
            {escalated&&<span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">↑ {txt.escalated} ({txt.originalPriority}: {txt.priorities[ticket.priorite]})</span>}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">{txt.location}</p><p className="font-medium text-gray-700">{tf(ticket.location,lang,LM)}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">{txt.type}</p><p className="font-medium text-gray-700">{tf(ticket.problem_type,lang,PM)}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">{txt.submittedOn}</p><p className="font-medium text-gray-700 text-xs">{new Date(ticket.created_at).toLocaleString()}</p></div>
            {ticket.resolved_at&&<div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-green-400 mb-1">{txt.resolvedOn}</p><p className="font-medium text-green-700 text-xs">{new Date(ticket.resolved_at).toLocaleString()}</p></div>}
          </div>
          {ticket.exact_location&&<div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-blue-400 mb-1">📍 {txt.exactLocation}</p><p className="text-sm text-blue-700">{ticket.exact_location}</p></div>}
          <div><p className="text-xs text-gray-400 mb-1 font-medium">📝 {txt.description}</p><p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{ticket.description}</p></div>
          {ticket.availability&&<p className="text-sm text-gray-600">🕐 <span className="font-medium">{txt.availability}:</span> {ticket.availability}</p>}
          {ticket.image_url&&<div><p className="text-xs text-gray-400 mb-1 font-medium">📷 {txt.image}</p><img src={ticket.image_url} alt="ticket" className="w-full rounded-xl max-h-48 object-cover" onError={e=>e.target.style.display='none'}/></div>}
          {fb&&<div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"><p className="text-xs font-medium text-yellow-700 mb-1">⭐ {txt.feedback}</p><p className="text-yellow-500 text-xl">{'★'.repeat(fb.rating)}{'☆'.repeat(5-fb.rating)}</p>{fb.note&&<p className="text-xs text-gray-600 mt-1 italic">"{fb.note}"</p>}</div>}
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">👷 {txt.assignWorkers}</label><WorkerPicker workers={workers} selected={sel} onChange={setSel} txt={txt}/></div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">📋 {txt.adminNote}</label>
            <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder={txt.adminNotePlaceholder} value={note} onChange={e=>setNote(e.target.value)}/>
            <button onClick={handleSave} disabled={saving} className="w-full mt-1.5 bg-gray-800 text-white py-2.5 rounded-xl text-sm hover:bg-gray-900 disabled:opacity-50 font-medium">{saving?'…':txt.saveNote}</button>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">🔄 {txt.changeStatus}</p>
            <div className="flex gap-2">
              {['En attente','En cours','Résolu'].map(s=>(
                <button key={s} onClick={()=>onStatus(ticket.id,s)} disabled={updating||ticket.statut===s}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40 ${ticket.statut===s?SC[s]+' border-transparent font-semibold':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {ticket.statut===s?`✓ ${txt.statuses[s]}`:txt.statuses[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Settings panel ────────────────────────────────────────────────────────────
function SettingsPanel({settings,onSave,txt,onClose}){
  const [d,setD]=useState(settings)
  const [saved,setSaved]=useState(false)
  const [newWorker,setNewWorker]=useState({nom:'',prenom:'',matricule:'',grade:'',jobTitle:''})
  const [workerMsg,setWorkerMsg]=useState('')
  const [addingWorker,setAddingWorker]=useState(false)
  const save=()=>{onSave(d);setSaved(true);setTimeout(()=>setSaved(false),2000)}
  const colLabels={code:'Code',student:txt.student,room:txt.room,pavilion:txt.filterPavillon,type:txt.type,priority:txt.priority,status:txt.status,date:txt.date}

  const handleAddWorker=async()=>{
    if(!newWorker.nom.trim()||!newWorker.prenom.trim()){setWorkerMsg('⚠️ Name and first name required');return}
    setAddingWorker(true)
    const insertData={'Nom':newWorker.nom.trim(),'Prénom':newWorker.prenom.trim(),'Grade':newWorker.grade.trim()||'عامل صيانة','job title':newWorker.jobTitle.trim()||'عامل صيانة'}
    if(newWorker.matricule) insertData['Matricule']=parseInt(newWorker.matricule)
    const {error}=await supabase.from('workers').insert([insertData])
    setAddingWorker(false)
    if(error){setWorkerMsg('❌ '+error.message);return}
    setWorkerMsg('✅ '+txt.addWorkerSaved)
    setNewWorker({nom:'',prenom:'',matricule:'',grade:'',jobTitle:''})
    setTimeout(()=>setWorkerMsg(''),3000)
  }
  return(
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{background:'rgba(0,0,0,0.45)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" dir={txt.dir}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="font-semibold text-gray-800">⚙️ {txt.settingsTitle}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="px-6 py-5 space-y-7">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">🔺 {txt.escalationTitle}</h3>
            <p className="text-xs text-gray-400 mb-4">Unresolved tickets automatically get higher priority over time.</p>
            {[
              {key:'escalateLowToMedium',label:txt.escalateLowLabel,min:6,max:168},
              {key:'escalateMediumToHigh',label:txt.escalateMediumLabel,min:6,max:168},
            ].map(f=>(
              <div key={f.key} className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={f.min} max={f.max} step="6" value={d[f.key]}
                    onChange={e=>setD(x=>({...x,[f.key]:+e.target.value}))} className="flex-1"/>
                  <span className="text-sm font-semibold text-gray-700 w-10 text-right">{d[f.key]}h</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 {txt.ticketsPerPageLabel}</h3>
            <div className="flex gap-2">
              {[10,25,50,100].map(n=>(
                <button key={n} onClick={()=>setD(x=>({...x,ticketsPerPage:n}))}
                  className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${d.ticketsPerPage===n?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">👁 {txt.tableColsTitle}</h3>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(colLabels).map(([k,l])=>(
                <label key={k} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={d.visibleCols[k]!==false}
                    onChange={e=>setD(x=>({...x,visibleCols:{...x.visibleCols,[k]:e.target.checked}}))} className="accent-blue-600"/>
                  <span className="text-sm text-gray-700">{l}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={save}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${saved?'bg-green-600 text-white':'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {saved?`✓ ${txt.saved}`:txt.save}
          </button>
          <div className="border-t pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">👷 {txt.addWorkerTitle}</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{txt.addWorkerName} *</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={newWorker.nom} onChange={e=>setNewWorker(x=>({...x,nom:e.target.value}))} placeholder="BOUGUERRA"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{txt.addWorkerFirst} *</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={newWorker.prenom} onChange={e=>setNewWorker(x=>({...x,prenom:e.target.value}))} placeholder="Ahmed"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{txt.addWorkerMatricule}</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={newWorker.matricule} onChange={e=>setNewWorker(x=>({...x,matricule:e.target.value}))} placeholder="870012345"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{txt.addWorkerGrade}</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={newWorker.grade} onChange={e=>setNewWorker(x=>({...x,grade:e.target.value}))} placeholder="Technicien"/>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{txt.addWorkerJobTitle}</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={newWorker.jobTitle} onChange={e=>setNewWorker(x=>({...x,jobTitle:e.target.value}))} placeholder="عامل صيانة"/>
              </div>
              {workerMsg&&<p className="text-xs py-1">{workerMsg}</p>}
              <button onClick={handleAddWorker} disabled={addingWorker}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50 transition-colors">
                {addingWorker?'…':txt.addWorkerBtn}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({tickets,filters,setFilters,txt,lang,open,setOpen}){
  const pavillons=useMemo(()=>[...new Set(tickets.map(t=>t.pavillon).filter(Boolean))].sort(),[tickets])
  const rawTypes=useMemo(()=>[...new Set(tickets.map(t=>t.problem_type).filter(Boolean))]  ,[tickets])
  const locKeys=['Room','Pavilion','Toilets']
  const activeCount=[filters.dateFrom,filters.dateTo,filters.pavillon,filters.status,filters.priority,filters.type,filters.location].filter(Boolean).length
  const clear=()=>setFilters({dateFrom:'',dateTo:'',pavillon:'',status:'',priority:'',type:'',location:''})
  const chip=(field,val)=>setFilters(f=>({...f,[field]:f[field]===val?'':val}))
  return(
    <div className="bg-white rounded-xl border shadow-sm mb-4">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={()=>setOpen(!open)}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">🔽 {txt.filtersTitle}</span>
          {activeCount>0&&<span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">{activeCount} {activeCount===1?txt.activeFilters:txt.activeFiltersPlural}</span>}
        </div>
        <div className="flex items-center gap-3">
          {activeCount>0&&<button onClick={e=>{e.stopPropagation();clear()}} className="text-xs text-red-400 hover:text-red-600">{txt.clearFilters}</button>}
          <span className="text-gray-400 text-xs">{open?'▲':'▼'}</span>
        </div>
      </div>
      {open&&(
        <div className="border-t px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" dir={txt.dir}>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs text-gray-400 mb-1">📅 {txt.filterDate}</label>
            <div className="flex gap-2">
              <div className="flex-1"><p className="text-xs text-gray-400 mb-0.5">{txt.filterFrom}</p>
                <input type="date" value={filters.dateFrom} onChange={e=>setFilters(f=>({...f,dateFrom:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"/></div>
              <div className="flex-1"><p className="text-xs text-gray-400 mb-0.5">{txt.filterTo}</p>
                <input type="date" value={filters.dateTo} onChange={e=>setFilters(f=>({...f,dateTo:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"/></div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">🏢 {txt.filterPavillon}</label>
            <select value={filters.pavillon} onChange={e=>setFilters(f=>({...f,pavillon:e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              <option value="">{txt.filterAll}</option>
              {pavillons.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">🔵 {txt.filterStatus}</label>
            <div className="flex gap-1 flex-wrap">
              {['En attente','En cours','Résolu'].map(s=>(
                <button key={s} onClick={()=>chip('status',s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filters.status===s?SC[s]+' border-transparent font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {txt.statuses[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">⚡ {txt.filterPriority}</label>
            <div className="flex gap-1">
              {['High','Medium','Low'].map(p=>(
                <button key={p} onClick={()=>chip('priority',p)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filters.priority===p?PC[p]+' border-transparent font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {txt.priorities[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">🔧 {txt.filterType}</label>
            <select value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              <option value="">{txt.filterAll}</option>
              {rawTypes.map(rt=><option key={rt} value={rt}>{tf(rt,lang,PM)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">📍 {txt.filterLocation}</label>
            <div className="flex gap-1 flex-wrap">
              {locKeys.map(loc=>(
                <button key={loc} onClick={()=>chip('location',loc)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tf(filters.location,'en',LM)===loc?'bg-purple-100 text-purple-700 border-purple-200 font-medium':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {tf(loc,lang,LM)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Analytics ─────────────────────────────────────────────────────────────────
function Analytics({tickets,feedbacks,txt,lang,settings}){
  const total=tickets.length,res=tickets.filter(t=>t.statut==='Résolu').length
  const resRate=total>0?Math.round(res/total*100):0
  const escalated=tickets.filter(t=>getEffectivePriority(t,settings)!==t.priorite).length
  const now=new Date()
  const wd=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(6-i));return tickets.filter(t=>t.created_at?.startsWith(d.toISOString().split('T')[0])).length})
  const wl=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(6-i));return d.toLocaleDateString(lang==='ar'?'ar':lang==='fr'?'fr-FR':'en',{weekday:'short'})})
  const byType=Object.entries(tickets.reduce((a,t)=>{const k=tf(t.problem_type,lang,PM);a[k]=(a[k]||0)+1;return a},{})).map(([l,c])=>({label:l,count:c})).sort((a,b)=>b.count-a.count)
  const maxT=Math.max(...byType.map(d=>d.count),1)
  const byLoc=Object.entries(tickets.reduce((a,t)=>{const k=tf(t.location,lang,LM);a[k]=(a[k]||0)+1;return a},{})).map(([l,c])=>({label:l,count:c})).sort((a,b)=>b.count-a.count)
  const byRoom=Object.entries(tickets.reduce((a,t)=>{const k=`${t.chambre}/${t.pavillon}`;a[k]=(a[k]||0)+1;return a},{})).map(([l,c])=>({label:l,count:c})).sort((a,b)=>b.count-a.count).slice(0,6)
  const maxR=Math.max(...byRoom.map(d=>d.count),1)
  const prioS=[{value:tickets.filter(t=>getEffectivePriority(t,settings)==='High').length,color:'#ef4444',label:txt.priorities.High},{value:tickets.filter(t=>getEffectivePriority(t,settings)==='Medium').length,color:'#f59e0b',label:txt.priorities.Medium},{value:tickets.filter(t=>getEffectivePriority(t,settings)==='Low').length,color:'#22c55e',label:txt.priorities.Low}]
  const statS=[{value:tickets.filter(t=>t.statut==='En attente').length,color:'#9ca3af',label:txt.statuses['En attente']},{value:tickets.filter(t=>t.statut==='En cours').length,color:'#3b82f6',label:txt.statuses['En cours']},{value:tickets.filter(t=>t.statut==='Résolu').length,color:'#22c55e',label:txt.statuses['Résolu']}]
  const avg=feedbacks.length?(feedbacks.reduce((s,f)=>s+(f.rating||0),0)/feedbacks.length).toFixed(1):null
  const tc=['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#14b8a6','#ef4444','#a3e635']
  return(
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-xl border shadow-sm p-5 md:col-span-2">
        <div className="flex justify-between items-start mb-3">
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">{txt.weeklyTrend}</p><p className="text-2xl font-semibold text-gray-800 mt-0.5">{wd.reduce((s,v)=>s+v,0)}</p><p className="text-xs text-gray-400">tickets</p></div>
          <div className="flex gap-4 text-right">
            <div><p className="text-2xl font-bold text-blue-500">{resRate}%</p><p className="text-xs text-gray-400">{txt.resolutionRate}</p></div>
            {escalated>0&&<div><p className="text-2xl font-bold text-orange-500">{escalated}</p><p className="text-xs text-gray-400">{txt.escalated}</p></div>}
          </div>
        </div>
        <Spark data={wd} color="#3b82f6" h={48}/>
        <div className="flex justify-between mt-1">{wl.map((l,i)=><span key={i} className="text-xs text-gray-300">{l}</span>)}</div>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{txt.priorityBreakdown}</p>
        <div className="flex items-center gap-4 flex-1">
          <Donut slices={prioS} size={88}/>
          <div className="space-y-2 flex-1">{prioS.map(s=><div key={s.label} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:s.color}}/><span className="text-xs text-gray-600 flex-1">{s.label}</span><span className="text-xs font-medium">{s.value}</span></div>)}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{txt.status}</p>
        <div className="flex items-center gap-4 flex-1">
          <Donut slices={statS} size={88}/>
          <div className="space-y-2 flex-1">{statS.map(s=><div key={s.label} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:s.color}}/><span className="text-xs text-gray-600 flex-1">{s.label}</span><span className="text-xs font-medium">{s.value}</span></div>)}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{txt.repairsByType}</p>
        {byType.slice(0,7).map((d,i)=><HBar key={d.label} label={d.label} count={d.count} max={maxT} color={tc[i%tc.length]}/>)}
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{txt.repairsByLocation}</p>
        <div className="flex items-center gap-4 flex-1">
          <Donut slices={byLoc.map((d,i)=>({...d,color:['#3b82f6','#f59e0b','#8b5cf6'][i]||'#9ca3af'}))} size={88}/>
          <div className="space-y-2 flex-1">{byLoc.map((d,i)=><div key={d.label} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:['#3b82f6','#f59e0b','#8b5cf6'][i]||'#9ca3af'}}/><span className="text-xs text-gray-600 flex-1 truncate">{d.label}</span><span className="text-xs font-medium">{d.count}</span></div>)}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{txt.topRooms}</p>
        {byRoom.map((d,i)=><HBar key={d.label} label={d.label} count={d.count} max={maxR} color={i===0?'#ef4444':i===1?'#f59e0b':'#3b82f6'}/>)}
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{txt.feedback}</p>
        {avg?(<>
          <div className="flex items-baseline gap-2 mb-3"><span className="text-4xl font-bold text-yellow-500">{avg}</span><span className="text-yellow-400 text-xl">★</span><span className="text-xs text-gray-400">/ 5 · {feedbacks.length}</span></div>
          {[5,4,3,2,1].map(s=>{const c=feedbacks.filter(f=>f.rating===s).length;return(
            <div key={s} className="flex items-center gap-2 text-xs mb-1.5">
              <span className="text-yellow-400 w-5">{s}★</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5"><div className="bg-yellow-400 h-2.5 rounded-full" style={{width:`${feedbacks.length?c/feedbacks.length*100:0}%`}}/></div>
              <span className="text-gray-400 w-4">{c}</span>
            </div>
          )})}
        </>):<p className="text-gray-400 text-sm">{txt.noFeedback}</p>}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard({chef,onLogout}){
  const [lang,setLang]=useState('fr')
  const txt=T[lang]
  const [tickets,setTickets]=useState([])
  const [workers,setWorkers]=useState([])
  const [feedbacks,setFeedbacks]=useState([])
  const [notifications,setNotifications]=useState([])
  const [loading,setLoading]=useState(true)
  const [selTicket,setSelTicket]=useState(null)
  const [editTicket,setEditTicket]=useState(null)   // ← NEW: ticket being edited
  const [showNewTicket,setShowNewTicket]=useState(false)  // ← NEW
  const [updating,setUpdating]=useState(false)
  const [showNotifs,setShowNotifs]=useState(false)
  const [showCharts,setShowCharts]=useState(false)
  const [showExport,setShowExport]=useState(false)
  const [showSettings,setShowSettings]=useState(false)
  const [toasts,setToasts]=useState([])
  const [search,setSearch]=useState('')
  const [page,setPage]=useState(1)
  const [filterOpen,setFilterOpen]=useState(false)
  const [filters,setFilters]=useState({dateFrom:'',dateTo:'',pavillon:'',status:'',priority:'',type:'',location:''})
  const [settings,setSettings]=useState(()=>{try{return{...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem('dashSettings')||'{}')}}catch{return DEFAULT_SETTINGS}})
  const notifRef=useRef(),exportRef=useRef(),timerRef=useRef({})

  const addToast = useCallback((t) => {
    setToasts(prev=>[...prev,t])
    timerRef.current[t.id]=setTimeout(()=>setToasts(prev=>prev.filter(x=>x.id!==t.id)),5000)
  },[])

  const fetchAll=useCallback(async()=>{
    setLoading(true)
    const [{data:td},{data:wd},{data:fd},{data:nd}]=await Promise.all([
      supabase.from('tickets').select('*').order('created_at',{ascending:false}),
      supabase.from('workers').select('*'),
      supabase.from('feedback').select('*'),
      supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(50),
    ])
    if(td)setTickets(td);if(wd)setWorkers(wd);if(fd)setFeedbacks(fd);if(nd)setNotifications(nd)
    setLoading(false)
  },[])

  useEffect(()=>{
    fetchAll()
    const tc=supabase.channel('db-tickets')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'tickets'},p=>{
        setTickets(prev=>[p.new,...prev])
        addToast({id:Date.now(),title:p.new.nom,body:`${p.new.problem_type} · ${p.new.tracking_code}`})
        setNotifications(prev=>[{id:Date.now(),ticket_id:p.new.id,tracking_code:p.new.tracking_code,nom:p.new.nom,message_admin:`${p.new.nom} — ${p.new.problem_type}`,type:'new_ticket',read_by_admin:false,created_at:p.new.created_at},...prev])
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'tickets'},p=>{
        setTickets(prev=>prev.map(t=>t.id===p.new.id?p.new:t))
        setSelTicket(prev=>prev?.id===p.new.id?p.new:prev)
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'tickets'},p=>{
        setTickets(prev=>prev.filter(t=>t.id!==p.old.id))
      })
      .subscribe()
    const nc=supabase.channel('db-notifs')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},p=>{
        if(p.new.type==='new_ticket')setNotifications(prev=>prev.some(n=>n.tracking_code===p.new.tracking_code&&n.type==='new_ticket')?prev:[p.new,...prev])
      })
      .subscribe()
    return()=>{supabase.removeChannel(tc);supabase.removeChannel(nc);Object.values(timerRef.current).forEach(clearTimeout)}
  },[fetchAll,addToast])

  useEffect(()=>{
    const h=e=>{
      if(notifRef.current&&!notifRef.current.contains(e.target))setShowNotifs(false)
      if(exportRef.current&&!exportRef.current.contains(e.target))setShowExport(false)
    }
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)
  },[])

  const updateStatus=async(id,s)=>{
    setUpdating(true)
    const upd={statut:s};if(s==='Résolu')upd.resolved_at=new Date().toISOString()
    await supabase.from('tickets').update(upd).eq('id',id)
    const t=tickets.find(t=>t.id===id)
    if(t)await supabase.from('notifications').insert([{ticket_id:id,tracking_code:t.tracking_code,nom:t.nom,message_student:`Your ticket ${t.tracking_code} is now: ${s}`,type:'status_update',read_by_admin:true}])
    setUpdating(false)
  }
  const saveNote=async(id,note,workers,tools)=>{
    await supabase.from('tickets').update({admin_note:note,assigned_workers:workers,tools_used:tools}).eq('id',id)
    setTickets(prev=>prev.map(t=>t.id===id?{...t,admin_note:note,assigned_workers:workers,tools_used:tools}:t))
    setSelTicket(prev=>prev?{...prev,admin_note:note,assigned_workers:workers,tools_used:tools}:prev)
  }
  const markAllRead=async()=>{
    await supabase.from('notifications').update({read_by_admin:true}).eq('read_by_admin',false)
    setNotifications(prev=>prev.map(n=>({...n,read_by_admin:true})))
  }
  const saveSettings=s=>{setSettings(s);try{localStorage.setItem('dashSettings',JSON.stringify(s))}catch{}}

  // ── NEW: handlers for new/edit/delete ──────────────────────────────────────
  const handleTicketCreated = (newTicket) => {
    setTickets(prev => [newTicket, ...prev])
  }
  const handleTicketSaved = (updated) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelTicket(null)
  }
  const handleTicketDeleted = (id) => {
    setTickets(prev => prev.filter(t => t.id !== id))
    setSelTicket(null)
  }

  const exportToExcel=(data,name)=>{
    const ws=XLSX.utils.json_to_sheet(data.map(t=>({
      Code:t.tracking_code,Étudiant:t.nom,Chambre:t.chambre,Pavillon:t.pavillon,
      Emplacement:tf(t.location,lang,LM),Type:tf(t.problem_type,lang,PM),
      Priorité:txt.priorities[t.priorite]||t.priorite,
      Statut:txt.statuses[t.statut]||t.statut,
      Description:t.description,'Note admin':t.admin_note||'',
      'Soumis le':new Date(t.created_at).toLocaleString(),
      'Résolu le':t.resolved_at?new Date(t.resolved_at).toLocaleString():'',
    })))
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Tickets');XLSX.writeFile(wb,`${name}.xlsx`);setShowExport(false)
  }

  const handlePrint=(data)=>{
    const dir=txt.dir||'ltr'
    const rows=data.map(t=>{
      const ep=getEffectivePriority(t,settings)
      return`<tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:8px 10px;font-family:monospace;font-size:10px;color:#1d4ed8">${t.tracking_code||''}</td>
        <td style="padding:8px 10px"><strong>${t.nom||''}</strong><br/><span style="color:#9ca3af;font-size:9px">${t.chambre||''} · ${t.pavillon||''}</span></td>
        <td style="padding:8px 10px;font-size:10px">${tf(t.location,lang,LM)}</td>
        <td style="padding:8px 10px;font-size:10px">${tf(t.problem_type,lang,PM)}</td>
        <td style="padding:8px 10px;font-size:9px">${txt.priorities[ep]||ep}</td>
        <td style="padding:8px 10px;font-size:9px">${txt.statuses[t.statut]||t.statut}</td>
        <td style="padding:8px 10px;font-size:9px">${new Date(t.created_at).toLocaleDateString()}</td>
        <td style="padding:8px 10px;font-size:9px">${t.admin_note||''}</td>
      </tr>`
    }).join('')
    const html=`<!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8"/><title>Tickets</title>
    <style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111827}table{width:100%;border-collapse:collapse}thead tr{background:#1d4ed8}thead th{color:white;padding:8px 10px;text-align:left;font-size:10px}tbody tr:nth-child(even){background:#f9fafb}@media print{@page{size:A4 landscape;margin:12mm}}</style>
    </head><body><h2 style="margin-bottom:12px">🔧 ${txt.title} — ${new Date().toLocaleDateString()}</h2>
    <table><thead><tr><th>Code</th><th>${txt.student}</th><th>${txt.location}</th><th>${txt.type}</th><th>${txt.priority}</th><th>${txt.status}</th><th>${txt.date}</th><th>${txt.adminNote}</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload=()=>window.print()<\/script></body></html>`
    const w=window.open('','_blank');w.document.write(html);w.document.close();setShowExport(false)
  }

  const processed=useMemo(()=>tickets.map(t=>({...t,ep:getEffectivePriority(t,settings),escalated:getEffectivePriority(t,settings)!==t.priorite})),[tickets,settings])

  const filtered=useMemo(()=>{
    const q=search.toLowerCase()
    return processed.filter(t=>{
      if(q&&!(t.nom?.toLowerCase().includes(q)||t.tracking_code?.toLowerCase().includes(q)||t.problem_type?.toLowerCase().includes(q)||t.chambre?.toLowerCase().includes(q)))return false
      if(filters.dateFrom&&new Date(t.created_at)<new Date(filters.dateFrom))return false
      if(filters.dateTo&&new Date(t.created_at)>new Date(filters.dateTo+'T23:59:59'))return false
      if(filters.pavillon&&t.pavillon!==filters.pavillon)return false
      if(filters.status&&t.statut!==filters.status)return false
      if(filters.priority&&t.ep!==filters.priority)return false
      if(filters.type&&t.problem_type!==filters.type)return false
      if(filters.location&&tf(t.location,'en',LM)!==tf(filters.location,'en',LM))return false
      return true
    }).sort((a,b)=>{
      const statusOrder={'En attente':0,'En cours':1,'Résolu':2}
      const so=(statusOrder[a.statut]??0)-(statusOrder[b.statut]??0)
      if(so!==0)return so
      const pr=priorityRank(a.ep)-priorityRank(b.ep)
      if(pr!==0)return pr
      return new Date(a.created_at)-new Date(b.created_at)
    })
  },[processed,search,filters])

  const totalPages=Math.max(1,Math.ceil(filtered.length/settings.ticketsPerPage))
  const paginated=filtered.slice((page-1)*settings.ticketsPerPage,page*settings.ticketsPerPage)
  useEffect(()=>setPage(1),[search,filters])

  const total=tickets.length,pend=tickets.filter(t=>t.statut==='En attente').length
  const inp=tickets.filter(t=>t.statut==='En cours').length,resN=tickets.filter(t=>t.statut==='Résolu').length
  const urg=processed.filter(t=>t.ep==='High'&&t.statut!=='Résolu').length
  const cols=settings.visibleCols
  const unread=notifications.filter(n=>!n.read_by_admin).length

  return(
    <div dir={txt.dir} className="min-h-screen bg-gray-50">
      <Toast toasts={toasts} onDismiss={id=>{clearTimeout(timerRef.current[id]);setToasts(prev=>prev.filter(t=>t.id!==id))}}/>

      {/* New Ticket Modal */}
      {showNewTicket&&(
        <NewTicketModal txt={txt} lang={lang} workers={workers}
          onClose={()=>setShowNewTicket(false)}
          onCreated={handleTicketCreated}
          addToast={addToast}/>
      )}

      {/* Edit Ticket Modal */}
      {editTicket&&(
        <EditTicketModal ticket={editTicket} txt={txt} lang={lang} workers={workers}
          onClose={()=>setEditTicket(null)}
          onSaved={handleTicketSaved}
          onDeleted={handleTicketDeleted}
          addToast={addToast}/>
      )}

      {/* View Ticket Modal (with Edit button) */}
      {selTicket&&!editTicket&&(
        <TicketModal ticket={selTicket} ep={getEffectivePriority(selTicket,settings)} txt={txt} lang={lang}
          feedbacks={feedbacks} workers={workers}
          onClose={()=>setSelTicket(null)}
          onStatus={updateStatus} onSave={saveNote} updating={updating}
          onEdit={()=>{ setEditTicket(selTicket); setSelTicket(null) }}/>
      )}

      {showSettings&&<SettingsPanel settings={settings} onSave={saveSettings} txt={txt} onClose={()=>setShowSettings(false)}/>}

      {/* Navbar */}
      <div className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-20 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">{chef['Nom']?.[0]}{chef['Prénom']?.[0]}</div>
          <div><p className="font-semibold text-sm text-gray-800">{chef['Nom']} {chef['Prénom']}</p><p className="text-xs text-gray-400">{txt.serviceManager}</p></div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex gap-1">{LANGS.map(l=><button key={l.code} onClick={()=>setLang(l.code)} className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${lang===l.code?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{l.label}</button>)}</div>

          {/* ✚ NEW TICKET BUTTON */}
          <button onClick={()=>setShowNewTicket(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors">
            <span className="text-base leading-none">+</span> {txt.newTicket}
          </button>

          <button onClick={()=>setShowCharts(!showCharts)} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${showCharts?'bg-purple-600 text-white border-purple-600':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>📊 {txt.charts}</button>
          <button onClick={()=>setShowSettings(true)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">⚙️ {txt.settings}</button>

          {/* Notifs */}
          <div className="relative" ref={notifRef}>
            <button onClick={()=>setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              🔔{unread>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{unread>9?'9+':unread}</span>}
            </button>
            {showNotifs&&<div className="absolute right-0 top-10 w-80 bg-white border rounded-xl shadow-xl z-30 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b"><span className="font-semibold text-sm">{txt.notifications}</span><button onClick={markAllRead} className="text-xs text-blue-500 hover:underline">{txt.markRead}</button></div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.length===0?<p className="text-center text-gray-400 text-sm py-6">{txt.noNotifs}</p>
                :notifications.map(n=>(
                  <button key={n.id} onClick={()=>{const t=tickets.find(t=>t.id===n.ticket_id);if(t){setSelTicket(t);setShowNotifs(false)}}}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${n.read_by_admin?'':'bg-blue-50'}`}>
                    <div className="flex justify-between items-start gap-2"><p className="font-medium text-gray-700 truncate">{n.nom}</p>{!n.read_by_admin&&<span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"/>}</div>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{n.message_admin||txt.newTicket}</p>
                    <p className="text-gray-300 text-xs mt-0.5">{n.tracking_code} · {new Date(n.created_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>}
          </div>

          {/* Export */}
          <div className="relative" ref={exportRef}>
            <button onClick={()=>setShowExport(!showExport)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">📥 {txt.exportBtn}</button>
            {showExport&&<div className="absolute right-0 top-10 bg-white border rounded-xl shadow-lg z-30 w-48 overflow-hidden">
              <button onClick={()=>exportToExcel(tickets,'all-tickets')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">📥 {txt.exportAll}</button>
              <button onClick={()=>exportToExcel(filtered,'filtered-tickets')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">📥 {txt.exportFiltered}</button>
              <button onClick={()=>handlePrint(filtered)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">🖨️ {txt.printFiltered||'Print filtered'}</button>
              <button onClick={()=>handlePrint(tickets)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50">🖨️ {txt.printAll||'Print all'}</button>
            </div>}
          </div>

          <button onClick={onLogout} className="text-xs text-red-400 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">{txt.logout}</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[{l:txt.total,v:total,c:'text-gray-700',bg:'bg-white',f:{status:'',priority:''}},
            {l:txt.pending,v:pend,c:'text-gray-600',bg:'bg-white',f:{status:'En attente',priority:''}},
            {l:txt.inProgress,v:inp,c:'text-blue-600',bg:'bg-blue-50',f:{status:'En cours',priority:''}},
            {l:txt.resolved,v:resN,c:'text-green-600',bg:'bg-green-50',f:{status:'Résolu',priority:''}},
            {l:`⚡ ${txt.urgent}`,v:urg,c:'text-red-600',bg:'bg-red-50',f:{status:'',priority:'High'}},
          ].map(s=>(
            <button key={s.l} onClick={()=>setFilters(f=>({...f,...s.f}))}
              className={`${s.bg} rounded-xl border p-4 text-center shadow-sm hover:shadow-md transition-all`}>
              <p className={`text-3xl font-bold ${s.c}`}>{s.v}</p>
              <p className="text-xs text-gray-400 mt-1">{s.l}</p>
            </button>
          ))}
        </div>

        {showCharts&&<Analytics tickets={tickets} feedbacks={feedbacks} txt={txt} lang={lang} settings={settings}/>}

        <FilterBar tickets={tickets} filters={filters} setFilters={setFilters} txt={txt} lang={lang} open={filterOpen} setOpen={setFilterOpen}/>

        <div className="mb-3">
          <input className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white shadow-sm"
            placeholder={`🔍 ${txt.search}`} value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading?<div className="p-8 text-center text-gray-400">{txt.loading}</div>
          :filtered.length===0?<div className="p-8 text-center text-gray-400">{txt.noTickets}</div>
          :<>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {cols.code     &&<th className="text-left p-3 text-xs text-gray-500 font-medium">Code</th>}
                    {cols.student  &&<th className="text-left p-3 text-xs text-gray-500 font-medium">{txt.student}</th>}
                    {cols.room     &&<th className="text-left p-3 text-xs text-gray-500 font-medium">{txt.room}</th>}
                    {cols.pavilion &&<th className="text-left p-3 text-xs text-gray-500 font-medium">{txt.filterPavillon}</th>}
                    {cols.type     &&<th className="text-left p-3 text-xs text-gray-500 font-medium">{txt.type}</th>}
                    {cols.priority &&<th className="text-left p-3 text-xs text-gray-500 font-medium">{txt.priority}</th>}
                    {cols.status   &&<th className="text-left p-3 text-xs text-gray-500 font-medium">{txt.status}</th>}
                    {cols.date     &&<th className="text-left p-3 text-xs text-gray-500 font-medium whitespace-nowrap">{txt.date}</th>}
                    {/* Edit column */}
                    <th className="text-left p-3 text-xs text-gray-500 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(t=>(
                    <tr key={t.id} className={`border-b hover:bg-blue-50 transition-colors ${PB[t.ep]}`}>
                      {cols.code    &&<td className="p-3 font-mono text-xs text-blue-500 whitespace-nowrap cursor-pointer" onClick={()=>setSelTicket(t)}>{t.tracking_code}{t.escalated&&<span className="ml-1 text-orange-500" title={txt.escalated}>↑</span>}</td>}
                      {cols.student &&<td className="p-3 font-medium text-gray-700 cursor-pointer" onClick={()=>setSelTicket(t)}>{t.nom}</td>}
                      {cols.room    &&<td className="p-3 text-gray-500 cursor-pointer" onClick={()=>setSelTicket(t)}>{t.chambre}</td>}
                      {cols.pavilion&&<td className="p-3 text-gray-500 cursor-pointer" onClick={()=>setSelTicket(t)}>{t.pavillon}</td>}
                      {cols.type    &&<td className="p-3 text-gray-600 cursor-pointer" onClick={()=>setSelTicket(t)}>{tf(t.problem_type,lang,PM)}</td>}
                      {cols.priority&&<td className="p-3 cursor-pointer" onClick={()=>setSelTicket(t)}><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PC[t.ep]}`}>{txt.priorities[t.ep]}</span></td>}
                      {cols.status  &&<td className="p-3 cursor-pointer" onClick={()=>setSelTicket(t)}><span className={`px-2 py-0.5 rounded-full text-xs ${SC[t.statut]}`}>{txt.statuses[t.statut]}</span></td>}
                      {cols.date    &&<td className="p-3 text-gray-400 text-xs whitespace-nowrap cursor-pointer" onClick={()=>setSelTicket(t)}>{new Date(t.created_at).toLocaleDateString()}</td>}
                      {/* Inline edit button */}
                      <td className="p-3">
                        <button onClick={()=>setEditTicket(t)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title={lang==='ar'?'تعديل':lang==='fr'?'Modifier':'Edit'}>
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages>1&&(
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <span className="text-xs text-gray-400">{filtered.length} tickets · {page}/{totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1 rounded-lg border text-xs disabled:opacity-30 hover:bg-white">←</button>
                  {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                    const pg=Math.min(Math.max(page-2+i,1),totalPages)
                    return<button key={pg} onClick={()=>setPage(pg)} className={`px-3 py-1 rounded-lg border text-xs ${pg===page?'bg-blue-600 text-white border-blue-600':'hover:bg-white'}`}>{pg}</button>
                  })}
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1 rounded-lg border text-xs disabled:opacity-30 hover:bg-white">→</button>
                </div>
              </div>
            )}
          </>}
        </div>
      </div>

      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  )
}
