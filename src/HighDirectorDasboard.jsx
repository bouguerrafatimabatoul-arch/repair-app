 import { useState, useMemo } from'react'

// ── Mock data ─────────────────────────────────────────────────────────────────
const RESIDENCES = [
  { id: 1, name: 'Résidence El-Fath',        location: 'Blida — Sector A', status: 'active',   residents: 412, capacity: 450, tickets: { open: 14, resolved: 87 }, manager: 'M. Bensalem',   founded: '2018' },
  { id: 2, name: 'Résidence Ibn Khaldoun',   location: 'Blida — Sector B', status: 'active',   residents: 389, capacity: 400, tickets: { open: 6,  resolved: 102 }, manager: 'Mme. Cherif',   founded: '2015' },
  { id: 3, name: 'Résidence El-Amal',        location: 'Médéa — Centre',   status: 'active',   residents: 276, capacity: 320, tickets: { open: 22, resolved: 58  }, manager: 'M. Hadji',      founded: '2020' },
  { id: 4, name: 'Résidence Djurdjura',      location: 'Bouira — Nord',    status: 'inactive', residents: 0,   capacity: 280, tickets: { open: 0,  resolved: 31  }, manager: 'M. Ait-Said',   founded: '2012' },
  { id: 5, name: 'Résidence El-Wifak',       location: 'Blida — Sector C', status: 'active',   residents: 344, capacity: 360, tickets: { open: 9,  resolved: 74  }, manager: 'Mme. Boukhari', founded: '2019' },
  { id: 6, name: 'Résidence Les Pins',       location: 'Tipaza — Côte',    status: 'active',   residents: 198, capacity: 250, tickets: { open: 3,  resolved: 45  }, manager: 'M. Meziane',    founded: '2021' },
]

const REPORTS = [
  { id: 1, title: 'Monthly Maintenance Report', date: '2026-04-01', type: 'maintenance', size: '2.4 MB' },
  { id: 2, title: 'Q1 Occupancy Summary',        date: '2026-04-05', type: 'occupancy',   size: '1.1 MB' },
  { id: 3, title: 'Incident Log — March 2026',   date: '2026-03-31', type: 'incident',    size: '0.8 MB' },
  { id: 4, title: 'Budget Forecast H1 2026',     date: '2026-03-28', type: 'financial',   size: '3.2 MB' },
]

const NAV = [
  { id: 'dashboard',   icon: '⬡', label: 'Dashboard' },
  { id: 'residences',  icon: '⬢', label: 'Residences' },
  { id: 'reports',     icon: '◈',  label: 'Reports' },
  { id: 'settings',   icon: '◎',  label: 'Settings' },
]

// ── Tiny helpers ───────────────────────────────────────────────────────────────
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0

function OccupancyBar({ value, max }) {
  const p = pct(value, max)
  const color = p >= 90 ? '#ef4444' : p >= 70 ? '#f59e0b' : '#22c55e'
  return (
    <div className="w-full bg-[#1e2a3a] rounded-full h-1.5 mt-1.5">
      <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${p}%`, background: color }} />
    </div>
  )
}

function StatusBadge({ status }) {
  return status === 'active'
    ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Active
      </span>
    : <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-400/10 px-2.5 py-0.5 rounded-full border border-slate-400/20">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />Inactive
      </span>
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#111c2a] p-6 flex flex-col gap-3 group hover:border-white/10 transition-all duration-300">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${accent}15 0%, transparent 60%)` }} />
      <div className="flex justify-between items-start">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-slate-500 font-mono">2026</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest">{label}</p>