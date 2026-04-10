// Auto-assign priority based on problem type
const highPriorityTypes = [
  // EN
  'Electricity', 'Water Leakage', 'Security', 'Door / Window',
  // FR
  'Électricité', "Fuite d'eau", 'Sécurité', 'Porte / Fenêtre',
  // AR
  'الكهرباء', 'تسرب المياه', 'الأمن', 'باب / نافذة',
]

const mediumPriorityTypes = [
  // EN
  'Heating', 'Plumbing', 'Lighting', 'Doors',
  // FR
  'Chauffage', 'Plomberie', 'Éclairage', 'Portes',
  // AR
  'التدفئة', 'السباكة', 'الإضاءة', 'الأبواب',
]

export function assignPriority(problemType) {
  if (highPriorityTypes.includes(problemType)) return 'High'
  if (mediumPriorityTypes.includes(problemType)) return 'Medium'
  return 'Low'
}

export function generateTrackingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'RQ-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate hourly slots from 8am to 5pm
export function getDaySlots() {
  const slots = []
  for (let h = 8; h < 17; h++) {
    const hour = h < 10 ? `0${h}` : `${h}`
    slots.push(`${hour}:00`)
  }
  return slots // ['08:00', '09:00', ..., '16:00']
}

// Night shift label per language
export const nightShiftLabel = {
  en: '🌙 Night Shift (Emergency only)',
  fr: '🌙 Équipe de nuit (Urgence uniquement)',
  ar: '🌙 الوردية الليلية (للحالات الطارئة فقط)',
}
