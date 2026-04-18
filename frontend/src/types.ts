export type Role = "student" | "admin" | "moderator";
export type ApplicationType = "participant" | "spectator";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "waitlisted";

export type User = {
  id: number;
  fullName: string;
  email: string;
  className: string;
  role: Role;
};

export type Announcement = {
  id: number;
  title: string;
  titleKz?: string;
  content: string;
  contentKz?: string;
  category: string;
  priority: "normal" | "important";
  imageUrl?: string | null;
  targetClasses: string[];
  createdAt: string;
};

export type SchoolEvent = {
  id: number;
  title: string;
  titleKz?: string;
  shortDescription: string;
  shortDescriptionKz?: string;
  fullDescription: string;
  fullDescriptionKz?: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  locationKz?: string;
  category: string;
  organizer: string;
  organizerKz?: string;
  coverImage?: string | null;
  registrationOpen: boolean;
  registrationDeadline: string;
  participantCapacity: number;
  spectatorCapacity: number;
  participantApprovedCount: number;
  spectatorApprovedCount: number;
  allowedSpectatorClasses: string[];
  viewerCanSpectate?: boolean | null;
  tags: string[];
  status: "upcoming" | "ongoing" | "completed" | "canceled";
  featured: boolean;
};

export type EventApplication = {
  id: number;
  userId: number;
  eventId: number;
  applicationType: ApplicationType;
  status: ApplicationStatus;
  note?: string | null;
  createdAt: string;
  event?: SchoolEvent;
};

export type EventReport = {
  id: number;
  eventId: number;
  title: string;
  titleKz?: string;
  summary: string;
  summaryKz?: string;
  results: string[];
  resultsKz?: string[];
  highlights: string[];
  highlightsKz?: string[];
  gallery: string[];
  quote?: string | null;
  quoteKz?: string | null;
  publishedAt: string;
  event?: SchoolEvent;
};

export type AppNotification = {
  id: number;
  userId: number;
  title: string;
  titleKz?: string;
  message: string;
  messageKz?: string;
  isRead: boolean;
  type: string;
  createdAt: string;
};
