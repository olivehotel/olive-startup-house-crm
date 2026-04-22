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
export const leadStatuses = [
  "New",
  "Contacted",
  "Qualified",
  "Payment Pending",
  "Converted",
  "Registered",
  "Lost",
] as const;
export type LeadStatus = typeof leadStatuses[number];

// Lead statuses (Supabase `lead_statuses.id` → label). Lost has no id in app yet.
export const leadStatusIds = {
  "04f84734-b0f8-4701-9a4c-5cc245dab5e2": "New",
  "043b7f5a-a3fc-4c15-b423-3e2a521696ff": "Registered",
  "a23c166c-7f48-49ed-b47e-397649f3b06a": "Contacted",
  "ac064815-cb42-445d-a247-6e05e3fe22d8": "Qualified",
  "2e210653-93d7-40ab-a0d9-6a9296a3c0a9": "Payment Pending",
  "369fe4e8-38a3-4d60-a0e0-adbdb17e5f9d": "Converted",
} as const;

export type LeadStatusId = keyof typeof leadStatusIds;

export function getLeadStatusId(label: LeadStatus): string | undefined {
  for (const [id, l] of Object.entries(leadStatusIds)) {
    if (l === label) return id;
  }
  return undefined;
}

// Lead
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  message_text?: string;
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
  "64d9e4e4-22c3-4383-a2b8-5a7b1be755e5": "In Progress",
  "6841d608-1995-4be3-a73e-1a4760f931a6": "Processed",
} as const;

export type CommunicationStatusId = keyof typeof communicationStatuses;
export type CommunicationStatusValue = typeof communicationStatuses[CommunicationStatusId];

// Pagination
export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
}

// Communication
export interface Communication {
  id: string;
  contact_name: string;
  channel_id: CommunicationChannelId;
  status_id: CommunicationStatusId;
  main_mail?: string;
}

const channelIds = Object.keys(communicationChannels) as [CommunicationChannelId, ...CommunicationChannelId[]];
const statusIds = Object.keys(communicationStatuses) as [CommunicationStatusId, ...CommunicationStatusId[]];

export const insertCommunicationSchema = z.object({
  contact_name: z.string(),
  channel_id: z.enum(channelIds),
  status_id: z.enum(statusIds),
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
  inProgress: number;
  processed: number;
  invoicesSend?: number;
}

// Community Material Types (UUID → value)
export const materialTypes = {
  "113d2721-9243-4bff-9b8a-145a878456d4": "document",
  "72c083ba-6501-4f81-996b-6c488f5db458": "slide",
  "80a1eece-e2ed-45a4-95e3-f431e56f8678": "tip",
  "a1a8348c-69cd-4b9f-9a9f-56da587fcc78": "video",
  "f29c05ef-25ea-4a12-96e8-e9a4aa54b637": "guide",
  "f7653665-11dc-4044-a3db-75b0e24398b1": "rule",
  "b6a97d5b-20a5-4cfb-969b-c626e10e2f6d": "link",
} as const;

export type MaterialTypeId = keyof typeof materialTypes;
export type MaterialTypeValue = typeof materialTypes[MaterialTypeId];

export const materialTypeIds = Object.fromEntries(
  Object.entries(materialTypes).map(([id, val]) => [val, id])
) as Record<MaterialTypeValue, MaterialTypeId>;

const materialTypeIdTuple = Object.keys(materialTypes) as [MaterialTypeId, ...MaterialTypeId[]];

export const insertMaterialSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(materialTypeIdTuple),
  url: z.union([z.string().url(), z.literal("")]).optional(),
});

export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

/** Pagination metadata from get_community_documents edge function */
export interface CommunityDocumentsPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** Pagination metadata from get_community_profiles edge function (same shape as documents) */
export type CommunityProfilesPagination = CommunityDocumentsPagination;

/** Who the material is for: community-wide vs client-specific */
export type CommunityDocumentAudience = "common" | "client";

// Community Document
export interface CommunityDocument {
  id: string;
  title: string;
  description?: string | null;
  /** Audience for the document (from edge functions). Omitted or unknown → treat as common. */
  doc_type?: CommunityDocumentAudience;
  /** Present when API returns flat type id */
  type_id?: MaterialTypeId;
  /** Present when API returns nested type (e.g. type.value for icons) */
  type?: { id: string; value: MaterialTypeValue };
  url?: string;
  link?: string | null;
  /** Storage object key for non-link materials: `community-documents` when common, `client-documents` when doc_type is client */
  file_path?: string | null;
  created_at?: string;
}

// Community Profile
export interface CommunityProfile {
  id: string;
  name: string;
  position: string;
  description?: string;
  room?: string;
  linkedin_url?: string;
  avatar_url?: string;
}

export const insertProfileSchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  description: z.string().optional(),
  room: z.string().optional(),
  linkedin_url: z.union([z.string().url(), z.literal("")]).optional(),
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;

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

/** Attachment metadata returned on each mail from get-communication-messages */
export interface CommunicationMessageAttachment {
  id: string;
  filename?: string | null;
  bucket?: string | null;
  file_path?: string | null;
  mime_type?: string | null;
  /** Legacy or alternate API shapes */
  title?: string | null;
  url?: string | null;
}

// Communication Message (from get-communication-messages)
export interface CommunicationMessage {
  id: string;
  gmail_thread_id: string;
  subject: string;
  from: string;
  to: string;
  direction: "outgoing" | "incoming";
  body_text: string;
  body_html?: string;
  date: string;
  received_at: string;
  attachments?: CommunicationMessageAttachment[];
}

export interface CommunicationDetail {
  id: string;
  contact_name: string;
  contact_email: string;
  last_message_at: string;
  status_id: CommunicationStatusId;
  channel_id: CommunicationChannelId;
  main_mail?: string;
  /** Set when this communication is linked to a CRM lead */
  lead_id?: string | null;
}

export interface CommunicationMessagesResponse {
  communication: CommunicationDetail;
  messages: CommunicationMessage[];
  count: number;
  /** Present when the edge function returns paginated results */
  pagination?: Pagination;
}
