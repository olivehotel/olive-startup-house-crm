import { z } from "zod";

// Users
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = {
  id: string;
  username: string;
  password: string;
};

// Lead Sources
export const leadSources = ["Instagram", "Website", "Booking.com", "Airbnb", "Referral", "WOM", "OTA"] as const;
export type LeadSource = typeof leadSources[number];

// Lead Status
export const leadStatuses = ["New", "Contacted", "Qualified", "Converted", "Lost"] as const;
export type LeadStatus = typeof leadStatuses[number];

// Lead
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: LeadSource;
  status: LeadStatus;
  budget: number;
  notes?: string;
  avatar?: string;
  createdAt: string;
}

export const insertLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  source: z.enum(leadSources),
  status: z.enum(leadStatuses),
  budget: z.number().positive(),
  notes: z.string().optional(),
  avatar: z.string().optional(),
});

export type InsertLead = z.infer<typeof insertLeadSchema>;

// Communication Channels (UUID → label)
export const communicationChannels = {
  "1aace77e-c42e-49b6-af47-5668e8536307": "Phone/Call",
  "22583210-1707-4f36-a5c6-050b37ce3728": "Email",
  "95ef84c5-e52b-425e-9033-73d2e467d917": "Text/SMS",
  "a8a1b0e0-22b6-4d06-8b97-91f110957666": "Video Tour",
  "e79af83c-6114-4332-9006-d77efbd3019d": "In Person",
} as const;

export type CommunicationChannelId = keyof typeof communicationChannels;
export type CommunicationChannelValue = typeof communicationChannels[CommunicationChannelId];

// Communication Statuses (UUID → label)
export const communicationStatuses = {
  "1e97f499-e9a7-483a-a600-7958d3b86e11": "Form Filled",
  "4ac23f91-2d5a-483b-8dea-59b2b9629800": "Docs Requested",
  "64d9e4e4-22c3-4383-a2b8-5a7b1be755e5": "In Progress",
  "8e39cddd-1ab3-43e4-baf4-1e538c02c347": "Pending",
  "e95c2a25-a4b4-4cbb-855c-6246cdf0aaf9": "Completed",
  "eee82c30-bdfc-4a42-86e7-f2a995ae5097": "Link Sent",
} as const;

export type CommunicationStatusId = keyof typeof communicationStatuses;
export type CommunicationStatusValue = typeof communicationStatuses[CommunicationStatusId];

// Communication
export interface Communication {
  id: string;
  leadId: string;
  leadName: string;
  leadAvatar?: string;
  type: CommunicationChannelId;
  status: CommunicationStatusId;
  message: string;
  nextAction: string;
  timestamp: string;
}

const channelIds = Object.keys(communicationChannels) as [CommunicationChannelId, ...CommunicationChannelId[]];
const statusIds = Object.keys(communicationStatuses) as [CommunicationStatusId, ...CommunicationStatusId[]];

export const insertCommunicationSchema = z.object({
  leadId: z.string(),
  leadName: z.string(),
  leadAvatar: z.string().optional(),
  type: z.enum(channelIds),
  status: z.enum(statusIds),
  message: z.string(),
  nextAction: z.string(),
});

export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

// Screening Status
export const screeningStatuses = ["In Progress", "Approved", "Flagged", "Rejected"] as const;
export type ScreeningStatus = typeof screeningStatuses[number];

// Screening
export interface Screening {
  id: string;
  leadId: string;
  leadName: string;
  leadAvatar?: string;
  status: ScreeningStatus;
  progress: number;
  backgroundCheckComplete: boolean;
  aiInterviewComplete: boolean;
  notes?: string;
  timestamp: string;
}

export const insertScreeningSchema = z.object({
  leadId: z.string(),
  leadName: z.string(),
  leadAvatar: z.string().optional(),
  status: z.enum(screeningStatuses),
  progress: z.number().min(0).max(100),
  backgroundCheckComplete: z.boolean(),
  aiInterviewComplete: z.boolean(),
  notes: z.string().optional(),
});

export type InsertScreening = z.infer<typeof insertScreeningSchema>;

// Onboarding Status
export const onboardingStatuses = ["Orientation", "Invoice Sent", "Docs Pending", "Complete"] as const;
export type OnboardingStatus = typeof onboardingStatuses[number];

// Onboarding
export interface Onboarding {
  id: string;
  leadId: string;
  memberName: string;
  memberAvatar?: string;
  status: OnboardingStatus;
  moveInDate: string;
  monthlyRent: number;
  orientationComplete: boolean;
  invoicePaid: boolean;
  propertyId: string;
  roomId?: string;
}

export const insertOnboardingSchema = z.object({
  leadId: z.string(),
  memberName: z.string(),
  memberAvatar: z.string().optional(),
  status: z.enum(onboardingStatuses),
  moveInDate: z.string(),
  monthlyRent: z.number().positive(),
  orientationComplete: z.boolean(),
  invoicePaid: z.boolean(),
  propertyId: z.string(),
  roomId: z.string().optional(),
});

export type InsertOnboarding = z.infer<typeof insertOnboardingSchema>;

// Property
export interface Property {
  id: string;
  name: string;
  location: string;
  totalBeds: number;
  occupiedBeds: number;
  totalRooms: number;
  occupiedRooms: number;
  monthlyRevenue: number;
  image?: string;
}

export const insertPropertySchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  totalBeds: z.number().positive(),
  occupiedBeds: z.number().min(0),
  totalRooms: z.number().positive(),
  occupiedRooms: z.number().min(0),
  monthlyRevenue: z.number().min(0),
  image: z.string().optional(),
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;

// Room
export interface Room {
  id: string;
  propertyId: string;
  name: string;
  type: "Single" | "Double" | "Shared";
  beds: number;
  isOccupied: boolean;
  currentOccupantId?: string;
  monthlyRate: number;
  hasSmartLock: boolean;
}

export const insertRoomSchema = z.object({
  propertyId: z.string(),
  name: z.string().min(1),
  type: z.enum(["Single", "Double", "Shared"]),
  beds: z.number().positive(),
  isOccupied: z.boolean(),
  currentOccupantId: z.string().optional(),
  monthlyRate: z.number().positive(),
  hasSmartLock: z.boolean(),
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;

// Event Types
export const eventTypes = ["networking", "wellness", "workshop", "social"] as const;
export type EventType = typeof eventTypes[number];

// Community Event
export interface CommunityEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  capacity: number;
  attendees: number;
  propertyId: string;
}

export const insertEventSchema = z.object({
  title: z.string().min(1),
  type: z.enum(eventTypes),
  date: z.string(),
  time: z.string(),
  location: z.string(),
  capacity: z.number().positive(),
  attendees: z.number().min(0),
  propertyId: z.string(),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;

// Dashboard Stats
export interface DashboardStats {
  totalLeads: number;
  leadsChange: number;
  activeScreenings: number;
  screeningsChange: number;
  pendingOnboarding: number;
  onboardingChange: number;
  currentOccupancy: number;
  occupancyChange: number;
  communityEvents: number;
  eventsChange: number;
  toolUsageToday: number;
  toolUsageChange: number;
}

// Financial Data
export interface FinancialData {
  totalRevenue: number;
  revenueChange: number;
  netProfit: number;
  profitChange: number;
  profitMargin: number;
  marginChange: number;
  avgOccupancy: number;
}

export interface RevenueByProperty {
  propertyId: string;
  propertyName: string;
  location: string;
  revenue: number;
  change: number;
  occupiedRooms: number;
  totalRooms: number;
}

export interface MonthlyFinancial {
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  isCurrent: boolean;
}

export interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
  change: number;
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
  change: number;
}

// Communication Stats
export interface CommunicationStats {
  textMessages: number;
  phoneCalls: number;
  videoTours: number;
  inPersonTours: number;
  emails: number;
  totalActivity: number;
  docsPending: number;
  linksSent: number;
  formsFilled: number;
  toursScheduled: number;
}

// Community Stats
export interface CommunityStats {
  activeMembers: number;
  membersChange: number;
  whatsappEngagement: number;
  engagementChange: number;
  telegramGroups: number;
  groupsChange: number;
  monthlyEvents: number;
  eventsChange: number;
}
