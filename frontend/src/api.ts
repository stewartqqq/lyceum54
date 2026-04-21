import type { Announcement, AppNotification, ApplicationType, EventApplication, EventReport, SchoolEvent, User } from "./types";
import { demoUser, mockAnnouncements, mockApplications, mockEvents, mockNotifications, mockReports } from "./mockData";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000/api";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const TOKEN_KEY = "lyceum-life-token";
const USER_KEY = "lyceum-life-user";

export type AssistantSiteContext = {
  user?: User | null;
  language?: string;
  announcements?: Announcement[];
  events?: SchoolEvent[];
  reports?: EventReport[];
  applications?: EventApplication[];
  notifications?: AppNotification[];
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  className: string;
};

async function request<T>(path: string, options: RequestInit = {}, includeAuth = true): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(includeAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Request failed");
  }
  return payload as T;
}

async function fallback<T>(call: () => Promise<T>, value: T): Promise<T> {
  try {
    return await call();
  } catch {
    return value;
  }
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const api = {
  async register(payload: RegisterPayload) {
    const localUser: User = {
      id: Date.now(),
      fullName: payload.fullName,
      email: payload.email.toLowerCase(),
      className: payload.className,
      role: "student"
    };

    if (USE_MOCKS) {
      const result = { accessToken: "demo-token", user: localUser };
      localStorage.setItem(TOKEN_KEY, result.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return result;
    }

    const result = await fallback(
      () => request<{ accessToken: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      }, false),
      { accessToken: "demo-token", user: localUser }
    );
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  },

  async login(email: string, password: string) {
    if (USE_MOCKS) {
      const result = { accessToken: "demo-token", user: demoUser };
      localStorage.setItem(TOKEN_KEY, result.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return result;
    }

    const result = await fallback(
      () => request<{ accessToken: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }),
      { accessToken: "demo-token", user: demoUser }
    );
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  },

  announcements: () => USE_MOCKS ? Promise.resolve({ announcements: mockAnnouncements }) : fallback(() => request<{ announcements: Announcement[] }>("/announcements"), { announcements: mockAnnouncements }),
  events: () => USE_MOCKS ? Promise.resolve({ events: mockEvents }) : fallback(() => request<{ events: SchoolEvent[] }>("/events"), { events: mockEvents }),
  reports: () => USE_MOCKS ? Promise.resolve({ reports: mockReports }) : fallback(() => request<{ reports: EventReport[] }>("/reports"), { reports: mockReports }),
  applications: () => {
    const currentUser = getStoredUser();
    const localApplications = currentUser ? mockApplications.filter(item => item.userId === currentUser.id) : mockApplications;
    return USE_MOCKS ? Promise.resolve({ applications: localApplications }) : fallback(() => request<{ applications: EventApplication[] }>("/applications/my"), { applications: localApplications });
  },
  notifications: () => {
    const currentUser = getStoredUser();
    const localNotifications = currentUser ? mockNotifications.filter(item => item.userId === currentUser.id) : mockNotifications;
    return USE_MOCKS ? Promise.resolve({ notifications: localNotifications }) : fallback(() => request<{ notifications: AppNotification[] }>("/notifications"), { notifications: localNotifications });
  },

  apply: (eventId: number, applicationType: ApplicationType, note = "") => {
    if (USE_MOCKS) {
      const event = mockEvents.find((item) => item.id === eventId);
      return Promise.resolve({
        application: {
          id: Date.now(),
          userId: demoUser.id,
          eventId,
          event,
          applicationType,
          note,
          status: "pending",
          createdAt: new Date().toISOString()
        } satisfies EventApplication
      });
    }

    const user = getStoredUser();
    const event = mockEvents.find((item) => item.id === eventId);
    return fallback(
      () => request<{ application: EventApplication }>(`/events/${eventId}/apply`, {
        method: "POST",
        body: JSON.stringify({ applicationType, note })
      }),
      {
        application: {
          id: Date.now(),
          userId: user?.id ?? demoUser.id,
          eventId,
          event,
          applicationType,
          note,
          status: "pending",
          createdAt: new Date().toISOString()
        } satisfies EventApplication
      }
    );
  },

  assistant: (prompt: string, context: AssistantSiteContext = {}) =>
    fallback(
      () => request<{ response: { answer: string; suggestions: string[]; mode: string } }>("/assistant/query", {
        method: "POST",
        body: JSON.stringify({ prompt, context })
      }, false),
      {
        response: {
          mode: "demo",
          answer: `AI-помощник не смог подключиться к backend, но запрос получен: "${prompt}". Запусти Flask backend и добавь Gemini ключ в backend/.env, чтобы ответы шли через настоящую модель и контекст сайта.`,
          suggestions: ["Проверить backend", "Открыть мероприятия", "Посмотреть объявления"]
        }
      }
    )
};
