import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from './supabaseClient'
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm'
import { PM, LM, ALL_PROBLEM_TYPES, ALL_LOCATIONS, tf } from './constants'
import { generateTrackingCode, assignPriority } from './utils'

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + 0.7)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch {}
}

// ─── SVG icons (no emoji) ─────────────────────────────────────────────────────
const IC = {
  tickets:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  analytics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  workers:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bell:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  mail:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  settings:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  reports:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>,
  logout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  wrench:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  sun:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  pin:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  clock:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  camera:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  user:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  home:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  phone:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.47 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 5.69 5.69l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  download:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  printer:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  search:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  inbox:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  send:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  note:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  star:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  alert:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  check:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  gear:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  night:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
}

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


// ─── Translations ──────────────────────────────────────────────────────────────
const T = {
  en:{dir:'ltr',title:'Dashboard',serviceManager:'Service Manager',
    total:'Total',pending:'Pending',inProgress:'In Progress',resolved:'Resolved',urgent:'Urgent',
    loading:'Loading…',noTickets:'No tickets found.',search:'Search name, room, code…',
    location:'Location',type:'Type',priority:'Priority',status:'Status',date:'Date',student:'Student',room:'Room',residence:'Residence',
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
    printAll:'Print all',printFiltered:'Print filtered',printTicket:'Print ticket',
    addWorkerTitle:'Add new worker',addWorkerName:'Last name',addWorkerFirst:'First name',
    addWorkerPhone:'Phone',addWorkerGrade:'Grade',addWorkerBtn:'Add worker',
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
    messages:'Messages',compose:'Compose',inbox:'Inbox',sent:'Sent',noMessages:'No messages',
    msgFrom:'From',msgTo:'To',sending:'Sending…',selectRecipient:'Select recipient',msgErrorEmpty:'Please fill in all fields.',
    addWorkerDob:'Date of birth *',addWorkerCredentials:'Generated credentials',
    addWorkerUsernameLabel:'Username',addWorkerPasswordLabel:'Password (date of birth)',
    addWorkerCredNote:"Note these credentials — they won't be shown again",
    addWorkerUserLabel:'Username:',addWorkerPassLabel:'Password:',addWorkerCredSub:'Login credentials generated automatically',
    close:'Close',
    nightShiftTonight:'Night shift — tonight',nightShiftAccess:'Access 17:00 → 08:00',
    noAccount:'No account',createAccount:'Create account',generate:'Generate',
    assignNight:'+ Assign',assignedNight:'Assigned',
    reports:'Reports',nightShiftReport:'Night Shift Reports',nightShiftShifts:'shift(s)',
    nightShiftTeam:'Assigned Team',nightShiftNoTickets:'No tickets during this shift',
    nightShiftResolved:'resolved',nightShiftCreated:'created',nightShiftWorkers:'worker(s)',
    nightShiftNone:'No night shift reports yet',
  },
  fr:{dir:'ltr',title:'Tableau de bord',serviceManager:'Chef de service',
    total:'Total',pending:'En attente',inProgress:'En cours',resolved:'Résolus',urgent:'Urgents',
    loading:'Chargement…',noTickets:'Aucun ticket.',search:'Nom, chambre, code…',
    location:'Emplacement',type:'Type',priority:'Priorité',status:'Statut',date:'Date',student:'Étudiant',room:'Chambre',residence:'Résidence',
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
    printAll:'Imprimer tout',printFiltered:'Imprimer filtré',printTicket:'Imprimer le ticket',
    addWorkerTitle:'Ajouter un ouvrier',addWorkerName:'Nom',addWorkerFirst:'Prénom',
    addWorkerPhone:'Téléphone',addWorkerGrade:'Grade',addWorkerBtn:'Ajouter',
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
    messages:'Messages',compose:'Nouveau message',inbox:'Boîte de réception',sent:'Envoyés',noMessages:'Aucun message',
    msgFrom:'De',msgTo:'À',sending:'Envoi…',selectRecipient:'Sélectionner un destinataire',msgErrorEmpty:'Veuillez remplir tous les champs.',
    addWorkerDob:'Date de naissance *',addWorkerCredentials:'Identifiants générés',
    addWorkerUsernameLabel:"Nom d'utilisateur",addWorkerPasswordLabel:'Mot de passe (date de naissance)',
    addWorkerCredNote:'Notez ces identifiants — ils ne seront plus affichés',
    addWorkerUserLabel:'Utilisateur :',addWorkerPassLabel:'Mot de passe :',addWorkerCredSub:'Identifiants de connexion générés automatiquement',
    close:'Fermer',
    nightShiftTonight:'Équipe de nuit — ce soir',nightShiftAccess:'Accès 17h00 → 08h00',
    noAccount:'Aucun compte',createAccount:'Créer compte',generate:'Générer',
    assignNight:'+ Assigner',assignedNight:'Assigné',
    reports:'Rapports',nightShiftReport:'Rapports de nuit',nightShiftShifts:'quart(s) de nuit',
    nightShiftTeam:'Équipe assignée',nightShiftNoTickets:'Aucun ticket pendant cette période',
    nightShiftResolved:'résolus',nightShiftCreated:'créés',nightShiftWorkers:'ouvrier(s)',
    nightShiftNone:"Aucun rapport de nuit pour l'instant",
  },
  ar:{dir:'rtl',title:'لوحة التحكم',serviceManager:'رئيس المصلحة',
    total:'المجموع',pending:'قيد الانتظار',inProgress:'جارٍ',resolved:'تم الحل',urgent:'عاجل',
    loading:'جارٍ التحميل…',noTickets:'لا توجد طلبات.',search:'بحث…',
    location:'الموقع',type:'النوع',priority:'الأولوية',status:'الحالة',date:'التاريخ',student:'الطالب',room:'الغرفة',residence:'السكن',
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
    printAll:'طباعة الكل',printFiltered:'طباعة المفلتر',printTicket:'طباعة الطلب',
    addWorkerTitle:'إضافة عامل جديد',addWorkerName:'اللقب',addWorkerFirst:'الاسم',
    addWorkerPhone:'الهاتف',addWorkerGrade:'الرتبة',addWorkerBtn:'إضافة',
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
    messages:'الرسائل',compose:'رسالة جديدة',inbox:'صندوق الوارد',sent:'المُرسَل',noMessages:'لا توجد رسائل',
    msgFrom:'من',msgTo:'إلى',sending:'جارٍ الإرسال…',selectRecipient:'اختر المستلم',msgErrorEmpty:'يرجى ملء جميع الحقول.',
    addWorkerDob:'تاريخ الميلاد *',addWorkerCredentials:'بيانات الدخول المُولَّدة',
    addWorkerUsernameLabel:'اسم المستخدم',addWorkerPasswordLabel:'كلمة المرور (تاريخ الميلاد)',
    addWorkerCredNote:'احتفظ ببيانات الدخول — لن تُعرض مجدداً',
    addWorkerUserLabel:'المستخدم:',addWorkerPassLabel:'كلمة المرور:',addWorkerCredSub:'تم توليد بيانات الدخول تلقائياً',
    close:'إغلاق',
    nightShiftTonight:'فريق الليل — الليلة',nightShiftAccess:'وصول 17:00 → 08:00',
    noAccount:'لا يوجد حساب',createAccount:'إنشاء حساب',generate:'توليد',
    assignNight:'+ تعيين',assignedNight:'معيَّن',
    reports:'تقارير',nightShiftReport:'تقارير المناوبة الليلية',nightShiftShifts:'مناوبة',
    nightShiftTeam:'الفريق المعيَّن',nightShiftNoTickets:'لا توجد طلبات خلال هذه الفترة',
    nightShiftResolved:'تم حلها',nightShiftCreated:'مُضافة',nightShiftWorkers:'عامل/عمال',
    nightShiftNone:'لا توجد تقارير ليلية بعد',
  },
}

const LANGS = [{code:'en',label:'EN'},{code:'fr',label:'FR'},{code:'ar',label:'ع'}]
const DEFAULT_SETTINGS = {
  escalateLowToMedium:48, escalateMediumToHigh:24, ticketsPerPage:25,
  visibleCols:{code:true,student:true,residence:true,room:true,pavilion:true,type:true,priority:true,status:true,date:true},
}
const SC = {'En attente':'bg-gray-100 text-gray-600','En cours':'bg-blue-100 text-blue-700','Résolu':'bg-green-100 text-green-700'}
const PC = {High:'bg-red-100 text-red-700',Medium:'bg-yellow-100 text-yellow-700',Low:'bg-green-100 text-green-700'}
const PB = {High:'border-l-[3px] border-red-400',Medium:'border-l-[3px] border-yellow-400',Low:'border-l-[3px] border-green-400'}
const parseImages = url => {
  if (!url) return []
  try { const p = JSON.parse(url); return Array.isArray(p) ? p : [url] } catch { return [url] }
}


// ─── Mini charts ───────────────────────────────────────────────────────────────
function Donut({slices,size=96}){
  const total=slices.reduce((s,sl)=>s+sl.value,0)
  if(!total) return <div className="text-xs text-gray-400 py-4 text-center">—</div>
  const r=38,c=2*Math.PI*r
  const segments=slices.reduce((acc,sl,i)=>{
    const prev=acc[i-1]
    const start=prev?prev.start+prev.ratio:0
    const ratio=sl.value/total
    acc.push({sl,start,ratio})
    return acc
  },[])
  return(
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="16"/>
      {segments.map(({sl,start},i)=>{
        const d=(sl.value/total)*c
        const off=c-start*c
        return(
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={sl.color} strokeWidth="16"
            strokeDasharray={`${d} ${c-d}`} strokeDashoffset={off}
            style={{transform:'rotate(-90deg)',transformOrigin:'50% 50%'}}/>
        )
      })}
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
        <div key={t.id} className="pointer-events-auto rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 border"
          style={{background:'rgba(15,20,30,0.97)',backdropFilter:'blur(20px)',borderColor:'rgba(59,130,246,0.2)',animation:'slideInRight .3s ease',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.25)'}}>
            <span style={{fontSize:14}}>🔔</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{color:'#f0f6ff'}}>{t.title||t.nom}</p>
            <p className="text-xs mt-0.5 truncate" style={{color:'rgba(255,255,255,0.4)'}}>{t.body||''}</p>
          </div>
          <button onClick={()=>onDismiss(t.id)} className="shrink-0 transition-colors" style={{color:'rgba(255,255,255,0.3)'}}
            onMouseEnter={e=>e.target.style.color='rgba(255,255,255,0.7)'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.3)'}>✕</button>
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
  const names=workers.filter(w=>selected.includes(w['id'])).map(w=>`${w['nom']} ${w['prenom']||''}`.trim())
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
              const id=w['id'],name=`${w['nom']} ${w['prenom']||''}`.trim()
              const role=w['job_title']||''
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
function NewTicketModal({ txt, lang, workers, onClose, onCreated, addToast, residenceId }) {
  const [form, setForm] = useState({
    nom: '', chambre: '', pavillon: '', location: 'Room',
    exact_location: '', problem_type: 'Electricity', priorite: 'High',
    description: '', availability: '', statut: 'En attente',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [selWorkers, setSelWorkers] = useState([])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))


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
      residence_id:   residenceId||null,
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
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:'rgba(0,0,0,0.5)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" dir={txt.dir}>
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
              <select className={inputCls} value={form.problem_type} onChange={e=>{ const v=e.target.value; set('problem_type',v); set('priorite',assignPriority(v)) }}>
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
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:'rgba(0,0,0,0.5)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" dir={txt.dir}>
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
              <select className={inputCls} value={form.problem_type} onChange={e=>{ const v=e.target.value; set('problem_type',v); set('priorite',assignPriority(v)) }}>
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
function TicketModal({ticket,ep,txt,lang,feedbacks,workers,onClose,onStatus,onSave,updating,isReadOnly,onEdit,onPrint}){
  const [note,setNote]=useState(ticket.admin_note||'')
  const tools=ticket.tools_used||''
  const [sel,setSel]=useState(()=>{try{return JSON.parse(ticket.assigned_workers||'[]')}catch{return[]}})
  const [saving,setSaving]=useState(false)
  const [zoomImg,setZoomImg]=useState(null)
  const fb=feedbacks.find(f=>f.ticket_id===ticket.id)
  const escalated=ep!==ticket.priorite
  const handleSave=async()=>{setSaving(true);await onSave(ticket.id,note,JSON.stringify(sel),tools);setSaving(false)}
  return(
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:'rgba(0,0,0,0.45)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" dir={txt.dir}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start rounded-t-2xl z-10">
          <div>
            <p className="font-mono text-sm font-bold text-blue-600">{ticket.tracking_code}</p>
            <p className="font-semibold text-gray-800 text-lg mt-0.5">{ticket.nom}</p>
            <p className="text-xs text-gray-400">{ticket.chambre} · {ticket.pavillon}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${SC[ticket.statut]}`}>{txt.statuses[ticket.statut]}</span>
            {!isReadOnly&&<button onClick={onEdit}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 text-xs font-medium border border-gray-200 transition-colors">
              ✏️ {lang==='ar'?'تعديل':lang==='fr'?'Modifier':'Edit'}
            </button>}
            <button onClick={onPrint}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 hover:text-emerald-600 text-gray-600 text-xs font-medium border border-gray-200 transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              {txt.printTicket||'Print'}
            </button>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl ml-1">✕</button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          {ep==='High'&&(
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${PC[ep]}`}>⚡ {txt.priorities[ep]}</span>
            {escalated&&<span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">↑ {txt.escalated} ({txt.originalPriority}: {txt.priorities[ticket.priorite]})</span>}
          </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">{txt.location}</p><p className="font-medium text-gray-700">{tf(ticket.location,lang,LM)}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">{txt.type}</p><p className="font-medium text-gray-700">{tf(ticket.problem_type,lang,PM)}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">{txt.submittedOn}</p><p className="font-medium text-gray-700 text-xs">{new Date(ticket.created_at).toLocaleString()}</p></div>
            {ticket.resolved_at&&<div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-green-400 mb-1">{txt.resolvedOn}</p><p className="font-medium text-green-700 text-xs">{new Date(ticket.resolved_at).toLocaleString()}</p></div>}
          </div>
          {ticket.exact_location&&<div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-blue-400 mb-1">{txt.exactLocation}</p><p className="text-sm text-blue-700">{ticket.exact_location}</p></div>}
          <div><p className="text-xs text-gray-400 mb-1 font-medium">{txt.description}</p><p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{ticket.description}</p></div>
          {ticket.availability&&<p className="text-sm text-gray-600"><span className="font-medium">{txt.availability}:</span> {ticket.availability}</p>}
          {parseImages(ticket.image_url).length>0&&(
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium">{txt.image}</p>
              <div className={`grid gap-2 ${parseImages(ticket.image_url).length===1?'grid-cols-1':'grid-cols-2'}`}>
                {parseImages(ticket.image_url).map((url,i)=>(
                  <div key={i} className="relative group cursor-zoom-in rounded-xl overflow-hidden" onClick={()=>setZoomImg(url)}>
                    <img src={url} alt={`photo-${i+1}`} className="w-full object-cover rounded-xl transition-transform group-hover:scale-105" style={{maxHeight:parseImages(ticket.image_url).length===1?192:120}} onError={e=>e.target.parentElement.style.display='none'}/>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm0 0l4 4"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {zoomImg&&(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.85)'}} onClick={()=>setZoomImg(null)}>
              <button className="absolute top-4 right-4 text-white text-3xl font-light leading-none hover:text-gray-300 transition-colors" onClick={()=>setZoomImg(null)}>✕</button>
              <img src={zoomImg} alt="zoom" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" style={{maxHeight:'90vh',maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}/>
            </div>
          )}
          {fb&&<div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"><p className="text-xs font-medium text-yellow-700 mb-1">{txt.feedback}</p><p className="text-yellow-500 text-xl">{'★'.repeat(fb.rating)}{'☆'.repeat(5-fb.rating)}</p>{fb.note&&<p className="text-xs text-gray-600 mt-1 italic">"{fb.note}"</p>}</div>}
          {!isReadOnly&&<div><label className="block text-xs font-medium text-gray-500 mb-1.5">{txt.assignWorkers}</label><WorkerPicker workers={workers} selected={sel} onChange={setSel} txt={txt}/></div>}
          {!isReadOnly&&<div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">📋 {txt.adminNote}</label>
            <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder={txt.adminNotePlaceholder} value={note} onChange={e=>setNote(e.target.value)}/>
            <button onClick={handleSave} disabled={saving} className="w-full mt-1.5 bg-gray-800 text-white py-2.5 rounded-xl text-sm hover:bg-gray-900 disabled:opacity-50 font-medium">{saving?'…':txt.saveNote}</button>
          </div>}
          {ticket.admin_note&&isReadOnly&&<div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-blue-400 mb-1">{txt.adminNote}</p><p className="text-sm text-blue-700">{ticket.admin_note}</p></div>}
          {!isReadOnly&&<div>
            <p className="text-xs font-medium text-gray-500 mb-2">🔄 {txt.changeStatus}</p>
            <div className="flex gap-2">
              {['En attente','En cours','Résolu'].map(s=>(
                <button key={s} onClick={()=>onStatus(ticket.id,s)} disabled={updating||ticket.statut===s}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40 ${ticket.statut===s?SC[s]+' border-transparent font-semibold':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {ticket.statut===s?`✓ ${txt.statuses[s]}`:txt.statuses[s]}
                </button>
              ))}
            </div>
          </div>}
        </div>
      </div>
    </div>
  )
}

// ─── Settings panel ────────────────────────────────────────────────────────────
function normalizeForUsername(s) {
  return (s||'').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')
}

function AddWorkerModal({ txt, lang, admin, residenceName, onClose, onAdded }) {
  const [form, setForm] = useState({ nom:'', prenom:'', phone:'', grade:'', jobTitle:'', dob:'' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const ic = 'w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800'
  const lc = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-1.5'

  const handleAdd = async () => {
    setError('')
    if (!form.nom.trim()||!form.prenom.trim()) {
      setError(lang==='ar'?'الاسم واللقب مطلوبان':lang==='fr'?'Nom et prénom requis':'Name and first name required')
      return
    }
    if (!form.dob) {
      setError(lang==='ar'?'تاريخ الميلاد مطلوب':lang==='fr'?'Date de naissance requise':'Date of birth required')
      return
    }
    setAdding(true)
    const res = residenceName || ''
    const username = `${normalizeForUsername(res)}_${normalizeForUsername(form.nom)}_${normalizeForUsername(form.prenom)}`
    const [y,m,d] = form.dob.split('-')
    const password = `${d}${m}${y}`
    const ins = {
      nom: form.nom.trim(), prenom: form.prenom.trim(),
      grade: form.grade.trim()||'عامل صيانة', job_title: form.jobTitle.trim()||'عامل صيانة',
      date_of_birth: form.dob, username, password,
      residence_id: admin.residence_id, residence: res,
    }
    if (form.phone) ins.phone = form.phone.trim()
    const { error:err } = await supabase.from('workers').insert([ins])
    setAdding(false)
    if (err) { setError(err.message); return }
    setCredentials({ username, password })
    onAdded()
  }

  if (credentials) return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm border border-gray-100 dark:border-slate-800">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-2xl mx-auto">✓</div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-slate-200 mb-0.5">{txt.addWorkerSaved}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{txt.addWorkerCredSub}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3 text-left">
            <div>
              <p className="text-xs text-gray-400 mb-1">{txt.addWorkerUsernameLabel}</p>
              <p className="font-mono text-sm font-semibold text-gray-800 dark:text-slate-200 select-all">{credentials.username}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">{txt.addWorkerPasswordLabel}</p>
              <p className="font-mono text-sm font-semibold text-gray-800 dark:text-slate-200 select-all">{credentials.password}</p>
            </div>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">{txt.addWorkerCredNote}</p>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            {txt.close}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="font-semibold text-gray-800 dark:text-slate-200 text-base">👷 {txt.addWorkerTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-2xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>{txt.addWorkerName} *</label><input className={ic} value={form.nom} onChange={e=>set('nom',e.target.value)} placeholder="BOUGUERRA"/></div>
            <div><label className={lc}>{txt.addWorkerFirst} *</label><input className={ic} value={form.prenom} onChange={e=>set('prenom',e.target.value)} placeholder="Ahmed"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>{txt.addWorkerPhone}</label><input type="tel" className={ic} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="0550 123 456"/></div>
            <div><label className={lc}>{txt.addWorkerGrade}</label><input className={ic} value={form.grade} onChange={e=>set('grade',e.target.value)} placeholder="Technicien"/></div>
          </div>
          <div><label className={lc}>{txt.addWorkerJobTitle}</label><input className={ic} value={form.jobTitle} onChange={e=>set('jobTitle',e.target.value)} placeholder="عامل صيانة"/></div>
          <div>
            <label className={lc}>{txt.addWorkerDob}</label>
            <input type="date" className={ic} value={form.dob} onChange={e=>set('dob',e.target.value)} max={new Date().toISOString().split('T')[0]}/>
          </div>
          {form.nom&&form.prenom&&form.dob&&(
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">{txt.addWorkerCredentials}</p>
              <p className="text-xs text-gray-600 dark:text-slate-300">
                <span className="text-gray-400">{txt.addWorkerUserLabel} </span>
                <span className="font-mono">{normalizeForUsername(residenceName||'')}_{normalizeForUsername(form.nom)}_{normalizeForUsername(form.prenom)}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-300">
                <span className="text-gray-400">{txt.addWorkerPassLabel} </span>
                <span className="font-mono">{(()=>{const[y,m,d]=form.dob.split('-');return`${d}${m}${y}`})()}</span>
              </p>
            </div>
          )}
          {error&&<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800">
              {lang==='ar'?'إلغاء':lang==='fr'?'Annuler':'Cancel'}
            </button>
            <button onClick={handleAdd} disabled={adding} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {adding?'…':txt.addWorkerBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsView({ settings, onSave, txt, lang }) {
  const [d, setD] = useState(settings)
  const [saved, setSaved] = useState(false)
  const save = () => { onSave(d); setSaved(true); setTimeout(()=>setSaved(false), 2000) }
  const colLabels = { code:'Code', student:txt.student, residence:txt.residence, room:txt.room, pavilion:txt.filterPavillon, type:txt.type, priority:txt.priority, status:txt.status, date:txt.date }
  const card = 'bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden'
  const head = 'px-5 py-4 border-b border-gray-100 dark:border-slate-800'
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className={card}>
        <div className={head}>
          <p className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{lang==='ar'?'العرض':lang==='fr'?'Affichage':'Display'}</p>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">{txt.ticketsPerPageLabel}</p>
            <div className="flex gap-2">
              {[10,25,50,100].map(n=>(
                <button key={n} onClick={()=>setD(x=>({...x,ticketsPerPage:n}))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${d.ticketsPerPage===n?'bg-blue-600 text-white border-blue-600 shadow-sm':'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">{txt.tableColsTitle}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(colLabels).map(([k,l])=>{
                const on = d.visibleCols[k]!==false
                return(
                  <button key={k} onClick={()=>setD(x=>({...x,visibleCols:{...x.visibleCols,[k]:!on}}))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${on?'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400':'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                    <span className="text-xs">{on?'✓':'○'}</span> {l}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className={head}>
          <p className="font-semibold text-gray-800 dark:text-slate-200 text-sm">⚡ {txt.escalationTitle}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {lang==='ar'?'تصعيد تلقائي لأولوية التذاكر غير المحلولة':lang==='fr'?'Escalade automatique des tickets non résolus':'Unresolved tickets auto-escalate in priority'}
          </p>
        </div>
        <div className="p-5 space-y-5">
          {[
            {key:'escalateLowToMedium',  label:txt.escalateLowLabel,   color:'#f59e0b'},
            {key:'escalateMediumToHigh', label:txt.escalateMediumLabel, color:'#ef4444'},
          ].map(f=>(
            <div key={f.key}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-600 dark:text-slate-400">{f.label}</span>
                <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">{d[f.key]}h</span>
              </div>
              <input type="range" min={6} max={168} step={6} value={d[f.key]}
                onChange={e=>setD(x=>({...x,[f.key]:+e.target.value}))}
                className="w-full" style={{accentColor:f.color}}/>
              <div className="flex justify-between text-xs text-gray-400 dark:text-slate-600 mt-1">
                <span>6h</span><span>168h (7 {lang==='ar'?'أيام':lang==='fr'?'jours':'days'})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={save}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved?'bg-emerald-600 text-white':'bg-blue-600 text-white hover:bg-blue-700'}`}>
        {saved?`✓ ${txt.saved}`:txt.save}
      </button>
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
    <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 shadow-sm mb-4">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={()=>setOpen(!open)}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">🔽 {txt.filtersTitle}</span>
          {activeCount>0&&<span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">{activeCount} {activeCount===1?txt.activeFilters:txt.activeFiltersPlural}</span>}
        </div>
        <div className="flex items-center gap-3">
          {activeCount>0&&<button onClick={e=>{e.stopPropagation();clear()}} className="text-xs text-red-400 hover:text-red-600">{txt.clearFilters}</button>}
          <span className="text-gray-400 text-xs">{open?'▲':'▼'}</span>
        </div>
      </div>
      {open&&(
        <div className="border-t dark:border-slate-700 px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" dir={txt.dir}>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs text-gray-400 dark:text-slate-500 mb-1">📅 {txt.filterDate}</label>
            <div className="flex gap-2">
              <div className="flex-1"><p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{txt.filterFrom}</p>
                <input type="date" value={filters.dateFrom} onChange={e=>setFilters(f=>({...f,dateFrom:e.target.value}))}
                  className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"/></div>
              <div className="flex-1"><p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{txt.filterTo}</p>
                <input type="date" value={filters.dateTo} onChange={e=>setFilters(f=>({...f,dateTo:e.target.value}))}
                  className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"/></div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 dark:text-slate-500 mb-1">🏢 {txt.filterPavillon}</label>
            <select value={filters.pavillon} onChange={e=>setFilters(f=>({...f,pavillon:e.target.value}))}
              className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              <option value="">{txt.filterAll}</option>
              {pavillons.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 dark:text-slate-500 mb-1">🔵 {txt.filterStatus}</label>
            <div className="flex gap-1 flex-wrap">
              {['En attente','En cours','Résolu'].map(s=>(
                <button key={s} onClick={()=>chip('status',s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filters.status===s?SC[s]+' border-transparent font-medium':'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                  {txt.statuses[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 dark:text-slate-500 mb-1">⚡ {txt.filterPriority}</label>
            <div className="flex gap-1">
              {['High','Medium','Low'].map(p=>(
                <button key={p} onClick={()=>chip('priority',p)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filters.priority===p?PC[p]+' border-transparent font-medium':'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                  {txt.priorities[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 dark:text-slate-500 mb-1">🔧 {txt.filterType}</label>
            <select value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))}
              className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              <option value="">{txt.filterAll}</option>
              {rawTypes.map(rt=><option key={rt} value={rt}>{tf(rt,lang,PM)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 dark:text-slate-500 mb-1">📍 {txt.filterLocation}</label>
            <div className="flex gap-1 flex-wrap">
              {locKeys.map(loc=>(
                <button key={loc} onClick={()=>chip('location',loc)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tf(filters.location,'en',LM)===loc?'bg-purple-100 text-purple-700 border-purple-200 font-medium':'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
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
// ─── Worker Drawer ─────────────────────────────────────────────────────────────
function WorkerDrawer({worker, tickets, txt, lang, onClose}){
  const workerTickets=useMemo(()=>{
    const id=worker['id']
    return tickets
      .filter(t=>{try{return JSON.parse(t.assigned_workers||'[]').includes(id)}catch{return false}})
      .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
  },[worker,tickets])

  const total=workerTickets.length
  const resolved=workerTickets.filter(t=>t.statut==='Résolu').length
  const inp=workerTickets.filter(t=>t.statut==='En cours').length
  const pend=workerTickets.filter(t=>t.statut==='En attente').length
  const rate=total>0?Math.round(resolved/total*100):0

  const byType=useMemo(()=>{
    const counts=workerTickets.reduce((acc,t)=>{acc[t.problem_type]=(acc[t.problem_type]||0)+1;return acc},{})
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5)
  },[workerTickets])

  const statCards=[
    {l:lang==='ar'?'المجموع':'Total',               v:total,    color:'text-slate-700 dark:text-slate-200', accent:'#64748b'},
    {l:lang==='ar'?'تم الحل':lang==='fr'?'Résolus':'Resolved', v:resolved, color:'text-emerald-600 dark:text-emerald-400', accent:'#10b981'},
    {l:lang==='ar'?'جارٍ':lang==='fr'?'En cours':'In Prog.',  v:inp,      color:'text-blue-600 dark:text-blue-400',    accent:'#3b82f6'},
    {l:lang==='ar'?'انتظار':lang==='fr'?'Attente':'Pending',  v:pend,     color:'text-amber-600 dark:text-amber-400',  accent:'#f59e0b'},
  ]

  return(
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="fixed right-0 inset-y-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
        style={{animation:'slideInRight .25s ease'}}>

        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
                {worker['nom']?.[0]}{worker['prenom']?.[0]}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg leading-tight">{worker['nom']} {worker['prenom']}</h3>
                <p className="text-slate-400 text-sm mt-0.5">{worker['grade']||'—'}</p>
                {worker['job_title']&&<p className="text-slate-500 text-xs mt-0.5">{worker['job_title']}</p>}
                {worker['residence']&&<p className="text-slate-500 text-xs mt-0.5">{worker['residence']}</p>}
                {worker['phone']&&<p className="text-slate-500 text-xs mt-1">{worker['phone']}</p>}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Stat cards */}
          <div className="p-5 border-b border-gray-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">
              {lang==='ar'?'الإحصائيات':lang==='fr'?'Statistiques':'Stats'}
            </p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {statCards.map(s=>(
                <div key={s.l} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700"
                  style={{borderTop:`3px solid ${s.accent}`}}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.v}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">{s.l}</p>
                </div>
              ))}
            </div>
            {total>0&&(
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {lang==='ar'?'معدل الحل':lang==='fr'?'Taux de résolution':'Resolution rate'}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{rate}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{width:`${rate}%`}}/>
                </div>
              </div>
            )}
          </div>

          {/* Top problem types */}
          {byType.length>0&&(
            <div className="p-5 border-b border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">
                {lang==='ar'?'أكثر الأنواع':lang==='fr'?'Types fréquents':'Top problem types'}
              </p>
              <div className="space-y-2.5">
                {byType.map(([type,count])=>(
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 dark:text-slate-300 truncate flex-1">{tf(type,lang,PM)}</span>
                    <div className="w-20 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                      <div className="h-full bg-blue-500 rounded-full" style={{width:`${(count/total)*100}%`}}/>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 w-4 text-right shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repair history */}
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">
              {lang==='ar'?'سجل الإصلاحات':lang==='fr'?'Historique des réparations':'Repair history'}
              {total>0&&<span className="ml-2 text-blue-500 font-bold">{total}</span>}
            </p>
            {total===0
              ?<p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">{txt.noTickets}</p>
              :<div className="space-y-2">
                {workerTickets.map(t=>(
                  <div key={t.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-blue-500 shrink-0">{t.tracking_code}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SC[t.statut]}`}>{txt.statuses[t.statut]}</span>
                      {(t.ep||t.priorite)==='High'&&<span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PC[t.ep||t.priorite]}`}>{txt.priorities[t.ep||t.priorite]}</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-200 truncate">{t.nom}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{t.chambre} · {t.pavillon} · {tf(t.problem_type,lang,PM)}</p>
                      <span className="text-xs text-gray-300 dark:text-slate-600 whitespace-nowrap ml-2 shrink-0">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    {t.resolved_at&&<p className="text-xs text-emerald-500 mt-0.5">✓ {new Date(t.resolved_at).toLocaleDateString()}</p>}
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Night Shift Reports ──────────────────────────────────────────────────────
function ReportsView({ adminId, tickets, workers, lang, txt }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('night_shift_assignments')
        .select('shift_date, worker_id')
        .eq('assigned_by', adminId)
        .order('shift_date', { ascending: false })
      if (data) {
        const grouped = data.reduce((acc, row) => {
          if (!acc[row.shift_date]) acc[row.shift_date] = { date: row.shift_date, workerIds: [] }
          acc[row.shift_date].workerIds.push(row.worker_id)
          return acc
        }, {})
        setShifts(Object.values(grouped))
      }
      setLoading(false)
    }
    load()
  }, [adminId])

  const getShiftTickets = (date) => {
    const start = new Date(`${date}T17:00:00`)
    const next = new Date(date); next.setDate(next.getDate() + 1)
    const end = new Date(`${next.toISOString().split('T')[0]}T08:00:00`)
    return tickets.filter(t => {
      const created = new Date(t.created_at)
      const resolved = t.resolved_at ? new Date(t.resolved_at) : null
      return (created >= start && created <= end) || (resolved && resolved >= start && resolved <= end)
    })
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString(lang==='ar'?'ar-DZ':lang==='fr'?'fr-FR':'en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  const statusColor = { 'En attente':'#f59e0b', 'En cours':'#3b82f6', 'Résolu':'#10b981' }
  const priorityColor = { 'Urgent':'#ef4444', 'Haute':'#f97316', 'Normale':'#6b7280', 'Basse':'#94a3b8' }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  if (shifts.length === 0) return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 text-center">
      <p className="text-4xl mb-3">🌙</p>
      <p className="text-gray-500 dark:text-slate-400 text-sm">{txt.nightShiftNone}</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm px-5 py-4">
        <p className="font-semibold text-gray-800 dark:text-slate-200 text-sm">📋 {txt.nightShiftReport}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{shifts.length} {txt.nightShiftShifts}</p>
      </div>

      {shifts.map(shift => {
        const shiftWorkers = workers.filter(w => shift.workerIds.includes(w['id']))
        const shiftTickets = getShiftTickets(shift.date)
        const resolved = shiftTickets.filter(t => t.statut === 'Résolu')
        const created = shiftTickets.filter(t => {
          const c = new Date(t.created_at)
          const start = new Date(`${shift.date}T17:00:00`)
          const next = new Date(shift.date); next.setDate(next.getDate() + 1)
          const end = new Date(`${next.toISOString().split('T')[0]}T08:00:00`)
          return c >= start && c <= end
        })
        const isOpen = expanded === shift.date

        return (
          <div key={shift.date} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header row */}
            <button onClick={() => setExpanded(isOpen ? null : shift.date)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl shrink-0">🌙</div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{fmtDate(shift.date)}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">17h00 → 08h00 · {shiftWorkers.length} {txt.nightShiftWorkers}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{background:'#d1fae5',color:'#065f46'}}>{resolved.length} {txt.nightShiftResolved}</span>
                  {created.length > 0 && <span className="text-xs px-2 py-1 rounded-full font-medium" style={{background:'#dbeafe',color:'#1e40af'}}>{created.length} {txt.nightShiftCreated}</span>}
                </div>
                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 dark:border-slate-800 divide-y dark:divide-slate-800">
                {/* Workers section */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">👷 {txt.nightShiftTeam}</p>
                  {shiftWorkers.length === 0
                    ? <p className="text-xs text-gray-400">—</p>
                    : <div className="flex flex-wrap gap-2">
                        {shiftWorkers.map(w => (
                          <div key={w['id']} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{w['nom']?.[0]}{w['prenom']?.[0]}</div>
                            <div>
                              <p className="text-xs font-medium text-gray-800 dark:text-slate-200">{w['nom']} {w['prenom']}</p>
                              {w['username'] && <p className="text-xs text-gray-400 font-mono">@{w['username']}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                {/* Tickets section */}
                {shiftTickets.length === 0
                  ? <div className="px-5 py-4 text-xs text-gray-400">{txt.nightShiftNoTickets}</div>
                  : <div className="px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">🎫 Tickets</p>
                      <div className="space-y-2">
                        {shiftTickets.map(t => (
                          <div key={t.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{background: priorityColor[t.priority] || '#6b7280'}}/>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{t.nom}</p>
                              <p className="text-xs text-gray-400 truncate">{t.problem_type} · {t.chambre}</p>
                            </div>
                            <span className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full" style={{background: statusColor[t.statut]+'20', color: statusColor[t.statut]}}>
                              {txt.statuses[t.statut]||t.statut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                }
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Messaging components ─────────────────────────────────────────────────────
function ComposeModal({ admin, allAdmins, lang, txt, onClose, onSent, defaultReceiverId, replyToMessageId }) {
  const [receiverId, setReceiverId] = useState(defaultReceiverId ? String(defaultReceiverId) : '')
  const [content, setContent]       = useState('')
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState('')

  const isReply = !!defaultReceiverId
  const replyRecipient = isReply ? allAdmins.find(a=>a.id===defaultReceiverId) : null
  const replyName = replyRecipient ? ((lang==='ar'?replyRecipient.full_name_ar:replyRecipient.full_name)||replyRecipient.username) : '—'

  const recipients = allAdmins.filter(a => {
    if (a.id === admin.id) return false
    if (admin.role === 'directeur_general')   return a.role === 'directeur_residence'
    if (admin.role === 'directeur_residence') return a.role === 'chef_service_technique' && a.residence_id === admin.residence_id
    return false
  })

  const handleSend = async () => {
    setError('')
    if (!receiverId || !content.trim()) { setError(txt.msgErrorEmpty); return }
    setSending(true)
    const { data, error: err } = await supabase.from('messages').insert([{
      sender_id: admin.id, receiver_id: parseInt(receiverId), content: content.trim(), reply_to_id: replyToMessageId || null,
    }]).select().single()
    setSending(false)
    if (err) { setError(err.message); return }
    onSent(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="font-semibold text-gray-800 dark:text-slate-200 text-base">
            {isReply ? `↩ ${lang==='ar'?'رد':'Répondre'}` : txt.compose}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-2xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-1.5">{txt.msgTo}</label>
            {isReply
              ? <div className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400">{replyName}</div>
              : <select value={receiverId} onChange={e=>setReceiverId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800">
                  <option value="">{txt.selectRecipient}</option>
                  {recipients.map(r=>(
                    <option key={r.id} value={r.id}>
                      {(lang==='ar'?r.full_name_ar:r.full_name)||r.username}
                    </option>
                  ))}
                </select>
            }
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-1.5">Message</label>
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder={lang==='ar'?'اكتب رسالتك…':lang==='fr'?'Écrivez votre message…':'Write your message…'}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 resize-none h-32"/>
          </div>
          {error&&<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800">{lang==='ar'?'إلغاء':lang==='fr'?'Annuler':'Cancel'}</button>
            <button onClick={handleSend} disabled={sending} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {sending ? txt.sending : (lang==='ar'?'إرسال':lang==='fr'?'Envoyer':'Send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessagesView({ admin, messages, setMessages, allAdmins, lang, txt, canCompose, onCompose, onReply }) {
  const [tab, setTab]         = useState('inbox')
  const [selected, setSelected] = useState(null)

  const inbox = messages.filter(m=>m.receiver_id===admin.id)
  const sent  = messages.filter(m=>m.sender_id===admin.id)
  const displayed = tab==='inbox' ? inbox : sent

  const getName = id => {
    const a = allAdmins.find(a=>a.id===id)
    if (!a) return '—'
    return (lang==='ar'?a.full_name_ar:a.full_name)||a.username
  }

  const markRead = async msg => {
    if (msg.receiver_id!==admin.id||msg.is_read) return
    await supabase.from('messages').update({is_read:true}).eq('id',msg.id)
    setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,is_read:true}:m))
  }

  const handleSelect = msg => {
    setSelected(selected?.id===msg.id?null:msg)
    markRead(msg)
  }

  const unreadInbox = inbox.filter(m=>!m.is_read).length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2">
          {['inbox','sent'].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?'bg-blue-600 text-white shadow-sm':'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
              {t==='inbox'?txt.inbox:txt.sent}
              {t==='inbox'&&unreadInbox>0&&<span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{unreadInbox}</span>}
            </button>
          ))}
        </div>
        {canCompose&&(
          <button onClick={onCompose} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
            ✉️ {txt.compose}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayed.length===0
          ?<div className="text-center py-16 text-gray-400 dark:text-slate-600 text-sm">{txt.noMessages}</div>
          :displayed.map(msg=>{
            const original = msg.reply_to_id ? messages.find(m=>m.id===msg.reply_to_id) : null
            const originalSenderName = original ? getName(original.sender_id) : null
            return(
            <div key={msg.id} onClick={()=>handleSelect(msg)}
              className={`bg-white dark:bg-slate-900 rounded-xl border transition-all cursor-pointer shadow-sm ${
                selected?.id===msg.id?'border-blue-300 dark:border-blue-700 shadow-md':'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'
              } ${tab==='inbox'&&!msg.is_read?'border-l-4 border-l-blue-500':''}`}>
              <div className="px-4 py-3.5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${tab==='inbox'?'bg-indigo-500':'bg-blue-500'}`}>
                    {getName(tab==='inbox'?msg.sender_id:msg.receiver_id)[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${tab==='inbox'&&!msg.is_read?'font-semibold text-gray-900 dark:text-slate-100':'font-medium text-gray-700 dark:text-slate-300'}`}>
                      {tab==='inbox'?`${txt.msgFrom}: ${getName(msg.sender_id)}`:`${txt.msgTo}: ${getName(msg.receiver_id)}`}
                    </p>
                    {original
                      ? <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                          <span className="text-indigo-400 dark:text-indigo-500 font-medium">↩ {originalSenderName}:</span>{' '}
                          {original.content}
                        </p>
                      : <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">{msg.content}</p>
                    }
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    {new Date(msg.created_at).toLocaleDateString(lang==='ar'?'ar-DZ':lang==='fr'?'fr-FR':'en-US',{month:'short',day:'numeric'})}
                  </span>
                  {tab==='inbox'&&!msg.is_read&&<span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"/>}
                </div>
              </div>
              {selected?.id===msg.id&&(
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-slate-800 space-y-3">
                  {original&&(
                    <div className="rounded-lg px-3 py-2.5 border-l-4 border-indigo-300 dark:border-indigo-600" style={{background:'rgba(99,102,241,0.06)'}}>
                      <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mb-1">{originalSenderName}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{original.content}</p>
                    </div>
                  )}
                  <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {new Date(msg.created_at).toLocaleString(lang==='ar'?'ar-DZ':lang==='fr'?'fr-FR':'en-US')}
                    </p>
                    {tab==='inbox'&&(
                      <button onClick={e=>{e.stopPropagation();onReply(msg.sender_id,msg.id)}}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        ↩ {lang==='ar'?'رد':lang==='fr'?'Répondre':'Reply'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )})
        }
      </div>
    </div>
  )
}

const ROLE_LABELS = {
  directeur_general:     { en:'Director General',       fr:'Directeur Général',      ar:'المدير العام' },
  directeur_residence:   { en:'Residence Director',     fr:'Directeur Résidence',    ar:'مدير الإقامة' },
  chef_service_technique:{ en:'Technical Service Chief',fr:'Chef Service Technique', ar:'رئيس مصلحة الصيانة' },
}

export default function Dashboard({admin,onLogout}){
  const [lang,setLang]=useState('fr')
  const isReadOnly = admin.role !== 'chef_service_technique'
  const isGlobal   = admin.role === 'directeur_general'
  const txt=T[lang]
  const [tickets,setTickets]=useState([])
  const [workers,setWorkers]=useState([])
  const [feedbacks,setFeedbacks]=useState([])
  const [adminNotifs,setAdminNotifs]=useState([])
  const [loading,setLoading]=useState(true)
  const [selTicket,setSelTicket]=useState(null)
  const [editTicket,setEditTicket]=useState(null)   // ← NEW: ticket being edited
  const [showNewTicket,setShowNewTicket]=useState(false)  // ← NEW
  const [updating,setUpdating]=useState(false)
  const [showExport,setShowExport]=useState(false)
  const [showAddWorker,setShowAddWorker]=useState(false)
  const [activeView,setActiveView]=useState('tickets')
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false)
  const [darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem('dm')==='1'}catch{return false}})
  const [selectedWorker,setSelectedWorker]=useState(null)
  const [messages,setMessages]=useState([])
  const [allAdmins,setAllAdmins]=useState([])
  const [showCompose,setShowCompose]=useState(false)
  const [replyTo,setReplyTo]=useState(null)
  const [replyToMsgId,setReplyToMsgId]=useState(null)
  const [nightShiftIds,setNightShiftIds]=useState(new Set())
  const [credWorker,setCredWorker]=useState(null)
  const [credDob,setCredDob]=useState('')

  useEffect(()=>{
    document.documentElement.classList.toggle('dark',darkMode)
    try{localStorage.setItem('dm',darkMode?'1':'0')}catch{/* ignore storage write errors */}
  },[darkMode])

  // Play sound when a new admin notification arrives
  const prevNotifCount=useRef(0)
  useEffect(()=>{
    if(adminNotifs.length>prevNotifCount.current&&prevNotifCount.current>=0)
      playNotifSound()
    prevNotifCount.current=adminNotifs.length
  },[adminNotifs])
  const [toasts,setToasts]=useState([])
  const [search,setSearch]=useState('')
  const [page,setPage]=useState(1)
  const [filterOpen,setFilterOpen]=useState(false)
  const [filters,setFilters]=useState({dateFrom:'',dateTo:'',pavillon:'',status:'',priority:'',type:'',location:''})
  const [settings,setSettings]=useState(()=>{try{return{...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem('dashSettings')||'{}')}}catch{return DEFAULT_SETTINGS}})
  const exportRef=useRef(),timerRef=useRef({})

  const addToast = useCallback((t) => {
    setToasts(prev=>[...prev,t])
    timerRef.current[t.id]=setTimeout(()=>setToasts(prev=>prev.filter(x=>x.id!==t.id)),5000)
  },[])

  useEffect(()=>{
    const loadInitial = async () => {
      setLoading(true)
      let tq=supabase.from('tickets').select('*').order('created_at',{ascending:false})
      let wq=supabase.from('workers').select('*')
      if(!isGlobal&&admin.residence_id){
        tq=tq.eq('residence_id',admin.residence_id)
        wq=wq.eq('residence_id',admin.residence_id)
      }
      const [{data:td},{data:wd}]=await Promise.all([tq,wq])
      // filter feedback to only tickets belonging to this residence
      let fd=[]
      if(td&&td.length>0){
        const ids=td.map(t=>t.id)
        const {data:fdData}=await supabase.from('feedback').select('*').in('ticket_id',ids)
        fd=fdData||[]
      }
      const today=new Date().toISOString().split('T')[0]
      const [mRes,aRes,nsRes]=await Promise.all([
        supabase.from('messages').select('*').or(`sender_id.eq.${admin.id},receiver_id.eq.${admin.id}`).order('created_at',{ascending:false}),
        supabase.from('admins').select('id,username,full_name,full_name_ar,role,residence_id'),
        supabase.from('night_shift_assignments').select('worker_id').eq('shift_date',today),
      ])
      if(td)setTickets(td);if(wd)setWorkers(wd);setFeedbacks(fd)
      if(mRes.data)setMessages(mRes.data);if(aRes.data)setAllAdmins(aRes.data)
      if(nsRes.data)setNightShiftIds(new Set(nsRes.data.map(r=>r.worker_id)))
      // Load unread new-ticket notifications for the bell badge
      // Include residence_id=null rows (older data before residence_id was added to inserts)
      let nq=supabase.from('notifications').select('*').eq('type','new_ticket').eq('read_by_admin',false).order('created_at',{ascending:false})
      if(!isGlobal&&admin.residence_id)nq=nq.or(`residence_id.eq.${admin.residence_id},residence_id.is.null`)
      const{data:nd}=await nq
      if(nd){setAdminNotifs(nd);prevNotifCount.current=nd.length}
      setLoading(false)
    }
    loadInitial()
    const timers=timerRef.current
    const ticketFilter=(!isGlobal&&admin.residence_id)?`residence_id=eq.${admin.residence_id}`:undefined
    const ch=supabase.channel(`db-changes-${admin.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'tickets',...(ticketFilter&&{filter:ticketFilter})},p=>{
        setTickets(prev=>{
          if(prev.some(t=>t.id===p.new.id))return prev
          addToast({id:Date.now(),title:p.new.nom,body:`${p.new.problem_type} · ${p.new.tracking_code}`})
          return [p.new,...prev]
        })
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'tickets',...(ticketFilter&&{filter:ticketFilter})},p=>{
        setTickets(prev=>prev.map(t=>t.id===p.new.id?p.new:t))
        setSelTicket(prev=>prev?.id===p.new.id?p.new:prev)
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'tickets'},p=>{
        setTickets(prev=>prev.filter(t=>t.id!==p.old.id))
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>{
        if(p.new.receiver_id===admin.id||p.new.sender_id===admin.id){
          setMessages(prev=>prev.some(m=>m.id===p.new.id)?prev:[p.new,...prev])
          if(p.new.receiver_id===admin.id)
            addToast({id:Date.now(),title:lang==='ar'?'رسالة جديدة':lang==='fr'?'Nouveau message':'New message',body:p.new.content.slice(0,60)})
        }
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},p=>{
        setMessages(prev=>prev.map(m=>m.id===p.new.id?p.new:m))
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'night_shift_assignments'},p=>{
        setNightShiftIds(prev=>new Set([...prev,p.new.worker_id]))
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'night_shift_assignments'},p=>{
        setNightShiftIds(prev=>{const s=new Set(prev);s.delete(p.old.worker_id);return s})
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},p=>{
        if(p.new.type==='new_ticket'){
          if(isGlobal||!admin.residence_id||!p.new.residence_id||p.new.residence_id===admin.residence_id)
            setAdminNotifs(prev=>[p.new,...prev])
        }
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications'},p=>{
        if(p.new.read_by_admin)
          setAdminNotifs(prev=>prev.filter(n=>n.id!==p.new.id))
      })
      .subscribe()
    // Always poll every 10s — guarantees freshness even if realtime isn't configured
    const fetchAll=async()=>{
      let q=supabase.from('tickets').select('*').order('created_at',{ascending:false})
      if(!isGlobal&&admin.residence_id)q=q.eq('residence_id',admin.residence_id)
      let nq=supabase.from('notifications').select('*').eq('type','new_ticket').eq('read_by_admin',false).order('created_at',{ascending:false})
      if(!isGlobal&&admin.residence_id)nq=nq.or(`residence_id.eq.${admin.residence_id},residence_id.is.null`)
      const[{data},{data:nd}]=await Promise.all([q,nq])
      if(data)setTickets(data)
      if(nd)setAdminNotifs(nd)
    }
    timers['poll']=setInterval(fetchAll,10000)
    const onFocus=()=>fetchAll()
    window.addEventListener('focus',onFocus)
    return()=>{
      supabase.removeChannel(ch)
      window.removeEventListener('focus',onFocus)
      Object.values(timers).forEach(id=>typeof id==='number'?clearTimeout(id):clearInterval(id))
    }
  },[addToast])

  useEffect(()=>{
    const h=e=>{
      if(exportRef.current&&!exportRef.current.contains(e.target))setShowExport(false)
    }
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)
  },[])

  const updateStatus=async(id,s)=>{
    setUpdating(true)
    const upd={statut:s};if(s==='Résolu')upd.resolved_at=new Date().toISOString();else upd.resolved_at=null
    const {error}=await supabase.from('tickets').update(upd).eq('id',id)
    if(!error){
      setTickets(prev=>prev.map(t=>t.id===id?{...t,...upd}:t))
      setSelTicket(prev=>prev?.id===id?{...prev,...upd}:prev)
      const t=tickets.find(tk=>tk.id===id)
      if(t){
        const msg=s==='Résolu'
          ?(lang==='ar'?`تم حل طلبك ${t.tracking_code}`:`Votre demande ${t.tracking_code} a été résolue`)
          :s==='En cours'
          ?(lang==='ar'?`طلبك ${t.tracking_code} قيد المعالجة`:`Votre demande ${t.tracking_code} est en cours de traitement`)
          :(lang==='ar'?`تم تحديث طلبك ${t.tracking_code}`:`Votre demande ${t.tracking_code} a été mise à jour`)
        const {error:ne}=await supabase.from('notifications').insert([{
          ticket_id:     id,
          tracking_code: t.tracking_code,
          nom:           t.nom,
          message_student: msg,
          type:          'status_update',
          read_by_admin: true,
          read_by_student: false,
          residence_id:  t.residence_id||null,
          triggered_by_admin: admin.id||null,
        }])
        if(ne) console.error('Notification insert error:',ne)
      }
    }
    setUpdating(false)
  }
  const saveNote=async(id,note,workers,tools)=>{
    await supabase.from('tickets').update({admin_note:note,assigned_workers:workers,tools_used:tools}).eq('id',id)
    setTickets(prev=>prev.map(t=>t.id===id?{...t,admin_note:note,assigned_workers:workers,tools_used:tools}:t))
    setSelTicket(prev=>prev?{...prev,admin_note:note,assigned_workers:workers,tools_used:tools}:prev)
  }
  const markAllRead=async()=>{
    if(adminNotifs.length===0)return
    const ids=adminNotifs.map(n=>n.id)
    setAdminNotifs([])
    await supabase.from('notifications').update({read_by_admin:true}).in('id',ids)
  }

  const toggleNightShift=async(workerId)=>{
    const today=new Date().toISOString().split('T')[0]
    if(nightShiftIds.has(workerId)){
      await supabase.from('night_shift_assignments').delete().eq('worker_id',workerId).eq('shift_date',today)
      setNightShiftIds(prev=>{const s=new Set(prev);s.delete(workerId);return s})
    } else {
      const {error}=await supabase.from('night_shift_assignments').insert([{worker_id:workerId,assigned_by:admin.id,shift_date:today}])
      if(!error) setNightShiftIds(prev=>new Set([...prev,workerId]))
    }
  }
  const saveSettings=s=>{setSettings(s);try{localStorage.setItem('dashSettings',JSON.stringify(s))}catch{/* ignore storage write errors */}}

  const generateCredentialsForWorker=async()=>{
    if(!credWorker||!credDob) return
    const res=credWorker['residence']||''
    const username=`${normalizeForUsername(res)}_${normalizeForUsername(credWorker['nom'])}_${normalizeForUsername(credWorker['prenom']||'')}`
    const [y,m,d]=credDob.split('-')
    const password=`${d}${m}${y}`
    const {error}=await supabase.from('workers').update({username,password,date_of_birth:credDob}).eq('id',credWorker['id'])
    if(!error){
      setWorkers(prev=>prev.map(w=>w['id']===credWorker['id']?{...w,username,password,date_of_birth:credDob}:w))
      setCredWorker(null);setCredDob('')
    }
  }

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
    const isAr = lang === 'ar'
    const isFr = lang === 'fr'
    const dir  = isAr ? 'rtl' : 'ltr'
    const locale = isAr ? 'ar-DZ' : isFr ? 'fr-FR' : 'en-US'
    const today = new Date().toLocaleDateString(locale, { year:'numeric', month:'long', day:'numeric' })
    const residenceName = data.find(t=>t.residence)?.residence || '—'

    const L = isAr ? {
      title:'سجل طلبات الصيانة', org:'RESITECH', residence:'الإقامة الجامعية',
      date:'التاريخ', ref:'المرجع', total:'المجموع',
      col:['#','المرجع','الطالب','الغرفة / الجناح','التاريخ','نوع المشكلة','الموقع'],
      sigLeft:'إمضاء مدير الإقامة', sigRight:'إمضاء رئيس مصلحة الصيانة', generated:'وثيقة صادرة عن منصة RESITECH',
    } : isFr ? {
      title:'Registre des demandes de maintenance', org:'RESITECH', residence:'Résidence',
      date:'Date', ref:'Référence', total:'Total',
      col:['N°','Code','Étudiant','Chambre / Pav.','Date','Type de problème','Emplacement'],
      sigLeft:'Signature du directeur de résidence', sigRight:'Signature du chef de service technique', generated:'Document généré par RESITECH',
    } : {
      title:'Maintenance Request Log', org:'RESITECH', residence:'Residence',
      date:'Date', ref:'Reference', total:'Total',
      col:['#','Code','Student','Room / Pav.','Date','Problem Type','Location'],
      sigLeft:'Residence Director Signature', sigRight:'Technical Service Manager Signature', generated:'Document generated by RESITECH',
    }

    const ref = `RT-${new Date().getFullYear()}-${String(data.length).padStart(4,'0')}`
    const tdA = `style="text-align:${dir==='rtl'?'right':'left'};padding-${dir==='rtl'?'right':'left'}:6px"`

    const rows = data.map((t,i) => `<tr>
      <td>${String(i+1).padStart(2,'0')}</td>
      <td style="font-family:monospace;font-size:7.5px;color:#1d4ed8">${t.tracking_code||''}</td>
      <td ${tdA}>${t.nom||''}</td>
      <td>${t.chambre||''}${t.pavillon?` · ${t.pavillon}`:''}</td>
      <td>${new Date(t.created_at).toLocaleDateString(locale,{year:'2-digit',month:'2-digit',day:'2-digit'})}</td>
      <td ${tdA}>${t.problem_type||''}</td>
      <td ${tdA}>${t.exact_location||''}</td>
    </tr>`).join('')

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="UTF-8"/>
    <title>${L.title}</title>
    <style>
      @page{size:A4 portrait;margin:14mm 14mm}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:8.5px;direction:${dir};color:#111;background:#fff}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid #1e293b;margin-bottom:12px}
      .org-name{font-size:18px;font-weight:700;letter-spacing:1px;color:#1e293b}
      .org-sub{font-size:8px;color:#64748b;margin-top:2px;letter-spacing:.5px;text-transform:uppercase}
      .meta-block{text-align:${dir==='rtl'?'left':'right'};font-size:8.5px;color:#374151;line-height:2}
      .meta-block strong{color:#1e293b}
      .doc-title{background:#1e293b;color:#fff;text-align:center;padding:7px 0;font-size:11px;font-weight:600;letter-spacing:.5px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse;margin-bottom:14px}
      colgroup .c-num{width:6%}
      colgroup .c-code{width:11%}
      colgroup .c-name{width:21%}
      colgroup .c-room{width:13%}
      colgroup .c-date{width:11%}
      colgroup .c-type{width:19%}
      colgroup .c-loc{width:19%}
      thead th{background:#1e293b;color:#fff;padding:5px 4px;text-align:center;font-size:7.5px;font-weight:600;letter-spacing:.2px;white-space:nowrap}
      tbody td{padding:4px;text-align:center;border-bottom:1px solid #e2e8f0;font-size:7.5px;vertical-align:middle}
      tbody tr:nth-child(even){background:#f8fafc}
      tbody tr:last-child td{border-bottom:2px solid #1e293b}
      .footer{display:flex;justify-content:space-between;margin-top:24px;gap:20px}
      .sig-block{flex:1}
      .sig-label{font-weight:600;font-size:8.5px;margin-bottom:32px;color:#1e293b}
      .sig-line{border-top:1px solid #94a3b8;padding-top:3px;color:#94a3b8;font-size:7.5px}
      .footer-note{text-align:center;margin-top:14px;font-size:7px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px}
      @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="org-name">${L.org}</div>
        <div class="org-sub">${L.residence} — ${residenceName}</div>
      </div>
      <div class="meta-block">
        <div><strong>${L.date}:</strong> ${today}</div>
        <div><strong>${L.ref}:</strong> ${ref}</div>
        <div><strong>${L.total}:</strong> ${data.length}</div>
      </div>
    </div>
    <div class="doc-title">${L.title}</div>
    <table>
      <colgroup>
        <col class="c-num"/><col class="c-code"/><col class="c-name"/><col class="c-room"/>
        <col class="c-date"/><col class="c-type"/><col class="c-loc"/>
      </colgroup>
      <thead><tr>${L.col.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">
      <div class="sig-block" style="text-align:${dir==='rtl'?'right':'left'}">
        <div class="sig-label">${L.sigLeft}</div>
        <div class="sig-line">${L.sigLeft}</div>
      </div>
      <div class="sig-block" style="text-align:${dir==='rtl'?'left':'right'}">
        <div class="sig-label">${L.sigRight}</div>
        <div class="sig-line">${L.sigRight}</div>
      </div>
    </div>
    <div class="footer-note">${L.generated} · ${today}</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const w=window.open('','_blank');w.document.write(html);w.document.close();setShowExport(false)
  }

  const handlePrintSingle=(ticket)=>{
    const isAr = lang === 'ar'
    const isFr = lang === 'fr'
    const dir  = isAr ? 'rtl' : 'ltr'
    const locale = isAr ? 'ar-DZ' : isFr ? 'fr-FR' : 'en-US'
    const today = new Date().toLocaleDateString(locale, { year:'numeric', month:'long', day:'numeric' })

    const L = isAr ? {
      title:'بطاقة طلب صيانة', org:'RESITECH',
      code:'رقم المرجع', submitted:'تاريخ التقديم', student:'الطالب',
      room:'الغرفة', pavilion:'الجناح', residence:'الإقامة',
      location:'الموقع', exactLocation:'الموقع الدقيق',
      type:'نوع المشكلة', description:'الوصف', availability:'وقت التوفر',
      resolvedOn:'تاريخ الحل',
      worker:'العامل المكلف', remarque:'ملاحظة العامل',
      sigWorker:'إمضاء العامل', sigChef:'إمضاء رئيس مصلحة الصيانة',
      generated:'وثيقة صادرة عن منصة RESITECH',
    } : isFr ? {
      title:'Bon de demande de maintenance', org:'RESITECH',
      code:'Code de suivi', submitted:'Date de soumission', student:'Étudiant(e)',
      room:'Chambre', pavilion:'Pavillon', residence:'Résidence',
      location:'Emplacement', exactLocation:'Lieu précis',
      type:'Type de problème', description:'Description', availability:'Disponibilité',
      resolvedOn:'Résolu le',
      worker:'Ouvrier assigné', remarque:"Remarque de l'ouvrier",
      sigWorker:"Signature de l'ouvrier", sigChef:'Signature du chef de service technique',
      generated:'Document généré par RESITECH',
    } : {
      title:'Maintenance Request Form', org:'RESITECH',
      code:'Tracking code', submitted:'Submitted on', student:'Student',
      room:'Room', pavilion:'Pavilion', residence:'Residence',
      location:'Location', exactLocation:'Exact spot',
      type:'Problem type', description:'Description', availability:'Availability',
      resolvedOn:'Resolved on',
      worker:'Assigned worker', remarque:'Worker remark',
      sigWorker:'Worker Signature', sigChef:'Technical Service Manager Signature',
      generated:'Document generated by RESITECH',
    }

    // Resolve assigned worker names from the workers list
    const assignedIds = (() => { try { return JSON.parse(ticket.assigned_workers || '[]') } catch { return [] } })()
    const assignedNames = assignedIds
      .map(id => workers.find(w => String(w.id) === String(id)))
      .filter(Boolean)
      .map(w => [w.prenom, w.nom].filter(Boolean).join(' '))
      .join(', ')

    const field = (label, value) => value ? `
      <div class="field">
        <div class="field-label">${label}</div>
        <div class="field-value">${value}</div>
      </div>` : ''

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="UTF-8"/>
    <title>${L.title} — ${ticket.tracking_code}</title>
    <style>
      @page{size:A4 portrait;margin:18mm 20mm}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;direction:${dir};color:#111;background:#fff}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid #1e293b;margin-bottom:16px}
      .org-name{font-size:22px;font-weight:700;letter-spacing:1px;color:#1e293b}
      .org-sub{font-size:8.5px;color:#64748b;margin-top:3px;letter-spacing:.5px;text-transform:uppercase}
      .doc-title{background:#1e293b;color:#fff;text-align:center;padding:9px 0;font-size:13px;font-weight:600;letter-spacing:.5px;margin-bottom:18px}
      .code-bar{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:18px;text-align:center}
      .code-val{font-family:monospace;font-size:22px;font-weight:700;color:#1d4ed8;letter-spacing:3px}
      .section{margin-bottom:14px}
      .section-title{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .field{padding:8px 10px;background:#f8fafc;border-radius:5px;border:1px solid #f1f5f9}
      .field.full{grid-column:1/-1}
      .field-label{font-size:7.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:3px}
      .field-value{font-size:10px;color:#1e293b;line-height:1.5}
      .worker-box{background:#f0fdf4;border:1px solid #bbf7d0}
      .worker-box .field-label{color:#16a34a}
      .worker-box .field-value{color:#14532d;font-weight:600}
      .description-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:10px;min-height:55px;font-size:10px;color:#374151;line-height:1.6}
      .remarque-box{border:1px solid #e2e8f0;border-radius:5px;min-height:64px;padding:6px 10px;background:repeating-linear-gradient(to bottom,#fff,#fff 23px,#e9eef5 23px,#e9eef5 24px)}
      .footer{margin-top:28px;display:flex;justify-content:space-between;gap:20px}
      .sig-block{flex:1}
      .sig-label{font-weight:600;font-size:9px;margin-bottom:38px;color:#1e293b}
      .sig-line{border-top:1px solid #94a3b8;padding-top:4px;color:#94a3b8;font-size:8px}
      .footer-note{text-align:center;margin-top:14px;font-size:7.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px}
      @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="org-name">${L.org}</div>
        <div class="org-sub">${ticket.residence||''}</div>
      </div>
      <div style="text-align:${dir==='rtl'?'left':'right'};font-size:9px;color:#374151;line-height:2">
        <div><strong>${today}</strong></div>
      </div>
    </div>
    <div class="doc-title">${L.title}</div>

    <div class="code-bar">
      <div style="font-size:8px;color:#64748b;margin-bottom:3px">${L.code}</div>
      <div class="code-val">${ticket.tracking_code}</div>
    </div>

    <div class="section">
      <div class="section-title">${isAr?'معلومات الطالب':isFr?'Informations étudiant':'Student information'}</div>
      <div class="grid">
        ${field(L.student, ticket.nom)}
        ${field(L.residence, ticket.residence||'—')}
        ${field(L.room, ticket.chambre)}
        ${field(L.pavilion, ticket.pavillon)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">${isAr?'تفاصيل الطلب':isFr?'Détails de la demande':'Request details'}</div>
      <div class="grid">
        ${field(L.type, ticket.problem_type)}
        ${field(L.location, ticket.location)}
        ${field(L.exactLocation, ticket.exact_location)}
        ${field(L.submitted, new Date(ticket.created_at).toLocaleDateString(locale,{year:'numeric',month:'long',day:'numeric'}))}
        ${ticket.availability ? field(L.availability, ticket.availability) : ''}
        ${ticket.resolved_at ? field(L.resolvedOn, new Date(ticket.resolved_at).toLocaleDateString(locale,{year:'numeric',month:'long',day:'numeric'})) : ''}
        ${assignedNames ? `<div class="field full worker-box"><div class="field-label">${L.worker}</div><div class="field-value">${assignedNames}</div></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">${L.description}</div>
      <div class="description-box">${ticket.description||''}</div>
    </div>

    <div class="section">
      <div class="section-title">${L.remarque}</div>
      <div class="remarque-box"></div>
    </div>

    <div class="footer">
      <div class="sig-block" style="text-align:${dir==='rtl'?'right':'left'}">
        <div class="sig-label">${L.sigWorker}</div>
        <div class="sig-line">${L.sigWorker}</div>
      </div>
      <div class="sig-block" style="text-align:${dir==='rtl'?'left':'right'}">
        <div class="sig-label">${L.sigChef}</div>
        <div class="sig-line">${L.sigChef}</div>
      </div>
    </div>
    <div class="footer-note">${L.generated} · ${today}</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const w=window.open('','_blank');w.document.write(html);w.document.close()
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
  const currentPage=Math.min(page,totalPages)
  const paginated=filtered.slice((currentPage-1)*settings.ticketsPerPage,currentPage*settings.ticketsPerPage)

  const total=tickets.length,pend=tickets.filter(t=>t.statut==='En attente').length
  const inp=tickets.filter(t=>t.statut==='En cours').length,resN=tickets.filter(t=>t.statut==='Résolu').length
  const urg=processed.filter(t=>t.ep==='High'&&t.statut!=='Résolu').length
  const cols=settings.visibleCols
  const unread=adminNotifs.length
  const unreadCodes=new Set(adminNotifs.map(n=>n.tracking_code))
  const unreadMessages=messages.filter(m=>m.receiver_id===admin.id&&!m.is_read).length

  const sidebarW = sidebarCollapsed ? '4rem' : '14rem'

  return(
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
    <Toast toasts={toasts} onDismiss={id=>{clearTimeout(timerRef.current[id]);setToasts(prev=>prev.filter(t=>t.id!==id))}}/>

    {/* Modals */}
    {showNewTicket&&(<NewTicketModal txt={txt} lang={lang} workers={workers} onClose={()=>setShowNewTicket(false)} onCreated={handleTicketCreated} addToast={addToast} residenceId={admin.residence_id}/>)}
    {editTicket&&(<EditTicketModal ticket={editTicket} txt={txt} lang={lang} workers={workers} onClose={()=>setEditTicket(null)} onSaved={handleTicketSaved} onDeleted={handleTicketDeleted} addToast={addToast}/>)}
    {selTicket&&!editTicket&&(<TicketModal ticket={selTicket} ep={getEffectivePriority(selTicket,settings)} txt={txt} lang={lang} feedbacks={feedbacks} workers={workers} onClose={()=>setSelTicket(null)} onStatus={updateStatus} onSave={saveNote} updating={updating} isReadOnly={isReadOnly} onEdit={()=>{ setEditTicket(selTicket); setSelTicket(null) }} onPrint={()=>handlePrintSingle(selTicket)}/>)}
    {showAddWorker&&<AddWorkerModal txt={txt} lang={lang} admin={admin} residenceName={workers[0]?.residence||''} onClose={()=>setShowAddWorker(false)} onAdded={()=>{ supabase.from('workers').select('*').eq('residence_id',admin.residence_id).then(({data})=>{if(data)setWorkers(data)}) }}/>}
    {selectedWorker&&<WorkerDrawer worker={selectedWorker} tickets={tickets} txt={txt} lang={lang} onClose={()=>setSelectedWorker(null)}/>}
    {showCompose&&<ComposeModal admin={admin} allAdmins={allAdmins} lang={lang} txt={txt} defaultReceiverId={replyTo} replyToMessageId={replyToMsgId} onClose={()=>{setShowCompose(false);setReplyTo(null);setReplyToMsgId(null)}} onSent={msg=>setMessages(prev=>[msg,...prev])}/>}

    {/* ── Sidebar ── */}
    <aside className={`fixed inset-y-0 z-30 bg-slate-900 hidden md:flex flex-col transition-all duration-300 ${sidebarCollapsed?'w-16':'w-56'}`}
      style={{[txt.dir==='rtl'?'right':'left']:0, boxShadow:'4px 0 32px rgba(0,0,0,0.18)'}}>

      <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-800 ${sidebarCollapsed?'justify-center':''}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-md text-white [&_svg]:w-4 [&_svg]:h-4">{IC.wrench}</div>
        {!sidebarCollapsed&&<span className="text-white font-bold text-sm tracking-wide">RESITECH</span>}
      </div>

      {!sidebarCollapsed&&(
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
              {((lang==='ar'?admin.full_name_ar:admin.full_name)||admin.username||'?')[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {lang==='ar'?admin.full_name_ar:admin.full_name||admin.username}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {ROLE_LABELS[admin.role]?.[lang]||admin.role}
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto mt-1">
        {[
          {id:'tickets',       icon:IC.tickets,   label:lang==='ar'?'الطلبات':lang==='fr'?'Tickets':'Tickets'},
          {id:'analytics',     icon:IC.analytics, label:txt.charts},
          {id:'workers',       icon:IC.workers,   label:lang==='ar'?'العمال':lang==='fr'?'Ouvriers':'Workers'},
          {id:'notifications', icon:IC.bell,      label:txt.notifications, badge:unread||null},
          {id:'messages',      icon:IC.mail,      label:txt.messages,      badge:unreadMessages||null},
          {id:'settings',      icon:IC.settings,  label:txt.settings},
          ...(!isReadOnly?[{id:'reports', icon:IC.reports, label:lang==='ar'?'تقارير':lang==='fr'?'Rapports':'Reports'}]:[]),
        ].map(item=>(
          <button key={item.id} onClick={()=>setActiveView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeView===item.id?'bg-blue-600 text-white shadow-md':'text-slate-400 hover:text-white hover:bg-slate-800'
            } ${sidebarCollapsed?'justify-center':''}`}>
            <span className="w-4 h-4 shrink-0 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full">{item.icon}</span>
            {!sidebarCollapsed&&<>
              <span className="font-medium truncate">{item.label}</span>
              {item.badge>0&&<span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">{item.badge>9?'9+':item.badge}</span>}
            </>}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-800 space-y-1">
        <button onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 text-sm transition-all ${sidebarCollapsed?'justify-center':''}`}>
          <span className="text-sm">{sidebarCollapsed?(txt.dir==='rtl'?'←':'→'):(txt.dir==='rtl'?'→':'←')}</span>
          {!sidebarCollapsed&&<span className="text-xs">{lang==='ar'?'طي':lang==='fr'?'Réduire':'Collapse'}</span>}
        </button>
        <button onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm transition-all ${sidebarCollapsed?'justify-center':''}`}>
          <span className="w-4 h-4 shrink-0 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full">{IC.logout}</span>
          {!sidebarCollapsed&&<span className="font-medium">{txt.logout}</span>}
        </button>
      </div>
    </aside>

    {/* ── Main ── */}
    <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
      txt.dir==='rtl'
        ? (sidebarCollapsed?'md:mr-16':'md:mr-56')
        : (sidebarCollapsed?'md:ml-16':'md:ml-56')
    }`}>

      <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-2 shadow-sm" dir={txt.dir}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1 h-6 bg-blue-600 rounded-full shrink-0"/>
          <h1 className="font-semibold text-gray-800 dark:text-slate-200 text-sm truncate">
            {activeView==='tickets'?(lang==='ar'?'الطلبات':'Tickets'):activeView==='analytics'?txt.charts:activeView==='workers'?(lang==='ar'?'العمال':lang==='fr'?'Ouvriers':'Workers'):activeView==='messages'?txt.messages:activeView==='settings'?txt.settings:activeView==='reports'?(lang==='ar'?'تقارير':lang==='fr'?'Rapports':'Reports'):txt.notifications}
          </h1>
          {activeView==='tickets'&&<span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium shrink-0">{filtered.length}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={()=>setDarkMode(d=>!d)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <span className="w-3.5 h-3.5 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full">{darkMode?IC.sun:IC.moon}</span>
          </button>
          <div className="hidden md:flex gap-1">{LANGS.map(l=><button key={l.code} onClick={()=>setLang(l.code)} className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${lang===l.code?'bg-blue-600 text-white border-blue-600':'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>{l.label}</button>)}</div>
          {!isReadOnly&&<button onClick={()=>setShowNewTicket(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors">
            <span className="font-bold leading-none">+</span><span className="hidden sm:inline"> {txt.newTicket}</span>
          </button>}
          <div className="relative hidden md:block" ref={exportRef}>
            <button onClick={()=>setShowExport(!showExport)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"><span className="w-3.5 h-3.5 [&_svg]:w-full [&_svg]:h-full">{IC.download}</span>{txt.exportBtn}</button>
            {showExport&&(<div className={`absolute top-9 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl shadow-lg z-30 w-48 overflow-hidden ${txt.dir==='rtl'?'left-0':'right-0'}`}>
              <button onClick={()=>exportToExcel(tickets,'all-tickets')} className="w-full ltr:text-left rtl:text-right px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-b dark:border-slate-700">{txt.exportAll}</button>
              <button onClick={()=>exportToExcel(filtered,'filtered-tickets')} className="w-full ltr:text-left rtl:text-right px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-b dark:border-slate-700">{txt.exportFiltered}</button>
              <button onClick={()=>handlePrint(filtered)} className="w-full ltr:text-left rtl:text-right px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-b dark:border-slate-700">{txt.printFiltered||'Print filtered'}</button>
              <button onClick={()=>handlePrint(tickets)} className="w-full ltr:text-left rtl:text-right px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">{txt.printAll||'Print all'}</button>
            </div>)}
          </div>
        </div>
      </header>

      <main className="flex-1 p-3 md:p-6 pb-24 md:pb-6 overflow-auto" dir={txt.dir}>

      {/* ── Tickets view ── */}
      {activeView==='tickets'&&<>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            {l:txt.total,          v:total, accent:'#64748b', text:'text-slate-700', f:{status:'',priority:''}},
            {l:txt.pending,        v:pend,  accent:'#f59e0b', text:'text-amber-600', f:{status:'En attente',priority:''}},
            {l:txt.inProgress,     v:inp,   accent:'#3b82f6', text:'text-blue-600',  f:{status:'En cours',priority:''}},
            {l:txt.resolved,       v:resN,  accent:'#10b981', text:'text-emerald-600',f:{status:'Résolu',priority:''}},
            {l:txt.urgent, v:urg,   accent:'#ef4444', text:'text-red-600',   f:{status:'',priority:'High'}},
          ].map(s=>(
            <button key={s.l} onClick={()=>setFilters(f=>({...f,...s.f}))}
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4 text-left shadow-sm hover:shadow-md transition-all"
              style={{borderLeft:`4px solid ${s.accent}`}}>
              <p className={`text-3xl font-bold ${s.text}`}>{s.v}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{s.l}</p>
              <div className="mt-2.5 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{width:total>0?`${Math.round(s.v/total*100)}%`:'0%', background:s.accent, opacity:0.55}}/>
              </div>
            </button>
          ))}
        </div>

        <FilterBar tickets={tickets} filters={filters} setFilters={setFilters} txt={txt} lang={lang} open={filterOpen} setOpen={setFilterOpen}/>

        <div className="my-3">
          <input className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 shadow-sm"
            placeholder={txt.search} value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading
            ?<div className="p-12 flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
              <svg className="animate-spin h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <span className="text-sm">{txt.loading}</span>
            </div>
            :filtered.length===0
              ?<div className="p-8 text-center text-gray-400 dark:text-slate-500">{txt.noTickets}</div>
              :<>
                {/* ── Mobile card list ── */}
                <div className="md:hidden divide-y dark:divide-slate-800">
                  {paginated.map(t=>(
                    <button key={t.id} onClick={()=>setSelTicket(t)}
                      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${PB[t.ep]}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm text-gray-800 dark:text-slate-200 truncate">{t.nom}</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{tf(t.problem_type,lang,PM)} · {t.chambre}</p>
                        <p className="text-xs font-mono text-gray-300 dark:text-slate-600 mt-0.5">{t.tracking_code}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SC[t.statut]}`}>{txt.statuses[t.statut]}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{new Date(t.created_at).toLocaleDateString()}</span>
                        {t.ep==='High'&&<span className="text-xs font-bold text-red-600 border border-red-200 rounded px-1">!</span>}
                      </div>
                    </button>
                  ))}
                </div>
                {/* ── Desktop table ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                      <tr>
                        {cols.code     &&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Code</th>}
                        {cols.student  &&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.student}</th>}
                        {cols.residence&&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.residence}</th>}
                        {cols.room     &&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.room}</th>}
                        {cols.pavilion &&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.filterPavillon}</th>}
                        {cols.type     &&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.type}</th>}
                        {cols.priority &&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.priority}</th>}
                        {cols.status   &&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.status}</th>}
                        {cols.date     &&<th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide whitespace-nowrap">{txt.date}</th>}
                        <th className="w-10"/>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(t=>(
                        <tr key={t.id} className={`border-b dark:border-slate-800 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors ${PB[t.ep]}`}>
                          {cols.code    &&<td className="p-3 font-mono text-xs text-blue-500 whitespace-nowrap cursor-pointer" onClick={()=>setSelTicket(t)}>{t.tracking_code}{t.escalated&&<span className="ml-1 text-orange-500" title={txt.escalated}>↑</span>}</td>}
                          {cols.student &&<td className="p-3 font-medium text-gray-700 dark:text-slate-200 cursor-pointer" onClick={()=>setSelTicket(t)}>{t.nom}</td>}
                          {cols.residence&&<td className="p-3 text-gray-500 dark:text-slate-400 cursor-pointer text-xs" onClick={()=>setSelTicket(t)}>{t.residence||'—'}</td>}
                          {cols.room    &&<td className="p-3 text-gray-500 dark:text-slate-400 cursor-pointer" onClick={()=>setSelTicket(t)}>{t.chambre}</td>}
                          {cols.pavilion&&<td className="p-3 text-gray-500 dark:text-slate-400 cursor-pointer" onClick={()=>setSelTicket(t)}>{t.pavillon}</td>}
                          {cols.type    &&<td className="p-3 text-gray-600 dark:text-slate-300 cursor-pointer" onClick={()=>setSelTicket(t)}>{tf(t.problem_type,lang,PM)}</td>}
                          {cols.priority&&<td className="p-3 cursor-pointer" onClick={()=>setSelTicket(t)}>{t.ep==='High'&&<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PC[t.ep]}`}>{txt.priorities[t.ep]}</span>}</td>}
                          {cols.status  &&<td className="p-3 cursor-pointer" onClick={()=>setSelTicket(t)}><span className={`px-2 py-0.5 rounded-full text-xs ${SC[t.statut]}`}>{txt.statuses[t.statut]}</span></td>}
                          {cols.date    &&<td className="p-3 text-gray-400 dark:text-slate-500 text-xs whitespace-nowrap cursor-pointer" onClick={()=>setSelTicket(t)}>{new Date(t.created_at).toLocaleDateString()}</td>}
                          <td className="p-3">
                            {!isReadOnly&&<button onClick={()=>setEditTicket(t)}
                              className="p-1.5 rounded-lg text-gray-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title={lang==='ar'?'تعديل':lang==='fr'?'Modifier':'Edit'}>✏️</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>{/* end desktop table */}
                {totalPages>1&&(
                  <div className="flex items-center justify-between px-4 py-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                    <span className="text-xs text-gray-400 dark:text-slate-500">{filtered.length} tickets · {currentPage}/{totalPages}</span>
                    <div className="flex gap-1">
                      <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="px-3 py-1 rounded-lg border dark:border-slate-700 text-xs disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400">←</button>
                      {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                        const pg=Math.min(Math.max(currentPage-2+i,1),totalPages)
                        return<button key={pg} onClick={()=>setPage(pg)} className={`px-3 py-1 rounded-lg border dark:border-slate-700 text-xs ${pg===currentPage?'bg-blue-600 text-white border-blue-600':'hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400'}`}>{pg}</button>
                      })}
                      <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="px-3 py-1 rounded-lg border dark:border-slate-700 text-xs disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 dark:text-slate-400">→</button>
                    </div>
                  </div>
                )}
              </>
          }
        </div>
      </>}

      {/* ── Analytics view ── */}
      {activeView==='analytics'&&<Analytics tickets={tickets} feedbacks={feedbacks} txt={txt} lang={lang} settings={settings}/>}

      {/* ── Workers view ── */}
      {activeView==='workers'&&(
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b dark:border-slate-700 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-slate-200">{lang==='ar'?'العمال':lang==='fr'?'Ouvriers':'Workers'}</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{workers.length} {lang==='ar'?'عامل':lang==='fr'?'ouvriers':'workers'}</p>
            </div>
            {!isReadOnly&&<button onClick={()=>setShowAddWorker(true)}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
              + {txt.addWorkerBtn}
            </button>}
          </div>
          {/* Mobile card list */}
          <div className="md:hidden divide-y dark:divide-slate-800">
            {workers.length===0&&<p className="p-8 text-center text-gray-400 dark:text-slate-500 text-sm">{txt.noWorkers}</p>}
            {workers.map((w,i)=>(
              <button key={w['id']||i} onClick={()=>setSelectedWorker(w)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                  {(w['nom']?.[0]||'')}{(w['prenom']?.[0]||'')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 dark:text-slate-200 truncate">{w['nom']} {w['prenom']}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{w['job_title']||w['grade']||'—'}{w['residence']?` · ${w['residence']}`:''}</p>
                </div>
                {w['phone']&&<p className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{w['phone']}</p>}
              </button>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.addWorkerName}</th>
                  <th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.addWorkerFirst}</th>
                  <th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.residence}</th>
                  <th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.addWorkerPhone}</th>
                  <th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.addWorkerGrade}</th>
                  <th className="ltr:text-left rtl:text-right p-3 text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">{txt.addWorkerJobTitle}</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w,i)=>(
                  <tr key={w['id']||i} onClick={()=>setSelectedWorker(w)}
                    className="border-b dark:border-slate-800 hover:bg-blue-50/30 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                    <td className="p-3 font-medium text-gray-700 dark:text-slate-200">{w['nom']}</td>
                    <td className="p-3 text-gray-600 dark:text-slate-300">{w['prenom']||'—'}</td>
                    <td className="p-3 text-xs text-gray-500 dark:text-slate-400">{w['residence']||'—'}</td>
                    <td className="p-3 text-xs text-gray-500 dark:text-slate-400">{w['phone']||'—'}</td>
                    <td className="p-3 text-gray-500 dark:text-slate-400">{w['grade']||'—'}</td>
                    <td className="p-3 text-gray-500 dark:text-slate-400 text-xs">{w['job_title']||'—'}</td>
                  </tr>
                ))}
                {workers.length===0&&<tr><td colSpan={6} className="p-8 text-center text-gray-400 dark:text-slate-500">{txt.noWorkers}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Night shift panel (chef only) ── */}
      {activeView==='workers'&&admin.role==='chef_service_technique'&&(
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 text-indigo-400 [&_svg]:w-full [&_svg]:h-full">{IC.night}</span>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{txt.nightShiftTonight}</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{txt.nightShiftAccess} · {nightShiftIds.size} {lang==='ar'?'معيَّن':lang==='fr'?'assigné(s)':'assigned'}</p>
              </div>
            </div>
          </div>
          <div className="divide-y dark:divide-slate-800">
            {workers.length===0&&<p className="text-center text-gray-400 text-sm py-6">{txt.noWorkers}</p>}
            {workers.map(w=>{
              const assigned=nightShiftIds.has(w['id'])
              const hasAccount=!!w['username']
              const isSettingCred=credWorker?.['id']===w['id']
              return(
                <div key={w['id']} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 transition-colors ${assigned?'bg-indigo-600':hasAccount?'bg-slate-400 dark:bg-slate-600':'bg-amber-400'}`}>
                        {w['nom']?.[0]}{w['prenom']?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-slate-200 text-sm">{w['nom']} {w['prenom']}</p>
                        {hasAccount
                          ?<p className="text-xs text-gray-400 dark:text-slate-500 font-mono">@{w['username']}</p>
                          :<p className="text-xs text-amber-500">{txt.noAccount}</p>
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!hasAccount&&(
                        <button onClick={()=>{setCredWorker(isSettingCred?null:w);setCredDob('')}}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors">
                          {isSettingCred?txt.newTicketCancel:txt.createAccount}
                        </button>
                      )}
                      {hasAccount&&(
                        <button onClick={()=>toggleNightShift(w['id'])}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${assigned?'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200':'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200'}`}>
                          {assigned?txt.assignedNight:txt.assignNight}
                        </button>
                      )}
                    </div>
                  </div>
                  {isSettingCred&&(
                    <div className="mt-2 ml-12 flex items-center gap-2">
                      <input type="date" value={credDob} onChange={e=>setCredDob(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200"/>
                      <button onClick={generateCredentialsForWorker} disabled={!credDob}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors">
                        {txt.generate}
                      </button>
                      {credDob&&(
                        <span className="text-xs text-gray-400 font-mono">
                          {(()=>{const[y,m,d]=credDob.split('-');return`${normalizeForUsername(w['residence']||'')}_${normalizeForUsername(w['nom'])}_${normalizeForUsername(w['prenom']||'')} / ${d}${m}${y}`})()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Notifications view ── */}
      {activeView==='notifications'&&(
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden max-w-2xl">
          <div className="px-5 py-4 border-b dark:border-slate-700 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-slate-200">{txt.notifications}</h3>
              {unread>0&&<p className="text-xs text-blue-500 mt-0.5">{unread} {lang==='ar'?'جديد':lang==='fr'?'nouveaux':'new'}</p>}
            </div>
            {unread>0&&<button onClick={markAllRead}
              className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              {txt.markRead}
            </button>}
          </div>
          <div className="divide-y dark:divide-slate-800 max-h-[calc(100vh-220px)] overflow-y-auto">
            {tickets.length===0
              ?<p className="text-center text-gray-400 dark:text-slate-500 text-sm py-8">{txt.noNotifs}</p>
              :[...tickets].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,50).map(t=>{
                const isNew=unreadCodes.has(t.tracking_code)
                return(
                  <button key={t.id} onClick={()=>{setSelTicket(t);setActiveView('tickets')}}
                    className={`w-full text-left px-5 py-4 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${isNew?'bg-blue-50/40 dark:bg-blue-900/10':''}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${t.statut==='Résolu'?'bg-emerald-100 dark:bg-emerald-900/30':t.statut==='En cours'?'bg-blue-100 dark:bg-blue-900/30':'bg-amber-100 dark:bg-amber-900/30'}`}>
                          <span className="w-3.5 h-3.5 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full">{t.statut==='Résolu'?IC.check:t.statut==='En cours'?IC.gear:IC.bell}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate ${isNew?'font-semibold text-gray-900 dark:text-slate-100':'font-medium text-gray-700 dark:text-slate-300'}`}>{t.nom}</p>
                          <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 truncate">{tf(t.problem_type,lang,PM)} · {t.chambre}</p>
                          <p className="text-gray-300 dark:text-slate-600 text-xs mt-0.5 font-mono">{t.tracking_code}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {isNew&&<span className="w-2 h-2 rounded-full bg-blue-500"/>}
                        <span className="text-gray-400 dark:text-slate-500 text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleDateString(lang==='ar'?'ar-DZ':lang==='fr'?'fr-FR':'en-US',{month:'short',day:'numeric'})}</span>
                      </div>
                    </div>
                  </button>
                )
              })
            }
          </div>
        </div>
      )}

      {/* ── Settings view ── */}
      {activeView==='settings'&&(
        <SettingsView settings={settings} onSave={saveSettings} txt={txt} lang={lang}/>
      )}

      {/* ── Reports view (chef only) ── */}
      {activeView==='reports'&&!isReadOnly&&(
        <ReportsView adminId={admin.id} tickets={tickets} workers={workers} lang={lang} txt={txt}/>
      )}

      {/* ── Messages view ── */}
      {activeView==='messages'&&(
        <MessagesView admin={admin} messages={messages} setMessages={setMessages} allAdmins={allAdmins} lang={lang} txt={txt}
          canCompose={admin.role!=='chef_service_technique'} onCompose={()=>setShowCompose(true)}
          onReply={(senderId,msgId)=>{setReplyTo(senderId);setReplyToMsgId(msgId);setShowCompose(true)}}/>
      )}

      </main>
    </div>

    {/* ── Mobile bottom nav ── */}
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-900 border-t border-slate-800 flex md:hidden" dir="ltr">
      {[
        {id:'tickets',       icon:IC.tickets, label:lang==='ar'?'الطلبات':lang==='fr'?'Tickets':'Tickets'},
        {id:'workers',       icon:IC.workers, label:lang==='ar'?'العمال':lang==='fr'?'Ouvriers':'Workers'},
        {id:'notifications', icon:IC.bell,    label:lang==='ar'?'إشعارات':lang==='fr'?'Notifs':'Notifs', badge:unread||null},
        {id:'messages',      icon:IC.mail,    label:lang==='ar'?'رسائل':lang==='fr'?'Messages':'Msgs',   badge:unreadMessages||null},
      ].map(item=>(
        <button key={item.id} onClick={()=>setActiveView(item.id)}
          className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors relative ${activeView===item.id?'text-blue-400':'text-slate-500'}`}>
          {item.badge>0&&<span className="absolute top-1.5 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">{item.badge>9?'9+':item.badge}</span>}
          <span className="w-5 h-5 [&_svg]:w-full [&_svg]:h-full">{item.icon}</span>
          <span className="text-[9px] font-medium leading-none tracking-wide">{item.label}</span>
          {activeView===item.id&&<span className="absolute top-0 inset-x-0 h-0.5 bg-blue-500 rounded-b"/>}
        </button>
      ))}
      <button onClick={onLogout}
        className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-red-400 transition-colors">
        <span className="w-5 h-5 [&_svg]:w-full [&_svg]:h-full">{IC.logout}</span>
        <span className="text-[9px] font-medium leading-none tracking-wide">{txt.logout}</span>
      </button>
    </nav>

    <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}`}</style>
  </div>
  )
}