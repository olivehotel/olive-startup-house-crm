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

// Communication Types
export const communicationTypes = ["Text/SMS", "Phone Call", "Video Tour", "In-Person", "Email"] as const;
export type CommunicationType = typeof communicationTypes[number];

export const communicationStatuses = ["Docs Requested", "In Progress", "Link Sent", "Form Filled", "Pending", "Completed"] as const;
export type CommunicationStatus = typeof communicationStatuses[number];

// Communication
export interface Communication {
  id: string;
  leadId: string;
  leadName: string;
  leadAvatar?: string;
  type: CommunicationType;
  status: CommunicationStatus;
  message: string;
  nextAction: string;
  timestamp: string;
}

export const insertCommunicationSchema = z.object({
  leadId: z.string(),
  leadName: z.string(),
  leadAvatar: z.string().optional(),
  type: z.enum(communicationTypes),
  status: z.enum(communicationStatuses),
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
