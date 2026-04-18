import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { api, getStoredUser, logout as clearSession } from "./api";
import { formatLongDate, formatShortDate, isThisWeek, localDateKey } from "./date";
import { makeTranslator, type Lang, type TranslationKey } from "./i18n";
import type { Announcement, AppNotification, ApplicationType, EventApplication, EventReport, SchoolEvent, User } from "./types";

type Tab = "home" | "announcements" | "events" | "calendar" | "reports" | "applications" | "profile" | "assistant";
type Detail = { type: "event"; item: SchoolEvent } | { type: "announcement"; item: Announcement } | { type: "report"; item: EventReport } | null;
type T = ReturnType<typeof makeTranslator>;
type ChatMessage = { id: string; role: "user" | "assistant"; text: string; mode?: string };

const LANG_KEY = "lyceum-life-lang";

const navItems: Array<{ id: Tab; label: TranslationKey; mark: string }> = [
  { id: "home", label: "home", mark: "01" },
  { id: "announcements", label: "announcements", mark: "02" },
  { id: "events", label: "events", mark: "03" },
  { id: "calendar", label: "calendar", mark: "04" },
  { id: "reports", label: "reports", mark: "05" },
  { id: "applications", label: "applications", mark: "06" },
  { id: "profile", label: "profile", mark: "07" },
  { id: "assistant", label: "assistant", mark: "AI" }
];

const categoryKeys: Record<string, TranslationKey> = {
  science: "science",
  sports: "sports",
  culture: "culture",
  community: "community",
  "school-wide": "schoolWide",
  "class-specific": "classSpecific",
  opportunity: "opportunity"
};

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "ru");
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<Detail>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [reports, setReports] = useState<EventReport[]>([]);
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const t = makeTranslator(lang);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === "ru" ? "ru" : "kk";
  }, [lang]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    Promise.all([
      api.announcements(),
      api.events(),
      api.reports(),
      api.applications(),
      api.notifications()
    ]).then(([announcementRes, eventRes, reportRes, applicationRes, notificationRes]) => {
      if (!alive) return;
      setAnnouncements(announcementRes.announcements);
      setEvents(eventRes.events);
      setReports(reportRes.reports);
      setApplications(applicationRes.applications);
      setNotifications(notificationRes.notifications);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [user]);

  function openTab(next: Tab) {
    setTab(next);
    setDetail(null);
  }

  function logout() {
    clearSession();
    setUser(null);
    setDetail(null);
    setTab("home");
  }

  if (!user) {
    return <LoginScreen lang={lang} setLang={setLang} onLogin={setUser} />;
  }

  const unread = notifications.filter((item) => !item.isRead).length;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <button className="brand-button" onClick={() => openTab("home")} title="Lyceum Life">
          <span className="brand-mark">LL</span>
          <span className="brand-text">
            <strong>Lyceum Life</strong>
            <small>{t("brandSubtitle")}</small>
          </span>
        </button>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button className={tab === item.id && !detail ? "active" : ""} key={item.id} onClick={() => openTab(item.id)}>
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

      <main className="main-area">
        <header className="page-header">
          <div className="page-header-left">
            <button className="icon-button" onClick={() => setSidebarCollapsed((value) => !value)} title="Toggle sidebar">
              {sidebarCollapsed ? ">>" : "<<"}
            </button>
            <PageTitle
              eyebrow={`${t("classLabel")} ${user.className}`}
              title={detail ? detailTitle(detail, lang) : titleFor(tab, t)}
            />
          </div>
          <div className="header-actions">
            <LanguageSwitcher lang={lang} setLang={setLang} />
            <button className="quiet-badge" onClick={() => openTab("profile")}>
              <strong>{unread}</strong>
              <span>{t("new")}</span>
            </button>
            <button className="secondary-button header-helper" onClick={() => openTab("assistant")}>{t("assistant")}</button>
          </div>
        </header>

        <div className="mobile-nav">
          {navItems.slice(0, 6).map((item) => (
            <button className={tab === item.id && !detail ? "active" : ""} key={item.id} onClick={() => openTab(item.id)}>
              {t(item.label)}
            </button>
          ))}
        </div>

        {loading ? <Loading t={t} /> : null}

        {!loading && detail ? (
          <DetailView detail={detail} onBack={() => setDetail(null)} user={user} lang={lang} t={t} />
        ) : null}

        {!loading && !detail ? (
          <>
            {tab === "home" ? (
              <Home
                user={user}
                announcements={announcements}
                events={events}
                reports={reports}
                applications={applications}
                notifications={notifications}
                onTab={openTab}
                onDetail={setDetail}
                lang={lang}
                t={t}
              />
            ) : null}
            {tab === "announcements" ? <Announcements announcements={announcements} onOpen={(item) => setDetail({ type: "announcement", item })} lang={lang} t={t} /> : null}
            {tab === "events" ? <Events user={user} events={events} onOpen={(item) => setDetail({ type: "event", item })} lang={lang} t={t} /> : null}
            {tab === "calendar" ? <Calendar events={events} onOpen={(item) => setDetail({ type: "event", item })} lang={lang} t={t} /> : null}
            {tab === "reports" ? <Reports reports={reports} onOpen={(item) => setDetail({ type: "report", item })} lang={lang} t={t} /> : null}
            {tab === "applications" ? (
              <Applications
                applications={applications}
                lang={lang}
                t={t}
                onOpen={(item) => item.event ? setDetail({ type: "event", item: item.event }) : null}
              />
            ) : null}
            {tab === "profile" ? <Profile user={user} applications={applications} notifications={notifications} t={t} lang={lang} onLogout={logout} /> : null}
            {tab === "assistant" ? (
              <Assistant
                user={user}
                lang={lang}
                announcements={announcements}
                events={events}
                reports={reports}
                applications={applications}
                notifications={notifications}
                t={t}
              />
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

function LoginScreen({ lang, setLang, onLogin }: { lang: Lang; setLang: (lang: Lang) => void; onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("mira@school.test");
  const [password, setPassword] = useState("Password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = makeTranslator(lang);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api.login(email, password);
      onLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-showcase">
        <div className="login-showcase-inner">
          <div className="brand-mark hero-logo">LL</div>
          <p className="eyebrow">{t("brandSubtitle")}</p>
          <h1>{t("loginTitle")}</h1>
          <p>{t("loginSubtitle")}</p>
          <div className="showcase-grid">
            <MiniMetric value="24" label={t("events")} />
            <MiniMetric value="8A" label={t("classLabel")} />
            <MiniMetric value="AI" label={t("assistant")} />
          </div>
        </div>
      </section>

      <form className="login-panel" onSubmit={submit}>
        <div className="login-panel-head">
          <div>
            <p className="eyebrow">Lyceum Life</p>
            <h2>{t("openApp")}</h2>
          </div>
          <LanguageSwitcher lang={lang} setLang={setLang} />
        </div>
        <label>
          {t("schoolEmail")}
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          {t("password")}
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="primary-button full" type="submit" disabled={loading}>{loading ? t("opening") : t("openApp")}</button>
        <small>{t("demo")}</small>
      </form>
    </main>
  );
}

function Home({
  user,
  announcements,
  events,
  reports,
  applications,
  notifications,
  onTab,
  onDetail,
  lang,
  t
}: {
  user: User;
  announcements: Announcement[];
  events: SchoolEvent[];
  reports: EventReport[];
  applications: EventApplication[];
  notifications: AppNotification[];
  onTab: (tab: Tab) => void;
  onDetail: (detail: Detail) => void;
  lang: Lang;
  t: T;
}) {
  const weekEvents = events.filter((event) => isThisWeek(event.date));
  const recommended = events.filter((event) => canSpectate(event, user.className) && event.status === "upcoming").slice(0, 3);
  const featured = recommended[0] ?? events[0];
  const urgentAnnouncement = announcements.find((item) => item.priority === "important") ?? announcements[0];

  return (
    <section className="home-layout">
      <div className="home-main">
        <section className="command-hero">
          <div className="command-copy">
            <p className="eyebrow">{t("thisWeekAtSchool")}</p>
            <h2>{t("greeting")}, {firstName(user.fullName)}</h2>
            <p>{t("homeSubtitle")}</p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onTab("events")}>{t("allEvents")}</button>
            <button className="glass-button" onClick={() => onTab("calendar")}>{t("calendar")}</button>
          </div>
        </section>

        <section className="metric-grid">
          <MetricCard value={String(weekEvents.length)} label={t("thisWeek")} tone="blue" />
          <MetricCard value={String(recommended.length)} label={t("availableToMe")} tone="green" />
          <MetricCard value={String(applications.length)} label={t("myApplications")} tone="amber" />
          <MetricCard value={String(notifications.filter((item) => !item.isRead).length)} label={t("notifications")} tone="rose" />
        </section>

        {featured ? (
          <section className="feature-band clickable" onClick={() => onDetail({ type: "event", item: featured })}>
            {featured.coverImage ? <img src={featured.coverImage} alt="" /> : null}
            <div>
              <Badge label={t("recommendedEvents")} tone="info" />
              <h3>{eventTitle(featured, lang)}</h3>
              <p>{eventShort(featured, lang)}</p>
              <AccessMini event={featured} spectatorAllowed={canSpectate(featured, user.className)} t={t} />
            </div>
          </section>
        ) : null}

        <SectionTitle title={t("latestAnnouncements")} action={t("allAnnouncements")} onAction={() => onTab("announcements")} />
        <div className="content-grid two">
          {announcements.slice(0, 2).map((item) => <AnnouncementCard key={item.id} item={item} onOpen={() => onDetail({ type: "announcement", item })} lang={lang} t={t} />)}
        </div>

        <SectionTitle title={t("recommendedEvents")} action={t("allEvents")} onAction={() => onTab("events")} />
        <div className="content-grid three">
          {recommended.map((item) => <EventCard key={item.id} event={item} user={user} onOpen={() => onDetail({ type: "event", item })} lang={lang} t={t} />)}
        </div>

        <SectionTitle title={t("schoolSpirit")} action={t("reports")} onAction={() => onTab("reports")} />
        <div className="content-grid two">
          {reports.slice(0, 2).map((item) => <ReportCard key={item.id} report={item} onOpen={() => onDetail({ type: "report", item })} lang={lang} t={t} />)}
        </div>
      </div>

      <aside className="home-rail">
        <RailCard title={t("quickActions")}>
          <div className="rail-actions">
            <button onClick={() => onTab("applications")}>{t("myApplications")}</button>
            <button onClick={() => onTab("calendar")}>{t("calendar")}</button>
            <button onClick={() => onTab("assistant")}>{t("assistant")}</button>
          </div>
        </RailCard>
        {urgentAnnouncement ? (
          <RailCard title={t("important")}>
            <button className="rail-link" onClick={() => onDetail({ type: "announcement", item: urgentAnnouncement })}>
              <strong>{announcementTitle(urgentAnnouncement, lang)}</strong>
              <span>{announcementContent(urgentAnnouncement, lang)}</span>
            </button>
          </RailCard>
        ) : null}
        <RailCard title={t("profile")}>
          <div className="profile-chip">
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

function Announcements({ announcements, onOpen, lang, t }: { announcements: Announcement[]; onOpen: (item: Announcement) => void; lang: Lang; t: T }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = announcements.filter((item) => {
    const matchesQuery = `${announcementTitle(item, lang)} ${announcementContent(item, lang)}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "important" ? item.priority === "important" : item.category === filter);
    return matchesQuery && matchesFilter;
  });

  return (
    <section className="section-stack">
      <Toolbar>
        <Search value={query} onChange={setQuery} placeholder={t("searchAnnouncements")} />
        <FilterRow
          items={[
            { value: "all", label: t("all") },
            { value: "important", label: t("important") },
            { value: "school-wide", label: t("schoolWide") },
            { value: "class-specific", label: t("classSpecific") },
            { value: "opportunity", label: t("opportunity") }
          ]}
          active={filter}
          onChange={setFilter}
        />
      </Toolbar>
      <div className="content-grid two">
        {visible.map((item) => <AnnouncementCard key={item.id} item={item} onOpen={() => onOpen(item)} lang={lang} t={t} />)}
      </div>
      {!visible.length ? <Empty title={t("noAnnouncements")} text={t("tryAnother")} /> : null}
    </section>
  );
}

function Events({ user, events, onOpen, lang, t }: { user: User; events: SchoolEvent[]; onOpen: (item: SchoolEvent) => void; lang: Lang; t: T }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = events.filter((item) => {
    const matchesQuery = `${eventTitle(item, lang)} ${eventShort(item, lang)} ${eventLocation(item, lang)}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "available" ? canSpectate(item, user.className) : item.category === filter);
    return matchesQuery && matchesFilter;
  });

  return (
    <section className="section-stack">
      <Toolbar>
        <Search value={query} onChange={setQuery} placeholder={t("searchEvents")} />
        <FilterRow
          items={[
            { value: "all", label: t("all") },
            { value: "available", label: t("availableToMe") },
            { value: "science", label: t("science") },
            { value: "sports", label: t("sports") },
            { value: "culture", label: t("culture") },
            { value: "community", label: t("community") }
          ]}
          active={filter}
          onChange={setFilter}
        />
      </Toolbar>
      <div className="content-grid three">
        {visible.map((item) => <EventCard key={item.id} event={item} user={user} onOpen={() => onOpen(item)} lang={lang} t={t} />)}
      </div>
      {!visible.length ? <Empty title={t("noEvents")} text={t("tryAnother")} /> : null}
    </section>
  );
}

function Calendar({ events, onOpen, lang, t }: { events: SchoolEvent[]; onOpen: (item: SchoolEvent) => void; lang: Lang; t: T }) {
  const [selected, setSelected] = useState(events[0]?.date ?? localDateKey(new Date()));
  const days = useMemo(() => {
    const base = new Date();
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const total = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return Array.from({ length: total }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1));
  }, []);
  const selectedEvents = events.filter((event) => event.date === selected);

  return (
    <section className="calendar-layout">
      <div className="calendar-board">
        <div className="panel-heading">
          <p className="eyebrow">{t("month")}</p>
          <h3>{new Intl.DateTimeFormat(locale(lang), { month: "long", year: "numeric" }).format(new Date())}</h3>
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const iso = localDateKey(day);
            const dayEvents = events.filter((event) => event.date === iso);
            return (
              <button className={`calendar-day ${selected === iso ? "active" : ""}`} key={iso} onClick={() => setSelected(iso)}>
                <strong>{day.getDate()}</strong>
                <span>{dayEvents.length ? dayEvents.length : ""}</span>
              </button>
            );
          })}
        </div>
      </div>
      <aside className="agenda-panel">
        <SectionTitle title={formatLongDate(selected, locale(lang))} />
        <div className="agenda-list">
          {selectedEvents.map((item) => <EventRow key={item.id} event={item} onOpen={() => onOpen(item)} lang={lang} t={t} />)}
        </div>
        {!selectedEvents.length ? <Empty title={t("noEventsDate")} text={t("tryAnother")} /> : null}
      </aside>
    </section>
  );
}

function Reports({ reports, onOpen, lang, t }: { reports: EventReport[]; onOpen: (item: EventReport) => void; lang: Lang; t: T }) {
  const [query, setQuery] = useState("");
  const visible = reports.filter((item) => `${reportTitle(item, lang)} ${reportSummary(item, lang)}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="section-stack">
      <Toolbar>
        <Search value={query} onChange={setQuery} placeholder={t("searchReports")} />
      </Toolbar>
      <div className="content-grid two">
        {visible.map((item) => <ReportCard key={item.id} report={item} onOpen={() => onOpen(item)} lang={lang} t={t} />)}
      </div>
      {!visible.length ? <Empty title={t("noReports")} text={t("tryAnother")} /> : null}
    </section>
  );
}

function Applications({
  applications,
  lang,
  t,
  onOpen
}: {
  applications: EventApplication[];
  lang: Lang;
  t: T;
  onOpen: (item: EventApplication) => void;
}) {
  const [filter, setFilter] = useState("all");
  const counts = {
    all: applications.length,
    pending: applications.filter((item) => item.status === "pending").length,
    approved: applications.filter((item) => item.status === "approved").length,
    waitlisted: applications.filter((item) => item.status === "waitlisted").length
  };
  const visible = applications.filter((item) => filter === "all" || item.status === filter);

  return (
    <section className="section-stack applications-page">
      <section className="applications-hero">
        <div>
          <p className="eyebrow">{t("myApplications")}</p>
          <h2>{t("applicationsPageTitle")}</h2>
          <p>{t("applicationsPageSubtitle")}</p>
        </div>
        <div className="application-stats">
          <MetricCard value={String(counts.all)} label={t("all")} tone="blue" />
          <MetricCard value={String(counts.approved)} label={t("approved")} tone="green" />
          <MetricCard value={String(counts.pending)} label={t("pending")} tone="amber" />
          <MetricCard value={String(counts.waitlisted)} label={t("waitlisted")} tone="rose" />
        </div>
      </section>

      <Toolbar>
        <FilterRow
          items={[
            { value: "all", label: t("all") },
            { value: "pending", label: t("pending") },
            { value: "approved", label: t("approved") },
            { value: "waitlisted", label: t("waitlisted") },
            { value: "rejected", label: t("rejected") }
          ]}
          active={filter}
          onChange={setFilter}
        />
      </Toolbar>

      <div className="application-list">
        {visible.map((item) => (
          <article className="application-card clickable" key={item.id} onClick={() => onOpen(item)}>
            {item.event?.coverImage ? <img src={item.event.coverImage} alt="" /> : <div className="image-placeholder" />}
            <div className="application-body">
              <div className="card-topline">
                <Badge label={statusLabel(item.status, t)} tone={item.status === "approved" ? "good" : item.status === "rejected" ? "hot" : "info"} />
                <small>{formatShortDate(item.createdAt, locale(lang))}</small>
              </div>
              <h3>{item.event ? eventTitle(item.event, lang) : `Event #${item.eventId}`}</h3>
              <p>{typeLabel(item.applicationType, t)} · {item.event ? `${formatShortDate(item.event.date, locale(lang))} · ${eventLocation(item.event, lang)}` : t("openDetails")}</p>
              {item.event ? <AccessMini event={item.event} spectatorAllowed={item.event.viewerCanSpectate !== false} t={t} /> : null}
            </div>
          </article>
        ))}
      </div>

      {!visible.length ? <Empty title={t("noApplications")} text={t("tryAnother")} /> : null}
    </section>
  );
}

function Profile({ user, applications, notifications, t, lang, onLogout }: { user: User; applications: EventApplication[]; notifications: AppNotification[]; t: T; lang: Lang; onLogout: () => void }) {
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
          <div className="list-stack">
            {applications.map((item) => (
              <article className="list-card" key={item.id}>
                <Badge label={statusLabel(item.status, t)} tone={item.status === "approved" ? "good" : item.status === "rejected" ? "hot" : "info"} />
                <div>
                  <h4>{item.event ? eventTitle(item.event, lang) : `Event #${item.eventId}`}</h4>
                  <p>{typeLabel(item.applicationType, t)} · {formatShortDate(item.createdAt, locale(lang))}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title={t("notifications")} />
          <div className="list-stack">
            {notifications.map((item) => (
              <article className="list-card" key={item.id}>
                <Badge label={item.isRead ? t("read") : t("new")} tone={item.isRead ? "neutral" : "info"} />
                <div>
                  <h4>{notificationTitle(item, lang)}</h4>
                  <p>{notificationMessage(item, lang)}</p>
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

function Assistant({
  user,
  lang,
  announcements,
  events,
  reports,
  applications,
  notifications,
  t
}: {
  user: User;
  lang: Lang;
  announcements: Announcement[];
  events: SchoolEvent[];
  reports: EventReport[];
  applications: EventApplication[];
  notifications: AppNotification[];
  t: T;
}) {
  const quickPrompts = [
    t("promptEventsForClass"),
    t("promptDeadlines"),
    t("promptSummarizeAnnouncements"),
    t("promptReports")
  ];
  const [prompt, setPrompt] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(nextPrompt = prompt) {
    const cleanPrompt = nextPrompt.trim();
    if (!cleanPrompt) return;
    setPrompt(cleanPrompt);
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", text: cleanPrompt }]);
    setLoading(true);
    try {
      const result = await api.assistant(cleanPrompt, {
        user,
        language: lang,
        announcements,
        events,
        reports,
        applications,
        notifications
      });
      setMessages((items) => [
        ...items,
        { id: crypto.randomUUID(), role: "assistant", text: result.response.answer, mode: result.response.mode }
      ]);
      setSuggestions(result.response.suggestions ?? []);
      setPrompt("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="assistant-chat-page">
      <div className="ai-chat-panel full">
        <div className="ai-chat-head">
          <div>
            <strong>Lyceum AI</strong>
            <span>Gemini + данные сайта</span>
          </div>
          <Badge label={loading ? t("thinking") : "активен"} tone={loading ? "info" : "good"} />
        </div>
        <div className="ai-message-list">
          {!messages.length ? (
            <div className="ai-empty-state">
              <p className="eyebrow">Gemini · {t("futureApi")}</p>
              <h2>{t("readyWhenYouAre")}</h2>
              <p>{t("assistantText")}</p>
              <div className="quick-prompts" aria-label={t("quickPrompts")}>
                {quickPrompts.map((item) => (
                  <button key={item} onClick={() => ask(item)} type="button">{item}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((item) => (
              <article className={`ai-message ${item.role}`} key={item.id}>
                <small>{item.role === "user" ? firstName(user.fullName) : "AI"}{item.mode ? ` · ${item.mode}` : ""}</small>
                <p>{item.text}</p>
              </article>
            ))
          )}
          {loading ? (
            <article className="ai-message assistant loading-bubble">
              <small>AI</small>
              <p>{t("thinking")}</p>
            </article>
          ) : null}
        </div>
        {suggestions.length ? (
          <div className="quick-prompts compact">
            {suggestions.map((item) => <button key={item} onClick={() => ask(item)} type="button">{item}</button>)}
          </div>
        ) : null}
        <div className="ai-input-bar">
          <div className="chat-input-shell">
            <button className="chat-tool" type="button" onClick={() => setPrompt(t("assistantPlaceholder"))}>+</button>
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") ask();
              }}
              placeholder={t("askAnything")}
            />
            <button className="chat-tool text" type="button">mic</button>
            <button className="chat-send" onClick={() => ask()} disabled={loading} type="button">{loading ? "..." : "AI"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailView({ detail, onBack, user, lang, t }: { detail: Detail; onBack: () => void; user: User; lang: Lang; t: T }) {
  if (!detail) return null;
  if (detail.type === "announcement") {
    return (
      <section className="detail-layout">
        <button className="secondary-button" onClick={onBack}>{t("back")}</button>
        <article className="detail-card">
          {detail.item.imageUrl ? <img src={detail.item.imageUrl} alt="" /> : null}
          <div className="detail-head">
            <Badge label={categoryLabel(detail.item.category, t)} tone={detail.item.priority === "important" ? "hot" : "info"} />
            <span>{formatLongDate(detail.item.createdAt, locale(lang))}</span>
          </div>
          <h3>{announcementTitle(detail.item, lang)}</h3>
          <p>{announcementContent(detail.item, lang)}</p>
        </article>
      </section>
    );
  }
  if (detail.type === "report") {
    return (
      <section className="detail-layout">
        <button className="secondary-button" onClick={onBack}>{t("back")}</button>
        <article className="detail-card report-detail">
          {detail.item.gallery[0] ? <img src={detail.item.gallery[0]} alt="" /> : null}
          <h3>{reportTitle(detail.item, lang)}</h3>
          <p>{reportSummary(detail.item, lang)}</p>
          <h4>{t("results")}</h4>
          <ul>{reportResults(detail.item, lang).map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>{t("highlights")}</h4>
          <ul>{reportHighlights(detail.item, lang).map((item) => <li key={item}>{item}</li>)}</ul>
          {reportQuote(detail.item, lang) ? <blockquote>{reportQuote(detail.item, lang)}</blockquote> : null}
        </article>
      </section>
    );
  }
  return <EventDetail event={detail.item} user={user} onBack={onBack} lang={lang} t={t} />;
}

function EventDetail({ event, user, onBack, lang, t }: { event: SchoolEvent; user: User; onBack: () => void; lang: Lang; t: T }) {
  const initialType: ApplicationType = canSpectate(event, user.className) ? "spectator" : "participant";
  const [type, setType] = useState<ApplicationType>(initialType);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const spectatorAllowed = canSpectate(event, user.className);

  async function apply() {
    setMessage("");
    setSubmitting(true);
    try {
      await api.apply(event.id, type, note);
      setMessage(t("applicationSubmitted"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("applicationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="detail-layout">
      <button className="secondary-button" onClick={onBack}>{t("back")}</button>
      <article className="detail-card event-detail">
        {event.coverImage ? <img src={event.coverImage} alt="" /> : null}
        <div className="detail-head">
          <Badge label={categoryLabel(event.category, t)} tone="info" />
          <Badge label={event.registrationOpen ? t("registrationOpen") : t("registrationClosed")} tone={event.registrationOpen ? "good" : "neutral"} />
        </div>
        <h3>{eventTitle(event, lang)}</h3>
        <p>{eventFull(event, lang)}</p>

        <AccessNotice event={event} user={user} t={t} />

        <div className="info-grid">
          <Info label={t("date")} value={`${formatLongDate(event.date, locale(lang))}, ${event.startTime}-${event.endTime}`} />
          <Info label={t("location")} value={eventLocation(event, lang)} />
          <Info label={t("organizer")} value={eventOrganizer(event, lang)} />
          <Info label={t("participants")} value={`${event.participantApprovedCount}/${event.participantCapacity}`} />
          <Info label={t("spectators")} value={`${event.spectatorApprovedCount}/${event.spectatorCapacity}`} />
          <Info label={t("deadline")} value={formatShortDate(event.registrationDeadline, locale(lang))} />
        </div>

        <div className="apply-box">
          <h4>{t("applyToEvent")}</h4>
          <div className="segmented">
            <button className={type === "participant" ? "active" : ""} onClick={() => setType("participant")}>{t("participant")}</button>
            <button className={type === "spectator" ? "active" : ""} onClick={() => setType("spectator")} disabled={!spectatorAllowed}>{t("spectator")}</button>
          </div>
          <textarea value={note} onChange={(item) => setNote(item.target.value)} placeholder={t("optionalNote")} />
          <button className="primary-button" onClick={apply} disabled={submitting || !event.registrationOpen}>{submitting ? t("submitting") : t("submitApplication")}</button>
          {message ? <p className="form-message">{message}</p> : null}
        </div>
      </article>
    </section>
  );
}

function AnnouncementCard({ item, onOpen, lang, t }: { item: Announcement; onOpen: () => void; lang: Lang; t: T }) {
  return (
    <article className="card announcement-card clickable" onClick={onOpen}>
      <div className="card-topline">
        <Badge label={item.priority === "important" ? t("important") : categoryLabel(item.category, t)} tone={item.priority === "important" ? "hot" : "info"} />
        <small>{formatShortDate(item.createdAt, locale(lang))}</small>
      </div>
      <h4>{announcementTitle(item, lang)}</h4>
      <p>{announcementContent(item, lang)}</p>
      {item.targetClasses.length ? <small>{item.targetClasses.join(", ")}</small> : null}
    </article>
  );
}

function EventCard({ event, user, onOpen, lang, t }: { event: SchoolEvent; user?: User; onOpen: () => void; lang: Lang; t: T }) {
  const spectatorAllowed = user ? canSpectate(event, user.className) : event.viewerCanSpectate !== false;
  return (
    <article className={`card event-card clickable ${spectatorAllowed ? "" : "restricted"}`} onClick={onOpen}>
      {event.coverImage ? <img src={event.coverImage} alt="" /> : <div className="image-placeholder" />}
      <div className="card-topline">
        <Badge label={categoryLabel(event.category, t)} tone="info" />
        <Badge label={event.registrationOpen ? t("registrationOpen") : t("registrationClosed")} tone={event.registrationOpen ? "good" : "neutral"} />
      </div>
      <h4>{eventTitle(event, lang)}</h4>
      <p>{eventShort(event, lang)}</p>
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

function ReportCard({ report, onOpen, lang, t }: { report: EventReport; onOpen: () => void; lang: Lang; t: T }) {
  return (
    <article className="card report-card clickable" onClick={onOpen}>
      {report.gallery[0] ? <img src={report.gallery[0]} alt="" /> : null}
      <Badge label={t("reports")} tone="good" />
      <h4>{reportTitle(report, lang)}</h4>
      <p>{reportSummary(report, lang)}</p>
      <small>{formatShortDate(report.publishedAt, locale(lang))}</small>
    </article>
  );
}

function AccessMini({ event, spectatorAllowed, t }: { event: SchoolEvent; spectatorAllowed: boolean; t: T }) {
  if (!event.allowedSpectatorClasses.length) {
    return <div className="access-mini good">{t("allClassesAllowed")}</div>;
  }
  if (spectatorAllowed) {
    return <div className="access-mini good">{t("spectatorAvailable")}</div>;
  }
  return <div className="access-mini locked">{t("spectatorRestricted")} · {event.allowedSpectatorClasses.join(", ")}</div>;
}

function AccessNotice({ event, user, t }: { event: SchoolEvent; user: User; t: T }) {
  const spectatorAllowed = canSpectate(event, user.className);
  if (!event.allowedSpectatorClasses.length) {
    return (
      <div className="access-notice good">
        <strong>{t("allClassesAllowed")}</strong>
        <span>{t("participantStillAvailable")}</span>
      </div>
    );
  }
  if (spectatorAllowed) {
    return (
      <div className="access-notice good">
        <strong>{t("spectatorAvailable")}</strong>
        <span>{t("allowedClasses")}: {event.allowedSpectatorClasses.join(", ")}</span>
      </div>
    );
  }
  return (
    <div className="access-notice locked">
      <strong>{t("spectatorRestricted")}</strong>
      <span>{t("allowedClasses")}: {event.allowedSpectatorClasses.join(", ")}</span>
      <span>{t("participantStillAvailable")}</span>
    </div>
  );
}

function PageTitle({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {aside ? <div className="page-title-aside">{aside}</div> : null}
    </div>
  );
}

function LanguageSwitcher({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return (
    <div className="language-switcher" aria-label="Language">
      <button className={lang === "ru" ? "active" : ""} onClick={() => setLang("ru")} type="button">RU</button>
      <button className={lang === "kz" ? "active" : ""} onClick={() => setLang("kz")} type="button">KZ</button>
    </div>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="section-title">
      <h3>{title}</h3>
      {action && onAction ? <button className="link-button" onClick={onAction}>{action}</button> : null}
    </div>
  );
}

function Search({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input className="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

function FilterRow({ items, active, onChange }: { items: Array<{ value: string; label: string }>; active: string; onChange: (value: string) => void }) {
  return (
    <div className="filter-row">
      {items.map((item) => <button key={item.value} className={active === item.value ? "active" : ""} onClick={() => onChange(item.value)}>{item.label}</button>)}
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
  return <div className="empty"><h4>{t("loadingTitle")}</h4><p>{t("loadingText")}</p></div>;
}

function byLang(base: string, kz: string | undefined | null, lang: Lang) {
  return lang === "kz" && kz ? kz : base;
}

function detailTitle(detail: NonNullable<Detail>, lang: Lang) {
  if (detail.type === "announcement") return announcementTitle(detail.item, lang);
  if (detail.type === "report") return reportTitle(detail.item, lang);
  return eventTitle(detail.item, lang);
}

function announcementTitle(item: Announcement, lang: Lang) {
  return byLang(item.title, item.titleKz, lang);
}

function announcementContent(item: Announcement, lang: Lang) {
  return byLang(item.content, item.contentKz, lang);
}

function eventTitle(event: SchoolEvent, lang: Lang) {
  return byLang(event.title, event.titleKz, lang);
}

function eventShort(event: SchoolEvent, lang: Lang) {
  return byLang(event.shortDescription, event.shortDescriptionKz, lang);
}

function eventFull(event: SchoolEvent, lang: Lang) {
  return byLang(event.fullDescription, event.fullDescriptionKz, lang);
}

function eventLocation(event: SchoolEvent, lang: Lang) {
  return byLang(event.location, event.locationKz, lang);
}

function eventOrganizer(event: SchoolEvent, lang: Lang) {
  return byLang(event.organizer, event.organizerKz, lang);
}

function reportTitle(report: EventReport, lang: Lang) {
  return byLang(report.title, report.titleKz, lang);
}

function reportSummary(report: EventReport, lang: Lang) {
  return byLang(report.summary, report.summaryKz, lang);
}

function reportResults(report: EventReport, lang: Lang) {
  return lang === "kz" && report.resultsKz?.length ? report.resultsKz : report.results;
}

function reportHighlights(report: EventReport, lang: Lang) {
  return lang === "kz" && report.highlightsKz?.length ? report.highlightsKz : report.highlights;
}

function reportQuote(report: EventReport, lang: Lang) {
  return byLang(report.quote ?? "", report.quoteKz, lang);
}

function notificationTitle(item: AppNotification, lang: Lang) {
  return byLang(item.title, item.titleKz, lang);
}

function notificationMessage(item: AppNotification, lang: Lang) {
  return byLang(item.message, item.messageKz, lang);
}

function titleFor(tab: Tab, t: T) {
  const item = navItems.find((nav) => nav.id === tab);
  return item ? t(item.label) : "Lyceum Life";
}

function categoryLabel(category: string, t: T) {
  const key = categoryKeys[category];
  return key ? t(key) : category;
}

function statusLabel(status: EventApplication["status"], t: T) {
  const key: Record<EventApplication["status"], TranslationKey> = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    waitlisted: "waitlisted"
  };
  return t(key[status]);
}

function typeLabel(type: ApplicationType, t: T) {
  return type === "participant" ? t("participant") : t("spectator");
}

function canSpectate(event: SchoolEvent, className: string) {
  return !event.allowedSpectatorClasses.length || event.allowedSpectatorClasses.includes(className) || event.viewerCanSpectate === true;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function locale(lang: Lang) {
  return lang === "ru" ? "ru-RU" : "kk-KZ";
}
