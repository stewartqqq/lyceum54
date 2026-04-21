import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, getStoredUser, logout as clearSession } from "./api";
import { formatLongDate, formatShortDate, isThisWeek, localDateKey } from "./date";
import { makeTranslator, type Lang, type TranslationKey } from "./i18n";
import type { Announcement, AppNotification, ApplicationType, EventApplication, EventReport, SchoolEvent, User } from "./types";

type Tab = "home" | "announcements" | "events" | "calendar" | "reports" | "applications" | "profile" | "assistant";
type Detail = { type: "event"; item: SchoolEvent } | { type: "announcement"; item: Announcement } | { type: "report"; item: EventReport } | null;
type T = ReturnType<typeof makeTranslator>;
type ChatMessage = { id: string; role: "user" | "assistant"; text: string; mode?: string };
type Theme = "dark" | "light";

const LANG_KEY = "lyceum-life-lang";
const THEME_KEY = "lyceum-life-theme";

const navItems: Array<{ id: Tab; label: TranslationKey; mark: string }> = [
  { id: "home",          label: "home",          mark: "01" },
  { id: "announcements", label: "announcements", mark: "02" },
  { id: "events",        label: "events",        mark: "03" },
  { id: "calendar",      label: "calendar",      mark: "04" },
  { id: "reports",       label: "reports",       mark: "05" },
  { id: "applications",  label: "applications",  mark: "06" },
  { id: "profile",       label: "profile",       mark: "07" },
  { id: "assistant",     label: "assistant",     mark: "AI" },
];

const categoryKeys: Record<string, TranslationKey> = {
  science: "science", sports: "sports", culture: "culture", community: "community",
  "school-wide": "schoolWide", "class-specific": "classSpecific", opportunity: "opportunity",
};

export default function App() {
  const [lang, setLang]               = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "ru");
  const [theme, setTheme]             = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || "dark");
  const [user, setUser]               = useState<User | null>(() => getStoredUser());
  const [tab, setTab]                 = useState<Tab>("home");
  const [detail, setDetail]           = useState<Detail>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents]           = useState<SchoolEvent[]>([]);
  const [reports, setReports]         = useState<EventReport[]>([]);
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading]         = useState(true);
  const t = makeTranslator(lang);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === "ru" ? "ru" : "kk";
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    Promise.all([api.announcements(), api.events(), api.reports(), api.applications(), api.notifications()])
      .then(([a, e, r, app, n]) => {
        if (!alive) return;
        setAnnouncements(a.announcements);
        setEvents(e.events);
        setReports(r.reports);
        setApplications(app.applications);
        setNotifications(n.notifications);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user]);

  function openTab(next: Tab) { setTab(next); setDetail(null); }
  function logout() { clearSession(); setUser(null); setDetail(null); setTab("home"); }
  function addApplication(application: EventApplication) {
    const enriched = {
      ...application,
      event: application.event ?? events.find(event => event.id === application.eventId),
    };
    setApplications(previous => [
      enriched,
      ...previous.filter(item => item.id !== enriched.id && !(item.eventId === enriched.eventId && item.applicationType === enriched.applicationType)),
    ]);
  }

  if (!user) return <LoginScreen lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onLogin={setUser} />;

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="sidebar">
        <button className="brand-button" onClick={() => openTab("home")}>
          <span className="brand-mark">LL</span>
          <span className="brand-text">
            <strong>Lyceum Life</strong>
            <small>v2.0 · SYSTEM</small>
          </span>
        </button>

        <span className="side-nav-label">Navigation</span>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(item => (
            <button
              key={item.id}
              className={tab === item.id && !detail ? "active" : ""}
              onClick={() => openTab(item.id)}
            >
              <span>{item.mark}</span>
              <em>{t(item.label)}</em>
            </button>
          ))}
        </nav>

        <div className="sidebar-profile">
          <button className="profile-chip" onClick={() => openTab("profile")}>
            <span>{initials(user.fullName)}</span>
            <div>
              <strong>{user.fullName}</strong>
              <small>{t("classLabel")} {user.className}</small>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="main-area">
        <header className="page-header">
          <div className="page-header-left">
            <button className="icon-button" onClick={() => setSidebarCollapsed(v => !v)} aria-label="Toggle sidebar">
              {sidebarCollapsed ? "▶" : "◀"}
            </button>
            <PageTitle
              eyebrow={`${t("classLabel")} ${user.className}`}
              title={detail ? detailTitle(detail, lang) : titleFor(tab, t)}
            />
          </div>
          <div className="header-actions">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <LanguageSwitcher lang={lang} setLang={setLang} />
            {unread > 0 && (
              <button className="quiet-badge" onClick={() => openTab("profile")}>
                <strong>{unread}</strong>
                <span>NEW</span>
              </button>
            )}
            <button className="secondary-button header-helper" onClick={() => openTab("assistant")}>
              ⟡ {t("assistant")}
            </button>
          </div>
        </header>

        <div className="mobile-nav">
          {navItems.map(item => (
            <button key={item.id} className={tab === item.id && !detail ? "active" : ""} onClick={() => openTab(item.id)}>
              {t(item.label)}
            </button>
          ))}
        </div>

        {loading && <Loading t={t} />}

        {!loading && detail && (
          <DetailView detail={detail} onBack={() => setDetail(null)} user={user} lang={lang} t={t} onApplicationCreated={addApplication} />
        )}

        {!loading && !detail && (
          <>
            {tab === "home" && <Home user={user} announcements={announcements} events={events} reports={reports} applications={applications} notifications={notifications} onTab={openTab} onDetail={setDetail} lang={lang} t={t} />}
            {tab === "announcements" && <Announcements announcements={announcements} onOpen={item => setDetail({ type: "announcement", item })} lang={lang} t={t} />}
            {tab === "events" && <Events user={user} events={events} onOpen={item => setDetail({ type: "event", item })} lang={lang} t={t} />}
            {tab === "calendar" && <Calendar events={events} onOpen={item => setDetail({ type: "event", item })} lang={lang} t={t} />}
            {tab === "reports" && <Reports reports={reports} onOpen={item => setDetail({ type: "report", item })} lang={lang} t={t} />}
            {tab === "applications" && <Applications user={user} applications={applications} lang={lang} t={t} onOpen={item => item.event ? setDetail({ type: "event", item: item.event }) : null} />}
            {tab === "profile" && <Profile user={user} applications={applications} notifications={notifications} t={t} lang={lang} onLogout={logout} />}
            {tab === "assistant" && <Assistant user={user} lang={lang} announcements={announcements} events={events} reports={reports} applications={applications} notifications={notifications} t={t} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Login                                                          */
/* ─────────────────────────────────────────────────────────────── */
function LoginScreen({
  lang, setLang, theme, setTheme, onLogin,
}: {
  lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; onLogin: (u: User) => void;
}) {
  const [mode, setMode]           = useState<"login" | "register">("login");
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]       = useState("mira@school.test");
  const [password, setPassword] = useState("Password123");
  const [className, setClassName] = useState("11A");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const t = makeTranslator(lang);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (mode === "register") {
        const normalizedClass = normalizeClassName(className);
        if (!fullName.trim()) throw new Error("Укажи имя и фамилию ученика.");
        if (!email.includes("@")) throw new Error("Укажи корректную почту.");
        if (password.length < 8) throw new Error("Пароль должен быть не короче 8 символов.");
        if (!normalizedClass) throw new Error("Класс должен выглядеть как 7A, 8B, 10A или 11A.");
        onLogin((await api.register({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          className: normalizedClass,
        })).user);
      } else {
        onLogin((await api.login(email, password)).user);
      }
    }
    catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setLoading(false); }
  }

  return (
    <main className="login-layout">
      <section className="login-showcase">
        <div className="login-showcase-inner">
          <div className="hero-logo">LL</div>
          <p className="eyebrow">{t("brandSubtitle")}</p>
          <h1>
            Lyceum<span>Life</span>
          </h1>
          <p>{t("loginSubtitle")}</p>
          <div className="showcase-grid">
            <MiniMetric value="24" label="EVENTS" />
            <MiniMetric value="8A"  label="CLASS" />
            <MiniMetric value="AI"  label="ASSIST" />
          </div>
        </div>
      </section>

      <form className="login-panel" onSubmit={submit}>
        <div className="login-panel-head">
          <div>
            <p className="eyebrow">LYCEUM LIFE</p>
            <h2>{mode === "register" ? "Регистрация ученика" : t("openApp")}</h2>
          </div>
          <div className="login-controls">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <LanguageSwitcher lang={lang} setLang={setLang} />
          </div>
        </div>
        <div className="auth-mode-switch">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Вход</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Регистрация</button>
        </div>
        {mode === "register" && (
          <label>
            ФИО ученика
            <input value={fullName} onChange={e => setFullName(e.target.value)} required={mode === "register"} autoComplete="name" placeholder="Например, Алексей Иванов" />
          </label>
        )}
        <label>
          {t("schoolEmail")}
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          {t("password")}
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} />
        </label>
        {mode === "register" && (
          <label>
            Класс
            <input value={className} onChange={e => setClassName(e.target.value)} placeholder="11A или 11а" />
            <span className="field-hint">Класс сохраняется в профиле и влияет на доступность зрительских мест.</span>
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <button className="primary-button full" type="submit" disabled={loading}>
          {loading ? t("opening") : mode === "register" ? "Создать аккаунт →" : `${t("openApp")} →`}
        </button>
        <small style={{ color: "var(--faint)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{t("demo")}</small>
      </form>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Home                                                           */
/* ─────────────────────────────────────────────────────────────── */
function Home({
  user, announcements, events, reports, applications, notifications, onTab, onDetail, lang, t,
}: {
  user: User; announcements: Announcement[]; events: SchoolEvent[]; reports: EventReport[];
  applications: EventApplication[]; notifications: AppNotification[];
  onTab: (t: Tab) => void; onDetail: (d: Detail) => void; lang: Lang; t: T;
}) {
  const weekEvents  = events.filter(e => isThisWeek(e.date));
  const recommended = events.filter(e => canSpectate(e, user.className) && e.status === "upcoming").slice(0, 3);
  const featured    = recommended[0] ?? events[0];
  const urgent      = announcements.find(a => a.priority === "important") ?? announcements[0];

  return (
    <section className="home-layout">
      <div className="home-main">
        {/* Hero */}
        <section className="command-hero">
          <div className="command-copy">
            <p className="eyebrow">{t("thisWeekAtSchool")}</p>
            <h2>{t("greeting")}, {firstName(user.fullName)}</h2>
            <p>{t("homeSubtitle")}</p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onTab("events")}>{t("allEvents")} →</button>
            <button className="glass-button"   onClick={() => onTab("calendar")}>{t("calendar")}</button>
          </div>
        </section>

        {/* Stat strip — horizontal scrollable on mobile */}
        <div className="metric-grid">
          <MetricCard value={String(weekEvents.length)}                            label={t("thisWeek")}       tone="blue"  />
          <MetricCard value={String(recommended.length)}                           label={t("availableToMe")}  tone="green" />
          <MetricCard value={String(applications.length)}                          label={t("myApplications")} tone="amber" />
          <MetricCard value={String(notifications.filter(n => !n.isRead).length)} label={t("notifications")}  tone="rose"  />
        </div>

        {/* Featured */}
        {featured && (
          <section className="feature-band clickable" onClick={() => onDetail({ type: "event", item: featured })}>
            {featured.coverImage ? <img src={featured.coverImage} alt="" /> : <div className="image-placeholder" />}
            <div>
              <Badge label={t("recommendedEvents")} tone="good" />
              <h3>{eventTitle(featured, lang)}</h3>
              <p>{eventShort(featured, lang)}</p>
              <AccessMini event={featured} spectatorAllowed={canSpectate(featured, user.className)} t={t} />
            </div>
          </section>
        )}

        {/* Announcements */}
        <SectionTitle title={t("latestAnnouncements")} action={t("allAnnouncements")} onAction={() => onTab("announcements")} />
        <div className="content-grid two">
          {announcements.slice(0, 2).map((a, i) => (
            <AnnouncementCard key={a.id} item={a} onOpen={() => onDetail({ type: "announcement", item: a })} lang={lang} t={t} delay={i * 50} />
          ))}
        </div>

        {/* Events */}
        <SectionTitle title={t("recommendedEvents")} action={t("allEvents")} onAction={() => onTab("events")} />
        <div className="content-grid three">
          {recommended.map((e, i) => (
            <EventCard key={e.id} event={e} user={user} onOpen={() => onDetail({ type: "event", item: e })} lang={lang} t={t} delay={i * 60} />
          ))}
        </div>

        {/* Reports */}
        <SectionTitle title={t("schoolSpirit")} action={t("reports")} onAction={() => onTab("reports")} />
        <div className="content-grid two">
          {reports.slice(0, 2).map((r, i) => (
            <ReportCard key={r.id} report={r} onOpen={() => onDetail({ type: "report", item: r })} lang={lang} t={t} delay={i * 50} />
          ))}
        </div>
      </div>

      {/* Rail */}
      <aside className="home-rail">
        <RailCard title="QUICK ACCESS">
          <div className="rail-actions">
            <button onClick={() => onTab("applications")}>{t("myApplications")}</button>
            <button onClick={() => onTab("calendar")}>{t("calendar")}</button>
            <button onClick={() => onTab("assistant")}>⟡ {t("assistant")}</button>
          </div>
        </RailCard>
        <MiniCalendar events={events} onOpen={item => onDetail({ type: "event", item })} onCalendar={() => onTab("calendar")} lang={lang} t={t} />
        {urgent && (
          <RailCard title="ALERT">
            <button className="rail-link" onClick={() => onDetail({ type: "announcement", item: urgent })}>
              <strong>{announcementTitle(urgent, lang)}</strong>
              <span>{announcementContent(urgent, lang)}</span>
            </button>
          </RailCard>
        )}
        <RailCard title="IDENTITY">
          <div className="profile-chip" style={{ cursor: "default" }}>
            <span>{initials(user.fullName)}</span>
            <div>
              <strong>{user.fullName}</strong>
              <small>{t("classLabel")} {user.className}</small>
            </div>
          </div>
        </RailCard>
      </aside>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Announcements                                                  */
/* ─────────────────────────────────────────────────────────────── */
function Announcements({ announcements, onOpen, lang, t }: { announcements: Announcement[]; onOpen: (a: Announcement) => void; lang: Lang; t: T }) {
  const [query, setQuery]   = useState("");
  const [filter, setFilter] = useState("all");
  const visible = announcements.filter(a => {
    const text = `${announcementTitle(a, lang)} ${announcementContent(a, lang)}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "all" || (filter === "important" ? a.priority === "important" : a.category === filter));
  });
  return (
    <section className="section-stack">
      <Toolbar>
        <Search value={query} onChange={setQuery} placeholder={t("searchAnnouncements")} />
        <FilterRow active={filter} onChange={setFilter} items={[
          { value: "all", label: t("all") }, { value: "important", label: t("important") },
          { value: "school-wide", label: t("schoolWide") }, { value: "class-specific", label: t("classSpecific") },
          { value: "opportunity", label: t("opportunity") },
        ]} />
      </Toolbar>
      <div className="content-grid two">
        {visible.map((a, i) => <AnnouncementCard key={a.id} item={a} onOpen={() => onOpen(a)} lang={lang} t={t} delay={i * 40} />)}
      </div>
      {!visible.length && <Empty title={t("noAnnouncements")} text={t("tryAnother")} />}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Events                                                         */
/* ─────────────────────────────────────────────────────────────── */
function Events({ user, events, onOpen, lang, t }: { user: User; events: SchoolEvent[]; onOpen: (e: SchoolEvent) => void; lang: Lang; t: T }) {
  const [query, setQuery]   = useState("");
  const [filter, setFilter] = useState("all");
  const visible = events.filter(e => {
    const text = `${eventTitle(e, lang)} ${eventShort(e, lang)} ${eventLocation(e, lang)}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "all" || (filter === "available" ? canSpectate(e, user.className) : e.category === filter));
  });
  return (
    <section className="section-stack">
      <Toolbar>
        <Search value={query} onChange={setQuery} placeholder={t("searchEvents")} />
        <FilterRow active={filter} onChange={setFilter} items={[
          { value: "all", label: t("all") }, { value: "available", label: t("availableToMe") },
          { value: "science", label: t("science") }, { value: "sports", label: t("sports") },
          { value: "culture", label: t("culture") }, { value: "community", label: t("community") },
        ]} />
      </Toolbar>
      <div className="content-grid three">
        {visible.map((e, i) => <EventCard key={e.id} event={e} user={user} onOpen={() => onOpen(e)} lang={lang} t={t} delay={i * 40} />)}
      </div>
      {!visible.length && <Empty title={t("noEvents")} text={t("tryAnother")} />}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Calendar                                                       */
/* ─────────────────────────────────────────────────────────────── */
function Calendar({ events, onOpen, lang, t }: { events: SchoolEvent[]; onOpen: (e: SchoolEvent) => void; lang: Lang; t: T }) {
  const [selected, setSelected] = useState(events[0]?.date ?? localDateKey(new Date()));
  const days = useMemo(() => {
    const base  = new Date();
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const total = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return Array.from({ length: total }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1));
  }, []);
  const selectedEvents = events.filter(e => e.date === selected);

  return (
    <section className="calendar-layout">
      <div className="calendar-board">
        <div className="panel-heading">
          <p className="eyebrow">{t("month")}</p>
          <h3>{new Intl.DateTimeFormat(locale(lang), { month: "long", year: "numeric" }).format(new Date())}</h3>
        </div>
        <div className="calendar-grid">
          {days.map(day => {
            const iso = localDateKey(day);
            const cnt = events.filter(e => e.date === iso).length;
            return (
              <button className={`calendar-day${selected === iso ? " active" : ""}`} key={iso} onClick={() => setSelected(iso)}>
                <strong>{day.getDate()}</strong>
                {cnt > 0 && <span>{cnt}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <aside className="agenda-panel">
        <SectionTitle title={formatLongDate(selected, locale(lang))} />
        <div className="agenda-list" style={{ marginTop: 12 }}>
          {selectedEvents.map(e => <EventRow key={e.id} event={e} onOpen={() => onOpen(e)} lang={lang} t={t} />)}
        </div>
        {!selectedEvents.length && <Empty title={t("noEventsDate")} text={t("tryAnother")} />}
      </aside>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Reports                                                        */
/* ─────────────────────────────────────────────────────────────── */
function MiniCalendar({
  events, onOpen, onCalendar, lang, t,
}: {
  events: SchoolEvent[]; onOpen: (e: SchoolEvent) => void; onCalendar: () => void; lang: Lang; t: T;
}) {
  const today = localDateKey(new Date());
  const days = useMemo(() => {
    const base = new Date();
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const total = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return Array.from({ length: total }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1));
  }, []);
  const upcoming = events
    .filter(e => e.status === "upcoming" && e.date >= today)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .slice(0, 3);

  return (
    <RailCard title={t("calendar")}>
      <div className="mini-calendar">
        <button className="mini-calendar-head" onClick={onCalendar} type="button">
          <strong>{new Intl.DateTimeFormat(locale(lang), { month: "long" }).format(new Date())}</strong>
          <span>{t("allEvents")}</span>
        </button>
        <div className="mini-calendar-grid">
          {days.map(day => {
            const iso = localDateKey(day);
            const dayEvents = events.filter(e => e.date === iso);
            return (
              <button
                key={iso}
                className={`mini-calendar-day${iso === today ? " today" : ""}${dayEvents.length ? " has-event" : ""}`}
                onClick={() => dayEvents[0] ? onOpen(dayEvents[0]) : onCalendar()}
                type="button"
              >
                {day.getDate()}
                {dayEvents.length > 0 && <span />}
              </button>
            );
          })}
        </div>
        <div className="mini-event-list">
          {upcoming.map(event => (
            <button key={event.id} className="mini-event" onClick={() => onOpen(event)} type="button">
              <span>{formatShortDate(event.date, locale(lang))}</span>
              <strong>{eventTitle(event, lang)}</strong>
            </button>
          ))}
          {!upcoming.length && <p>{t("noEventsDate")}</p>}
        </div>
      </div>
    </RailCard>
  );
}

function Reports({ reports, onOpen, lang, t }: { reports: EventReport[]; onOpen: (r: EventReport) => void; lang: Lang; t: T }) {
  const [query, setQuery] = useState("");
  const visible = reports.filter(r =>
    `${reportTitle(r, lang)} ${reportSummary(r, lang)}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <section className="section-stack">
      <Toolbar><Search value={query} onChange={setQuery} placeholder={t("searchReports")} /></Toolbar>
      <div className="content-grid two">
        {visible.map((r, i) => <ReportCard key={r.id} report={r} onOpen={() => onOpen(r)} lang={lang} t={t} delay={i * 40} />)}
      </div>
      {!visible.length && <Empty title={t("noReports")} text={t("tryAnother")} />}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Applications                                                   */
/* ─────────────────────────────────────────────────────────────── */
function Applications({ user, applications, lang, t, onOpen }: { user: User; applications: EventApplication[]; lang: Lang; t: T; onOpen: (a: EventApplication) => void }) {
  const [filter, setFilter] = useState("all");
  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    approved: applications.filter(a => a.status === "approved").length,
    waitlisted: applications.filter(a => a.status === "waitlisted").length,
  };
  const visible = applications.filter(a => filter === "all" || a.status === filter);

  return (
    <section className="applications-page">
      <section className="applications-hero">
        <div>
          <p className="eyebrow">{t("myApplications")}</p>
          <h2>{t("applicationsPageTitle")}</h2>
          <p>{t("applicationsPageSubtitle")}</p>
        </div>
        <div className="application-stats">
          <MetricCard value={String(counts.all)}        label={t("all")}        tone="blue"  />
          <MetricCard value={String(counts.approved)}   label={t("approved")}   tone="green" />
          <MetricCard value={String(counts.pending)}    label={t("pending")}    tone="amber" />
          <MetricCard value={String(counts.waitlisted)} label={t("waitlisted")} tone="rose"  />
        </div>
      </section>
      <Toolbar>
        <FilterRow active={filter} onChange={setFilter} items={[
          { value: "all", label: t("all") }, { value: "pending", label: t("pending") },
          { value: "approved", label: t("approved") }, { value: "waitlisted", label: t("waitlisted") },
          { value: "rejected", label: t("rejected") },
        ]} />
      </Toolbar>
      <div className="application-list">
        {visible.map((a, i) => (
          <article
            className="application-card clickable"
            key={a.id}
            onClick={() => onOpen(a)}
            style={{ animationDelay: `${i * 40}ms`, animation: "fadeUp .4s cubic-bezier(.16,1,.3,1) both" }}
          >
            {a.event?.coverImage ? <img src={a.event.coverImage} alt="" /> : <div className="image-placeholder" />}
            <div className="application-body">
              <div className="card-topline">
                <Badge label={statusLabel(a.status, t)} tone={a.status === "approved" ? "good" : a.status === "rejected" ? "hot" : "info"} />
                <small>{formatShortDate(a.createdAt, locale(lang))}</small>
              </div>
              <h3>{a.event ? eventTitle(a.event, lang) : `Event #${a.eventId}`}</h3>
              <p>{typeLabel(a.applicationType, t)}{a.event ? ` · ${formatShortDate(a.event.date, locale(lang))} · ${eventLocation(a.event, lang)}` : ` · ${t("openDetails")}`}</p>
              {a.event && <AccessMini event={a.event} spectatorAllowed={canSpectate(a.event, user.className)} t={t} />}
            </div>
          </article>
        ))}
      </div>
      {!visible.length && <Empty title={t("noApplications")} text={t("tryAnother")} />}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Profile                                                        */
/* ─────────────────────────────────────────────────────────────── */
function Profile({ user, applications, notifications, t, lang, onLogout }: {
  user: User; applications: EventApplication[]; notifications: AppNotification[]; t: T; lang: Lang; onLogout: () => void;
}) {
  return (
    <section className="profile-layout">
      <div className="profile-card-large">
        <div className="avatar-xl">{initials(user.fullName)}</div>
        <p className="eyebrow">{t("profile")}</p>
        <h3>{user.fullName}</h3>
        <p>{t("classLabel")} {user.className} · {user.email}</p>
        <button className="secondary-button" onClick={onLogout}>{t("logout")}</button>
      </div>
      <div className="profile-columns">
        <section>
          <SectionTitle title={t("myApplications")} />
          <div className="list-stack" style={{ marginTop: 10 }}>
            {applications.map(a => (
              <article className="list-card" key={a.id}>
                <Badge label={statusLabel(a.status, t)} tone={a.status === "approved" ? "good" : a.status === "rejected" ? "hot" : "info"} />
                <div>
                  <h4>{a.event ? eventTitle(a.event, lang) : `Event #${a.eventId}`}</h4>
                  <p>{typeLabel(a.applicationType, t)} · {formatShortDate(a.createdAt, locale(lang))}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle title={t("notifications")} />
          <div className="list-stack" style={{ marginTop: 10 }}>
            {notifications.map(n => (
              <article className="list-card" key={n.id}>
                <Badge label={n.isRead ? t("read") : t("new")} tone={n.isRead ? "neutral" : "info"} />
                <div>
                  <h4>{notificationTitle(n, lang)}</h4>
                  <p>{notificationMessage(n, lang)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="achievement-panel">
          <SectionTitle title={t("achievementBadges")} />
          <div className="chip-cloud">
            <span>{t("stemExplorer")}</span>
            <span>{t("schoolSpiritBadge")}</span>
            <span>{t("ecoHelper")}</span>
          </div>
        </section>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Assistant                                                      */
/* ─────────────────────────────────────────────────────────────── */
function Assistant({ user, lang, announcements, events, reports, applications, notifications, t }: {
  user: User; lang: Lang; announcements: Announcement[]; events: SchoolEvent[];
  reports: EventReport[]; applications: EventApplication[]; notifications: AppNotification[]; t: T;
}) {
  const quickPrompts = [t("promptEventsForClass"), t("promptDeadlines"), t("promptSummarizeAnnouncements"), t("promptReports")];
  const [prompt, setPrompt]       = useState("");
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const listRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  async function ask(p = prompt) {
    const clean = p.trim(); if (!clean) return;
    setMessages(m => [...m, { id: crypto.randomUUID(), role: "user", text: clean }]);
    setPrompt(""); setLoading(true);
    try {
      const res = await api.assistant(clean, { user, language: lang, announcements, events, reports, applications, notifications });
      setMessages(m => [...m, { id: crypto.randomUUID(), role: "assistant", text: res.response.answer, mode: res.response.mode }]);
      setSuggestions(res.response.suggestions ?? []);
    } finally { setLoading(false); }
  }

  return (
    <section className="assistant-chat-page">
      <div className="ai-chat-panel full">
        <div className="ai-chat-head">
          <div>
            <strong>⟡ Lyceum AI</strong>
            <span>Gemini · {t("futureApi")}</span>
          </div>
          <Badge label={loading ? t("thinking") : "ONLINE"} tone={loading ? "info" : "good"} />
        </div>

        <div className="ai-message-list" ref={listRef}>
          {!messages.length ? (
            <div className="ai-empty-state">
              <p className="eyebrow">GEMINI · AI ASSISTANT</p>
              <h2>{t("readyWhenYouAre")} <span>⟡</span></h2>
              <p>{t("assistantText")}</p>
              <div className="quick-prompts">
                {quickPrompts.map(p => <button key={p} onClick={() => ask(p)} type="button">{p}</button>)}
              </div>
            </div>
          ) : messages.map(m => (
            <article className={`ai-message ${m.role}`} key={m.id}>
              <small>{m.role === "user" ? firstName(user.fullName) : "⟡ AI"}{m.mode ? ` · ${m.mode}` : ""}</small>
              <p>{m.text}</p>
            </article>
          ))}
          {loading && (
            <article className="ai-message assistant loading-bubble">
              <small>⟡ AI</small>
              <p>{t("thinking")}</p>
            </article>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="quick-prompts compact">
            {suggestions.map(s => <button key={s} onClick={() => ask(s)} type="button">{s}</button>)}
          </div>
        )}

        <div className="ai-input-bar">
          <div className="chat-input-shell">
            <button className="chat-tool" type="button" onClick={() => setPrompt(t("assistantPlaceholder"))}>+</button>
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder={t("askAnything")}
            />
            <button className="chat-tool text" type="button">mic</button>
            <button className="chat-send" onClick={() => ask()} disabled={loading} type="button">↑</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Detail views                                                   */
/* ─────────────────────────────────────────────────────────────── */
function DetailView({
  detail, onBack, user, lang, t, onApplicationCreated,
}: {
  detail: Detail; onBack: () => void; user: User; lang: Lang; t: T; onApplicationCreated: (application: EventApplication) => void;
}) {
  if (!detail) return null;
  if (detail.type === "announcement") {
    const { item } = detail;
    return (
      <section className="detail-layout">
        <button className="secondary-button" onClick={onBack}>← {t("back")}</button>
        <article className="detail-card">
          {item.imageUrl && <img src={item.imageUrl} alt="" />}
          <div className="detail-head">
            <Badge label={categoryLabel(item.category, t)} tone={item.priority === "important" ? "hot" : "info"} />
            <span>{formatLongDate(item.createdAt, locale(lang))}</span>
          </div>
          <h3>{announcementTitle(item, lang)}</h3>
          <p>{announcementContent(item, lang)}</p>
        </article>
      </section>
    );
  }
  if (detail.type === "report") {
    const { item } = detail;
    return (
      <section className="detail-layout">
        <button className="secondary-button" onClick={onBack}>← {t("back")}</button>
        <article className="detail-card">
          {item.gallery[0] && <img src={item.gallery[0]} alt="" />}
          <h3>{reportTitle(item, lang)}</h3>
          <p>{reportSummary(item, lang)}</p>
          <div style={{ display: "grid", gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--neon)", fontFamily: "var(--font-mono)", letterSpacing: ".05em", textTransform: "uppercase" }}>
              {t("results")}
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{reportResults(item, lang).map(r => <li key={r}>{r}</li>)}</ul>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--neon)", fontFamily: "var(--font-mono)", letterSpacing: ".05em", textTransform: "uppercase" }}>
              {t("highlights")}
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{reportHighlights(item, lang).map(h => <li key={h}>{h}</li>)}</ul>
          </div>
          {reportQuote(item, lang) && <blockquote>{reportQuote(item, lang)}</blockquote>}
        </article>
      </section>
    );
  }
  return <EventDetail event={detail.item} user={user} onBack={onBack} lang={lang} t={t} onApplicationCreated={onApplicationCreated} />;
}

function EventDetail({
  event, user, onBack, lang, t, onApplicationCreated,
}: {
  event: SchoolEvent; user: User; onBack: () => void; lang: Lang; t: T; onApplicationCreated: (application: EventApplication) => void;
}) {
  const initType: ApplicationType = canSpectate(event, user.className) ? "spectator" : "participant";
  const [type, setType]       = useState<ApplicationType>(initType);
  const [note, setNote]       = useState("");
  const [msg, setMsg]         = useState("");
  const [submitting, setSub]  = useState(false);
  const spectatorAllowed      = canSpectate(event, user.className);

  async function apply() {
    setMsg(""); setSub(true);
    try {
      const result = await api.apply(event.id, type, note);
      onApplicationCreated({ ...result.application, event: result.application.event ?? event });
      setMsg(t("applicationSubmitted"));
    }
    catch (err) { setMsg(err instanceof Error ? err.message : t("applicationFailed")); }
    finally { setSub(false); }
  }

  return (
    <section className="detail-layout">
      <button className="secondary-button" onClick={onBack}>← {t("back")}</button>
      <article className="detail-card">
        {event.coverImage && <img src={event.coverImage} alt="" />}
        <div className="detail-head">
          <Badge label={categoryLabel(event.category, t)} tone="info" />
          <Badge label={event.registrationOpen ? t("registrationOpen") : t("registrationClosed")} tone={event.registrationOpen ? "good" : "neutral"} />
        </div>
        <h3>{eventTitle(event, lang)}</h3>
        <p>{eventFull(event, lang)}</p>
        <AccessNotice event={event} user={user} t={t} />
        <div className="info-grid">
          <Info label={t("date")}         value={`${formatLongDate(event.date, locale(lang))}, ${event.startTime}–${event.endTime}`} />
          <Info label={t("location")}     value={eventLocation(event, lang)} />
          <Info label={t("organizer")}    value={eventOrganizer(event, lang)} />
          <Info label={t("participants")} value={`${event.participantApprovedCount}/${event.participantCapacity}`} />
          <Info label={t("spectators")}   value={`${event.spectatorApprovedCount}/${event.spectatorCapacity}`} />
          <Info label={t("deadline")}     value={formatShortDate(event.registrationDeadline, locale(lang))} />
        </div>
        <div className="apply-box">
          <h4>{t("applyToEvent")}</h4>
          <div className="segmented">
            <button className={type === "participant" ? "active" : ""} onClick={() => setType("participant")}>{t("participant")}</button>
            <button className={type === "spectator" ? "active" : ""} onClick={() => setType("spectator")} disabled={!spectatorAllowed}>{t("spectator")}</button>
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t("optionalNote")} />
          <button className="primary-button" onClick={apply} disabled={submitting || !event.registrationOpen}>
            {submitting ? t("submitting") : `${t("submitApplication")} →`}
          </button>
          {msg && <p className="form-message">{msg}</p>}
        </div>
      </article>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Card components                                                */
/* ─────────────────────────────────────────────────────────────── */
function AnnouncementCard({ item, onOpen, lang, t, delay = 0 }: { item: Announcement; onOpen: () => void; lang: Lang; t: T; delay?: number }) {
  return (
    <article
      className="card announcement-card clickable"
      onClick={onOpen}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="card-topline">
        <Badge label={item.priority === "important" ? t("important") : categoryLabel(item.category, t)} tone={item.priority === "important" ? "hot" : "info"} />
        <small>{formatShortDate(item.createdAt, locale(lang))}</small>
      </div>
      <h4>{announcementTitle(item, lang)}</h4>
      <p style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {announcementContent(item, lang)}
      </p>
      {item.targetClasses.length > 0 && <small>{item.targetClasses.join(", ")}</small>}
    </article>
  );
}

function EventCard({ event, user, onOpen, lang, t, delay = 0 }: { event: SchoolEvent; user?: User; onOpen: () => void; lang: Lang; t: T; delay?: number }) {
  const spectatorAllowed = user ? canSpectate(event, user.className) : event.viewerCanSpectate !== false;
  return (
    <article
      className={`card event-card clickable${spectatorAllowed ? "" : " restricted"}`}
      onClick={onOpen}
      style={{ animationDelay: `${delay}ms` }}
    >
      {event.coverImage ? <img src={event.coverImage} alt="" /> : <div className="image-placeholder" />}
      <div className="card-topline">
        <Badge label={categoryLabel(event.category, t)} tone="info" />
        <Badge label={event.registrationOpen ? t("registrationOpen") : t("registrationClosed")} tone={event.registrationOpen ? "good" : "neutral"} />
      </div>
      <h4>{eventTitle(event, lang)}</h4>
      <p style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {eventShort(event, lang)}
      </p>
      <div className="card-meta">
        <span>{formatShortDate(event.date, locale(lang))}</span>
        <span>{eventLocation(event, lang)}</span>
      </div>
      <AccessMini event={event} spectatorAllowed={spectatorAllowed} t={t} />
    </article>
  );
}

function EventRow({ event, onOpen, lang, t }: { event: SchoolEvent; onOpen: () => void; lang: Lang; t: T }) {
  return (
    <button className="event-row" onClick={onOpen}>
      <span>{event.startTime}</span>
      <div>
        <strong>{eventTitle(event, lang)}</strong>
        <small>{formatShortDate(event.date, locale(lang))} · {eventLocation(event, lang)}</small>
      </div>
      <Badge label={categoryLabel(event.category, t)} tone="info" />
    </button>
  );
}

function ReportCard({ report, onOpen, lang, t, delay = 0 }: { report: EventReport; onOpen: () => void; lang: Lang; t: T; delay?: number }) {
  return (
    <article className="card report-card clickable" onClick={onOpen} style={{ animationDelay: `${delay}ms` }}>
      {report.gallery[0] && <img src={report.gallery[0]} alt="" />}
      <Badge label={t("reports")} tone="good" />
      <h4>{reportTitle(report, lang)}</h4>
      <p style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {reportSummary(report, lang)}
      </p>
      <small>{formatShortDate(report.publishedAt, locale(lang))}</small>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Small UI components                                            */
/* ─────────────────────────────────────────────────────────────── */
function AccessMini({ event, spectatorAllowed, t }: { event: SchoolEvent; spectatorAllowed: boolean; t: T }) {
  if (!event.allowedSpectatorClasses.length) return <div className="access-mini good">{t("allClassesAllowed")}</div>;
  if (spectatorAllowed) return <div className="access-mini good">{t("spectatorAvailable")}</div>;
  return <div className="access-mini locked">{t("spectatorRestricted")} · {event.allowedSpectatorClasses.join(", ")}</div>;
}

function AccessNotice({ event, user, t }: { event: SchoolEvent; user: User; t: T }) {
  const ok = canSpectate(event, user.className);
  if (!event.allowedSpectatorClasses.length) return <div className="access-notice good"><strong>{t("allClassesAllowed")}</strong><span>{t("participantStillAvailable")}</span></div>;
  if (ok) return <div className="access-notice good"><strong>{t("spectatorAvailable")}</strong><span>{t("allowedClasses")}: {event.allowedSpectatorClasses.join(", ")}</span></div>;
  return <div className="access-notice locked"><strong>{t("spectatorRestricted")}</strong><span>{t("allowedClasses")}: {event.allowedSpectatorClasses.join(", ")}</span><span>{t("participantStillAvailable")}</span></div>;
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
    </div>
  );
}

function ThemeSwitcher({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <div className="theme-switcher" aria-label="Theme">
      <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} type="button">Dark</button>
      <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} type="button">Light</button>
    </div>
  );
}

function LanguageSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="language-switcher" aria-label="Language">
      <button className={lang === "ru" ? "active" : ""} onClick={() => setLang("ru")} type="button">RU</button>
      <button className={lang === "kz" ? "active" : ""} onClick={() => setLang("kz")} type="button">KZ</button>
    </div>
  );
}

function Toolbar({ children }: { children: ReactNode }) { return <div className="toolbar">{children}</div>; }

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="section-title">
      <h3>{title}</h3>
      {action && onAction && <button className="link-button" onClick={onAction}>{action} →</button>}
    </div>
  );
}

function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input className="search" value={value} onChange={e => onChange(e.target.value)} placeholder={`/ ${placeholder}`} />;
}

function FilterRow({ items, active, onChange }: { items: Array<{ value: string; label: string }>; active: string; onChange: (v: string) => void }) {
  return (
    <div className="filter-row">
      {items.map(i => <button key={i.value} className={active === i.value ? "active" : ""} onClick={() => onChange(i.value)}>{i.label}</button>)}
    </div>
  );
}

function MetricCard({ value, label, tone }: { value: string; label: string; tone: "blue" | "green" | "amber" | "rose" }) {
  return <div className={`metric-card ${tone}`}><strong>{value}</strong><span>{label}</span></div>;
}

function MiniMetric({ value, label }: { value: string; label: string }) {
  return <div className="mini-metric"><strong>{value}</strong><span>{label}</span></div>;
}

function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rail-card"><h3>{title}</h3>{children}</section>;
}

function Badge({ label, tone }: { label: string; tone: "info" | "good" | "hot" | "neutral" }) {
  return <span className={`badge ${tone}`}>{label}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info"><span>{label}</span><strong>{value}</strong></div>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty"><h4>{title}</h4><p>{text}</p></div>;
}

function Loading({ t }: { t: T }) {
  return (
    <div className="empty" style={{ minHeight: 220, display: "grid", placeItems: "center", animation: "fadeIn .3s ease" }}>
      <div>
        <h4 style={{ color: "var(--neon)" }}>{t("loadingTitle")}</h4>
        <p>{t("loadingText")}</p>
      </div>
    </div>
  );
}

/* helpers */
function byLang(b: string, kz: string | undefined | null, l: Lang) { return l === "kz" && kz ? kz : b; }
function detailTitle(d: NonNullable<Detail>, l: Lang) {
  if (d.type === "announcement") return announcementTitle(d.item, l);
  if (d.type === "report")       return reportTitle(d.item, l);
  return eventTitle(d.item, l);
}
function announcementTitle(a: Announcement, l: Lang)   { return byLang(a.title, a.titleKz, l); }
function announcementContent(a: Announcement, l: Lang) { return byLang(a.content, a.contentKz, l); }
function eventTitle(e: SchoolEvent, l: Lang)           { return byLang(e.title, e.titleKz, l); }
function eventShort(e: SchoolEvent, l: Lang)           { return byLang(e.shortDescription, e.shortDescriptionKz, l); }
function eventFull(e: SchoolEvent, l: Lang)            { return byLang(e.fullDescription, e.fullDescriptionKz, l); }
function eventLocation(e: SchoolEvent, l: Lang)        { return byLang(e.location, e.locationKz, l); }
function eventOrganizer(e: SchoolEvent, l: Lang)       { return byLang(e.organizer, e.organizerKz, l); }
function reportTitle(r: EventReport, l: Lang)          { return byLang(r.title, r.titleKz, l); }
function reportSummary(r: EventReport, l: Lang)        { return byLang(r.summary, r.summaryKz, l); }
function reportResults(r: EventReport, l: Lang)        { return l === "kz" && r.resultsKz?.length ? r.resultsKz : r.results; }
function reportHighlights(r: EventReport, l: Lang)     { return l === "kz" && r.highlightsKz?.length ? r.highlightsKz : r.highlights; }
function reportQuote(r: EventReport, l: Lang)          { return byLang(r.quote ?? "", r.quoteKz, l); }
function notificationTitle(n: AppNotification, l: Lang)  { return byLang(n.title, n.titleKz, l); }
function notificationMessage(n: AppNotification, l: Lang){ return byLang(n.message, n.messageKz, l); }
function titleFor(tab: Tab, t: T) { return navItems.find(n => n.id === tab) ? t(navItems.find(n => n.id === tab)!.label) : "Lyceum Life"; }
function categoryLabel(c: string, t: T) { const k = categoryKeys[c]; return k ? t(k) : c; }
function statusLabel(s: EventApplication["status"], t: T) {
  const m: Record<EventApplication["status"], TranslationKey> = { pending: "pending", approved: "approved", rejected: "rejected", waitlisted: "waitlisted" };
  return t(m[s]);
}
function typeLabel(type: ApplicationType, t: T) { return type === "participant" ? t("participant") : t("spectator"); }
function normalizeClassName(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[аА]/g, "A")
    .replace(/[бБ]/g, "B")
    .replace(/[вВ]/g, "B")
    .replace(/[гГ]/g, "G")
    .replace(/[дД]/g, "D")
    .replace(/[сС]/g, "C")
    .replace(/[еЕ]/g, "E")
    .replace(/[нН]/g, "H")
    .replace(/[кК]/g, "K")
    .replace(/[мМ]/g, "M")
    .replace(/[оО]/g, "O")
    .replace(/[рР]/g, "P")
    .replace(/[тТ]/g, "T")
    .replace(/[хХ]/g, "X")
    .toUpperCase();
  return /^(?:[5-9]|1[0-1])[A-Z]$/.test(normalized) ? normalized : "";
}
function canSpectate(e: SchoolEvent, cls: string) {
  const normalizedClass = normalizeClassName(cls);
  if (!e.allowedSpectatorClasses.length) return true;
  return e.allowedSpectatorClasses.map(normalizeClassName).includes(normalizedClass);
}
function firstName(name: string) { return name.trim().split(/\s+/)[0] || name; }
function initials(name: string)  { return name.trim().split(/\s+/).slice(0,2).map(p => p[0]).join("").toUpperCase(); }
function locale(l: Lang)         { return l === "ru" ? "ru-RU" : "kk-KZ"; }
