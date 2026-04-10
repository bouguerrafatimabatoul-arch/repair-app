import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Supabase client ────────────────────────────────────────────────────────
// Replace with your own values (same ones used in supabaseClient.js)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  "En attente": { en: "Pending", fr: "En attente", ar: "قيد الانتظار", color: "#EF9F27" },
  "En cours":   { en: "In Progress", fr: "En cours", ar: "جارٍ المعالجة", color: "#378ADD" },
  "Résolu":     { en: "Resolved", fr: "Résolu", ar: "تم الحل", color: "#639922" },
};

const PRIORITY_COLORS = { High: "#E24B4A", Medium: "#EF9F27", Low: "#639922" };

const T = {
  en: {
    title: "Maintenance Dashboard",
    subtitle: "Chef de Service Panel",
    logout: "Logout",
    login: "Sign In",
    username: "Username",
    password: "Password",
    loginError: "Invalid credentials",
    total: "Total Tickets",
    pending: "Pending",
    inProgress: "In Progress",
    resolved: "Resolved",
    allStatus: "All Status",
    allPriority: "All Priority",
    allLocation: "All Location",
    searchPlaceholder: "Search by name, room, code…",
    code: "Code",
    student: "Student",
    room: "Room",
    location: "Location",
    problem: "Problem",
    priority: "Priority",
    status: "Status",
    date: "Date",
    actions: "Actions",
    updateStatus: "Update status",
    feedbackTitle: "Student Feedback",
    noFeedback: "No feedback yet",
    rating: "Rating",
    comment: "Comment",
    charts: "Analytics",
    byCategory: "By Category",
    byLocation: "By Location",
    byPriority: "By Priority",
    noTickets: "No tickets found",
    loading: "Loading…",
  },
  fr: {
    title: "Tableau de Bord",
    subtitle: "Panneau Chef de Service",
    logout: "Déconnexion",
    login: "Connexion",
    username: "Identifiant",
    password: "Mot de passe",
    loginError: "Identifiants invalides",
    total: "Total Tickets",
    pending: "En attente",
    inProgress: "En cours",
    resolved: "Résolus",
    allStatus: "Tous les statuts",
    allPriority: "Toutes priorités",
    allLocation: "Tous emplacements",
    searchPlaceholder: "Rechercher par nom, chambre, code…",
    code: "Code",
    student: "Étudiant",
    room: "Chambre",
    location: "Emplacement",
    problem: "Problème",
    priority: "Priorité",
    status: "Statut",
    date: "Date",
    actions: "Actions",
    updateStatus: "Modifier le statut",
    feedbackTitle: "Avis des Étudiants",
    noFeedback: "Aucun avis pour l'instant",
    rating: "Note",
    comment: "Commentaire",
    charts: "Analyses",
    byCategory: "Par catégorie",
    byLocation: "Par emplacement",
    byPriority: "Par priorité",
    noTickets: "Aucun ticket trouvé",
    loading: "Chargement…",
  },
  ar: {
    title: "لوحة الصيانة",
    subtitle: "لوحة تحكم رئيس القسم",
    logout: "تسجيل الخروج",
    login: "دخول",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    loginError: "بيانات الاعتماد غير صحيحة",
    total: "إجمالي التذاكر",
    pending: "قيد الانتظار",
    inProgress: "جارٍ المعالجة",
    resolved: "تم الحل",
    allStatus: "كل الحالات",
    allPriority: "كل الأولويات",
    allLocation: "كل المواقع",
    searchPlaceholder: "بحث بالاسم، الغرفة، الرمز…",
    code: "الرمز",
    student: "الطالب",
    room: "الغرفة",
    location: "الموقع",
    problem: "المشكلة",
    priority: "الأولوية",
    status: "الحالة",
    date: "التاريخ",
    actions: "الإجراءات",
    updateStatus: "تحديث الحالة",
    feedbackTitle: "آراء الطلاب",
    noFeedback: "لا توجد آراء بعد",
    rating: "التقييم",
    comment: "التعليق",
    charts: "التحليلات",
    byCategory: "حسب الفئة",
    byLocation: "حسب الموقع",
    byPriority: "حسب الأولوية",
    noTickets: "لم يتم العثور على تذاكر",
    loading: "جارٍ التحميل…",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <span style={{ color: "#EF9F27", fontSize: 14 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 500,
      color,
      background: bg,
      border: `1px solid ${color}33`,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ lang, setLang, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = T[lang];
  const isRTL = lang === "ar";

  async function handleLogin() {
    setError("");
    setLoading(true);
    const { data, error: err } = await supabase
      .from("workers")
      .select("*")
      .eq("username", username.trim())
      .eq("password", password)
      .single();
    setLoading(false);
    if (err || !data) { setError(t.loginError); return; }
    onLogin(data);
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f4f0",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Language switcher */}
      <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 8 }}>
        {["en", "fr", "ar"].map(l => (
          <button key={l} onClick={() => setLang(l)} style={{
            padding: "4px 12px", borderRadius: 8, border: "1.5px solid",
            borderColor: lang === l ? "#185FA5" : "#ccc",
            background: lang === l ? "#E6F1FB" : "#fff",
            color: lang === l ? "#185FA5" : "#666",
            fontWeight: lang === l ? 600 : 400,
            fontSize: 13, cursor: "pointer",
          }}>{l.toUpperCase()}</button>
        ))}
      </div>

      <div style={{
        background: "#fff",
        border: "1px solid #e2e0d8",
        borderRadius: 16,
        padding: "2.5rem 2rem",
        width: "100%", maxWidth: 380,
        boxSizing: "border-box",
      }}>
        {/* Logo mark */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "#185FA5", color: "#fff",
            fontSize: 26, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 12px",
          }}>🔧</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1a1a18" }}>{t.title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>{t.subtitle}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text" placeholder={t.username} value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14 }}
          />
          <input
            type="password" placeholder={t.password} value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14 }}
          />
          {error && <p style={{ color: "#E24B4A", fontSize: 13, margin: 0 }}>{error}</p>}
          <button onClick={handleLogin} disabled={loading} style={{
            padding: "11px", borderRadius: 10,
            background: "#185FA5", color: "#fff",
            border: "none", fontWeight: 600, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}>{loading ? t.loading : t.login}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e0d8",
      borderRadius: 14, padding: "1.1rem 1.4rem",
      borderLeft: `4px solid ${accent}`,
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1a1a18" }}>{value}</p>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard({ chef, lang, setLang, onLogout }) {
  const t = T[lang];
  const isRTL = lang === "ar";

  const [tickets, setTickets] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("tickets"); // tickets | charts | feedback

  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [search, setSearch] = useState("");

  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchAll();
    // Realtime subscription
    const sub = supabase
      .channel("tickets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchAll())
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: tData }, { data: fData }] = await Promise.all([
      supabase.from("tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
    ]);
    setTickets(tData || []);
    setFeedback(fData || []);
    setLoading(false);
  }

  async function updateStatus(ticket) {
    const cycle = { "En attente": "En cours", "En cours": "Résolu", "Résolu": "En attente" };
    const next = cycle[ticket.statut] || "En attente";
    setUpdatingId(ticket.id);
    await supabase.from("tickets").update({ statut: next }).eq("id", ticket.id);
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, statut: next } : t));
    setUpdatingId(null);
  }

  // ── Filtered tickets ──────────────────────────────────────────────────────
  const filtered = tickets.filter(tk => {
    if (filterStatus && tk.statut !== filterStatus) return false;
    if (filterPriority && tk.priorite !== filterPriority) return false;
    if (filterLocation && tk.location !== filterLocation) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(tk.nom?.toLowerCase().includes(q) ||
          tk.chambre?.toLowerCase().includes(q) ||
          tk.tracking_code?.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.statut === "En attente").length,
    inProgress: tickets.filter(t => t.statut === "En cours").length,
    resolved: tickets.filter(t => t.statut === "Résolu").length,
  };

  // ── Chart data ────────────────────────────────────────────────────────────
  function countBy(key) {
    const map = {};
    tickets.forEach(t => { map[t[key]] = (map[t[key]] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }

  const catData = countBy("problem_type");
  const locData = countBy("location");
  const priData = countBy("priorite");
  const PIE_COLORS = ["#185FA5", "#639922", "#EF9F27", "#E24B4A", "#1D9E75", "#D4537E"];

  // ── Status display ────────────────────────────────────────────────────────
  function statusBadge(statut) {
    const s = STATUS_LABELS[statut] || STATUS_LABELS["En attente"];
    const label = s[lang] || statut;
    const colorMap = { "En attente": ["#EF9F27", "#FAEEDA"], "En cours": ["#185FA5", "#E6F1FB"], "Résolu": ["#639922", "#EAF3DE"] };
    const [color, bg] = colorMap[statut] || ["#888", "#eee"];
    return <Badge label={label} color={color} bg={bg} />;
  }

  function priorityBadge(p) {
    const color = PRIORITY_COLORS[p] || "#888";
    return <Badge label={p} color={color} bg={color + "22"} />;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: "#f5f4f0",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#1a1a18",
    }}>
      {/* Header */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e2e0d8",
        padding: "0 1.5rem",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#185FA5", color: "#fff",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          }}>🔧</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{t.title}</p>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>{chef.username}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["en", "fr", "ar"].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: "3px 10px", borderRadius: 8, border: "1.5px solid",
              borderColor: lang === l ? "#185FA5" : "#ddd",
              background: lang === l ? "#E6F1FB" : "transparent",
              color: lang === l ? "#185FA5" : "#666",
              fontWeight: lang === l ? 600 : 400,
              fontSize: 12, cursor: "pointer",
            }}>{l.toUpperCase()}</button>
          ))}
          <button onClick={onLogout} style={{
            padding: "5px 14px", borderRadius: 8,
            border: "1px solid #e2e0d8", background: "transparent",
            color: "#666", fontSize: 13, cursor: "pointer",
          }}>{t.logout}</button>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "1.5rem" }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: "1.5rem" }}>
          <StatCard label={t.total} value={stats.total} accent="#185FA5" />
          <StatCard label={t.pending} value={stats.pending} accent="#EF9F27" />
          <StatCard label={t.inProgress} value={stats.inProgress} accent="#378ADD" />
          <StatCard label={t.resolved} value={stats.resolved} accent="#639922" />
        </div>

        {/* View tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", background: "#fff", borderRadius: 12, padding: 4, border: "1px solid #e2e0d8", width: "fit-content" }}>
          {[["tickets", "🎟️ Tickets"], ["charts", `📊 ${t.charts}`], ["feedback", `⭐ ${t.feedbackTitle}`]].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={{
              padding: "7px 18px", borderRadius: 9, border: "none",
              background: view === id ? "#185FA5" : "transparent",
              color: view === id ? "#fff" : "#555",
              fontWeight: view === id ? 600 : 400,
              fontSize: 13, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        {/* ── Tickets view ─────────────────────────────────────────────────── */}
        {view === "tickets" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: "1rem" }}>
              <input
                placeholder={t.searchPlaceholder} value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: "1 1 200px", minWidth: 160, padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13 }}
              />
              {[
                [filterStatus, setFilterStatus, t.allStatus, Object.keys(STATUS_LABELS)],
                [filterPriority, setFilterPriority, t.allPriority, ["High", "Medium", "Low"]],
                [filterLocation, setFilterLocation, t.allLocation, ["Room", "Pavilion", "Toilets"]],
              ].map(([val, setter, placeholder, opts], i) => (
                <select key={i} value={val} onChange={e => setter(e.target.value)} style={{
                  padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, background: "#fff",
                }}>
                  <option value="">{placeholder}</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
            </div>

            {/* Table */}
            {loading ? (
              <p style={{ color: "#888", textAlign: "center", padding: "3rem" }}>{t.loading}</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: "#888", textAlign: "center", padding: "3rem" }}>{t.noTickets}</p>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e0d8", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8f7f3" }}>
                        {[t.code, t.student, t.room, t.location, t.problem, t.priority, t.status, t.date, t.actions].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: isRTL ? "right" : "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #e8e6e0", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((tk, i) => (
                        <tr key={tk.id} style={{ borderBottom: "1px solid #f0ede6", background: i % 2 === 0 ? "#fff" : "#fdfcfa" }}>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#185FA5", fontWeight: 600, whiteSpace: "nowrap" }}>{tk.tracking_code}</td>
                          <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{tk.nom}</td>
                          <td style={{ padding: "10px 14px", color: "#555" }}>{tk.chambre} {tk.pavillon && `/ ${tk.pavillon}`}</td>
                          <td style={{ padding: "10px 14px", color: "#555" }}>{tk.location}</td>
                          <td style={{ padding: "10px 14px", color: "#555" }}>{tk.problem_type}</td>
                          <td style={{ padding: "10px 14px" }}>{priorityBadge(tk.priorite)}</td>
                          <td style={{ padding: "10px 14px" }}>{statusBadge(tk.statut)}</td>
                          <td style={{ padding: "10px 14px", color: "#888", whiteSpace: "nowrap" }}>
                            {new Date(tk.created_at).toLocaleDateString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-GB")}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <button
                              onClick={() => updateStatus(tk)}
                              disabled={updatingId === tk.id}
                              style={{
                                padding: "5px 12px", borderRadius: 8,
                                border: "1px solid #ddd", background: "#fff",
                                fontSize: 12, cursor: "pointer",
                                opacity: updatingId === tk.id ? 0.5 : 1,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {updatingId === tk.id ? "…" : `→ ${t.updateStatus}`}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ margin: 0, padding: "8px 14px", fontSize: 12, color: "#999", borderTop: "1px solid #f0ede6" }}>
                  {filtered.length} / {tickets.length} tickets
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Charts view ───────────────────────────────────────────────────── */}
        {view === "charts" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {[
              { label: t.byCategory, data: catData },
              { label: t.byLocation, data: locData },
            ].map(({ label, data }) => (
              <div key={label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e0d8", padding: "1.25rem" }}>
                <p style={{ margin: "0 0 1rem", fontWeight: 600, fontSize: 14 }}>{label}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#185FA5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}

            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e0d8", padding: "1.25rem" }}>
              <p style={{ margin: "0 0 1rem", fontWeight: 600, fontSize: 14 }}>{t.byPriority}</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={priData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                    {priData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Feedback view ─────────────────────────────────────────────────── */}
        {view === "feedback" && (
          <div>
            {feedback.length === 0 ? (
              <p style={{ color: "#888", textAlign: "center", padding: "3rem" }}>{t.noFeedback}</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {feedback.map(fb => {
                  const relatedTicket = tickets.find(t => t.id === fb.ticket_id);
                  return (
                    <div key={fb.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e0d8", padding: "1.1rem 1.3rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{fb.nom}</p>
                          {relatedTicket && (
                            <p style={{ margin: 0, fontSize: 11, color: "#185FA5", fontFamily: "monospace" }}>{relatedTicket.tracking_code}</p>
                          )}
                        </div>
                        <Stars rating={fb.rating} />
                      </div>
                      {fb.note && (
                        <p style={{ margin: 0, fontSize: 13, color: "#555", fontStyle: "italic" }}>"{fb.note}"</p>
                      )}
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "#aaa" }}>
                        {new Date(fb.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function ChefDashboard() {
  const [lang, setLang] = useState("fr");
  const [chef, setChef] = useState(null);

  if (!chef) {
    return <LoginScreen lang={lang} setLang={setLang} onLogin={setChef} />;
  }
  return <Dashboard chef={chef} lang={lang} setLang={setLang} onLogout={() => setChef(null)} />;
}
