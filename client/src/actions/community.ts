import { apiFetch } from "@/lib/api";
import type {
  CommunityAddProfileResponse,
  CommunityDocument,
  CommunityDocumentAudience,
  CommunityDocumentsPagination,
  CommunityProfile,
  CommunityProfileAdmin,
  CommunityProfilesPagination,
} from "@shared/schema";

export const getCommunityDocuments = (page = 1) =>
  apiFetch<{ documents: CommunityDocument[]; pagination: CommunityDocumentsPagination }>(
    "get_community_documents",
    { params: { page } },
  );

export const getClientDocuments = (page = 1) =>
  apiFetch<{ documents: CommunityDocument[]; pagination: CommunityDocumentsPagination }>(
    "get_client_documents",
    { params: { page } },
  );

export const getCommunityProfiles = (page = 1) =>
  apiFetch<{ profiles: CommunityProfile[]; pagination: CommunityProfilesPagination }>(
    "get_community_profiles",
    { params: { page } },
  );

export const getCommunityProfilesAdmin = (page = 1) =>
  apiFetch<{ profiles: CommunityProfileAdmin[]; pagination: CommunityProfilesPagination }>(
    "get_community_profiles_admin",
    { params: { page } },
  );

export type AddCommunityProfilePayload = {
  full_name: string;
  email: string;
  linkedin_url: string;
  lead_id?: string;
};

export function addCommunityProfile(body: AddCommunityProfilePayload) {
  const payload: Record<string, string> = {
    full_name: body.full_name.trim(),
    email: body.email.trim(),
    linkedin_url: body.linkedin_url.trim(),
  };
  const leadId = body.lead_id?.trim();
  if (leadId) payload.lead_id = leadId;
  return apiFetch<CommunityAddProfileResponse>("community_add_profile", {
    method: "POST",
    body: payload,
  });
}

export const deleteCommunityProfile = (profileId: string) =>
  apiFetch<unknown>("community-delete-profile", {
    method: "DELETE",
    body: { profile_id: profileId },
  });

/** Multipart PATCH: append profile_id (required) and only fields you want to update */
export const editCommunityProfile = (form: FormData) =>
  apiFetch<unknown>("community-edit-profile", {
    method: "PATCH",
    body: form,
  });

export const deleteCommunityDocument = (documentId: string, docType: CommunityDocumentAudience) =>
  apiFetch<unknown>("community-delete-document", {
    method: "DELETE",
    body: { document_id: documentId, doc_type: docType },
  });

/** Multipart PATCH: append document_id (required) and only fields you want to update */
export const editCommunityDocument = (form: FormData) =>
  apiFetch<unknown>("community-edit-document", {
    method: "PATCH",
    body: form,
  });
