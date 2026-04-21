// Shared translation maps used by both TicketForm and Dashboard.
// Each key maps every language variant to all three language values,
// so a value stored in any language can always be translated to any other.

export const PM = {
  'Electricity':    { en: 'Electricity',    fr: 'Électricité',    ar: 'الكهرباء' },
  'Électricité':    { en: 'Electricity',    fr: 'Électricité',    ar: 'الكهرباء' },
  'الكهرباء':       { en: 'Electricity',    fr: 'Électricité',    ar: 'الكهرباء' },
  'Heating':        { en: 'Heating',        fr: 'Chauffage',      ar: 'التدفئة' },
  'Chauffage':      { en: 'Heating',        fr: 'Chauffage',      ar: 'التدفئة' },
  'التدفئة':        { en: 'Heating',        fr: 'Chauffage',      ar: 'التدفئة' },
  'Furniture':      { en: 'Furniture',      fr: 'Mobilier',       ar: 'الأثاث' },
  'Mobilier':       { en: 'Furniture',      fr: 'Mobilier',       ar: 'الأثاث' },
  'الأثاث':         { en: 'Furniture',      fr: 'Mobilier',       ar: 'الأثاث' },
  'Door / Window':  { en: 'Door / Window',  fr: 'Porte / Fenêtre', ar: 'باب / نافذة' },
  'Porte / Fenêtre':{ en: 'Door / Window',  fr: 'Porte / Fenêtre', ar: 'باب / نافذة' },
  'باب / نافذة':    { en: 'Door / Window',  fr: 'Porte / Fenêtre', ar: 'باب / نافذة' },
  'Lighting':       { en: 'Lighting',       fr: 'Éclairage',      ar: 'الإضاءة' },
  'Éclairage':      { en: 'Lighting',       fr: 'Éclairage',      ar: 'الإضاءة' },
  'الإضاءة':        { en: 'Lighting',       fr: 'Éclairage',      ar: 'الإضاءة' },
  'Doors':          { en: 'Doors',          fr: 'Portes',         ar: 'الأبواب' },
  'Portes':         { en: 'Doors',          fr: 'Portes',         ar: 'الأبواب' },
  'الأبواب':        { en: 'Doors',          fr: 'Portes',         ar: 'الأبواب' },
  'Security':       { en: 'Security',       fr: 'Sécurité',       ar: 'الأمن' },
  'Sécurité':       { en: 'Security',       fr: 'Sécurité',       ar: 'الأمن' },
  'الأمن':          { en: 'Security',       fr: 'Sécurité',       ar: 'الأمن' },
  'Cleanliness':    { en: 'Cleanliness',    fr: 'Propreté',       ar: 'النظافة' },
  'Propreté':       { en: 'Cleanliness',    fr: 'Propreté',       ar: 'النظافة' },
  'النظافة':        { en: 'Cleanliness',    fr: 'Propreté',       ar: 'النظافة' },
  'Plumbing':       { en: 'Plumbing',       fr: 'Plomberie',      ar: 'السباكة' },
  'Plomberie':      { en: 'Plumbing',       fr: 'Plomberie',      ar: 'السباكة' },
  'السباكة':        { en: 'Plumbing',       fr: 'Plomberie',      ar: 'السباكة' },
  'Water Leakage':  { en: 'Water Leakage',  fr: "Fuite d'eau",    ar: 'تسرب المياه' },
  "Fuite d'eau":    { en: 'Water Leakage',  fr: "Fuite d'eau",    ar: 'تسرب المياه' },
  'تسرب المياه':    { en: 'Water Leakage',  fr: "Fuite d'eau",    ar: 'تسرب المياه' },
  'Other':          { en: 'Other',          fr: 'Autre',          ar: 'أخرى' },
  'Autre':          { en: 'Other',          fr: 'Autre',          ar: 'أخرى' },
  'أخرى':           { en: 'Other',          fr: 'Autre',          ar: 'أخرى' },
}

export const LM = {
  'Room':     { en: 'Room',     fr: 'Chambre',   ar: 'الغرفة' },
  'Chambre':  { en: 'Room',     fr: 'Chambre',   ar: 'الغرفة' },
  'الغرفة':   { en: 'Room',     fr: 'Chambre',   ar: 'الغرفة' },
  'Pavilion': { en: 'Pavilion', fr: 'Pavillon',  ar: 'الجناح' },
  'Pavillon': { en: 'Pavilion', fr: 'Pavillon',  ar: 'الجناح' },
  'الجناح':   { en: 'Pavilion', fr: 'Pavillon',  ar: 'الجناح' },
  'Toilets':  { en: 'Toilets',  fr: 'Toilettes', ar: 'الحمامات' },
  'Toilettes':{ en: 'Toilets',  fr: 'Toilettes', ar: 'الحمامات' },
  'الحمامات': { en: 'Toilets',  fr: 'Toilettes', ar: 'الحمامات' },
}

export const SM = {
  'En attente': { en: 'Pending',     fr: 'En attente', ar: 'قيد الانتظار' },
  'En cours':   { en: 'In Progress', fr: 'En cours',   ar: 'جارٍ المعالجة' },
  'Résolu':     { en: 'Completed',   fr: 'Résolu',     ar: 'تم الحل' },
}

export const PrioM = {
  High:   { en: 'High',   fr: 'Haute',    ar: 'عالية' },
  Medium: { en: 'Medium', fr: 'Moyenne',  ar: 'متوسطة' },
  Low:    { en: 'Low',    fr: 'Faible',   ar: 'منخفضة' },
}

export const ALL_PROBLEM_TYPES = [
  'Electricity', 'Heating', 'Furniture', 'Door / Window', 'Other',
  'Lighting', 'Doors', 'Security', 'Cleanliness',
  'Plumbing', 'Water Leakage',
]

export const ALL_LOCATIONS = ['Room', 'Pavilion', 'Toilets']

/** Translate a stored value to the given language using the provided map. */
export const tf = (v, lang, map) => map?.[v]?.[lang] ?? v

/** Normalise any language variant of a problem type to its English canonical key. */
export const toEnKey = v => PM[v]?.en ?? v

/** Normalise any language variant of a location to its English canonical key. */
export const toEnLoc = v => LM[v]?.en ?? v
