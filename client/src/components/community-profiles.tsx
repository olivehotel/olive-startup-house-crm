import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  UserCircle,
  Loader2,
  Linkedin,
  DoorOpen,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import {
  getCommunityProfiles,
  getCommunityProfilesAdmin,
  editCommunityProfile,
  deleteCommunityProfile,
  addCommunityProfileForLead,
} from "@/actions/community";
import { extractMagicLinkFromApiResponse } from "@/lib/invite-link";
import { bodyContainsInvoiceLink } from "@/lib/invoice-links-supabase";
import { findCommunicationIdByEmail, sendEmailMessage } from "@/actions/communications";
import { useUserRole } from "@/hooks/use-user-role";
import type {
  CommunityProfile,
  CommunityProfileAdmin,
  CommunityProfilesPagination,
  CreateCommunityAccountForm,
} from "@shared/schema";
import { createCommunityAccountSchema } from "@shared/schema";
import { FileDropZone } from "@/components/file-drop-zone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CommunityProfiles() {
  const { toast } = useToast();
  const { canViewCommunityAdminProfiles, isLoading: userRoleLoading } = useUserRole();
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [addProfileSubmitting, setAddProfileSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<CommunityProfileAdmin[]>([]);
  const [pagination, setPagination] = useState<CommunityProfilesPagination | null>(null);
  const [page, setPage] = useState(1);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [editingProfile, setEditingProfile] = useState<CommunityProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editAvatar, setEditAvatar] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingProfile, setDeletingProfile] = useState<CommunityProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const addProfileForm = useForm<CreateCommunityAccountForm>({
    resolver: zodResolver(createCommunityAccountSchema),
    defaultValues: { full_name: "", email: "", linkedin_url: "" },
  });

  const loadPage = useCallback(async (p: number) => {
    setLoadingProfiles(true);
    try {
      const { profiles: list, pagination: pag } = canViewCommunityAdminProfiles
        ? await getCommunityProfilesAdmin(p)
        : await getCommunityProfiles(p);
      setProfiles((list as CommunityProfileAdmin[]) ?? []);
      setPagination(pag ?? null);
    } catch {
      setPagination(null);
    } finally {
      setLoadingProfiles(false);
    }
  }, [canViewCommunityAdminProfiles]);

  useEffect(() => {
    if (userRoleLoading) return;
    void loadPage(page);
  }, [page, loadPage, userRoleLoading]);

  const closeAddProfileDialog = () => {
    addProfileForm.reset();
    setAddProfileOpen(false);
  };

  const onSubmitAddProfile = async (data: CreateCommunityAccountForm) => {
    const email = data.email.trim();
    setAddProfileSubmitting(true);
    try {
      const res = await addCommunityProfileForLead({
        full_name: data.full_name.trim(),
        email,
        linkedin_url: data.linkedin_url.trim(),
      });

      const magicLink = extractMagicLinkFromApiResponse(res);
      if (!magicLink) {
        closeAddProfileDialog();
        toast({
          title: "Profile created",
          description: "No link in the response. The list was refreshed.",
        });
        if (page === 1) await loadPage(1);
        else setPage(1);
        return;
      }

      const threadId = await findCommunicationIdByEmail(email);
      if (threadId) {
        try {
          await sendEmailMessage({
            communication_id: threadId,
            body: magicLink,
            subject: "Guest invite",
            is_invoice: bodyContainsInvoiceLink(magicLink, []),
          });
          closeAddProfileDialog();
          toast({
            title: "Profile created",
            description: "The guest link was sent in the thread.",
          });
        } catch (sendErr) {
          toast({
            title: "Profile created; message not sent",
            description: sendErr instanceof Error ? sendErr.message : "Failed to send email.",
            variant: "destructive",
          });
        }
      } else {
        let copyHint = "";
        try {
          await navigator.clipboard.writeText(magicLink);
          copyHint = " The link was copied to your clipboard.";
        } catch {
          copyHint = "";
        }
        closeAddProfileDialog();
        toast({
          title: "Profile created; no matching thread",
          description: `No Communication Center thread found for ${email}.${copyHint} Add or match this email to a thread to send via email.`,
          variant: "destructive",
        });
      }

      if (page === 1) {
        await loadPage(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      toast({
        title: "Failed to create profile",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAddProfileSubmitting(false);
    }
  };

  const openEdit = (profile: CommunityProfile) => {
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditPosition(profile.position);
    setEditDescription(profile.description ?? "");
    setEditRoom(profile.room ?? "");
    setEditLinkedin(profile.linkedin_url ?? "");
    setEditAvatar(null);
    setRemoveAvatar(false);
  };

  const saveEdit = async () => {
    if (!editingProfile) return;
    const name = editName.trim();
    const position = editPosition.trim();
    if (!name || !position) {
      toast({ title: "Name and position are required", variant: "destructive" });
      return;
    }
    const link = editLinkedin.trim();
    if (link) {
      try {
        const u = new URL(link);
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      } catch {
        toast({ title: "Please enter a valid LinkedIn URL", variant: "destructive" });
        return;
      }
    }

    setSavingEdit(true);
    try {
      const fd = new FormData();
      fd.append("profile_id", editingProfile.id);
      fd.append("name", name);
      fd.append("position", position);
      if (editDescription.trim()) fd.append("description", editDescription.trim());
      if (editRoom.trim()) fd.append("room", editRoom.trim());
      if (link) fd.append("linkedin_url", link);
      if (editAvatar) fd.append("avatar", editAvatar);
      if (removeAvatar) fd.append("remove_avatar", "true");

      await editCommunityProfile(fd);
      toast({ title: "Profile updated", description: `"${name}" has been saved.` });
      setEditingProfile(null);
      setEditAvatar(null);
      await loadPage(page);
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingProfile) return;
    setDeleting(true);
    try {
      await deleteCommunityProfile(deletingProfile.id);
      toast({ title: "Profile deleted", description: `"${deletingProfile.name}" has been removed.` });
      setDeletingProfile(null);
      const currentPage = page;
      const { profiles: next, pagination: pag } = canViewCommunityAdminProfiles
        ? await getCommunityProfilesAdmin(currentPage)
        : await getCommunityProfiles(currentPage);
      setProfiles((next as CommunityProfileAdmin[]) ?? []);
      setPagination(pag ?? null);
      if ((next?.length ?? 0) === 0 && currentPage > 1) {
        setPage(currentPage - 1);
      }
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Community Profiles</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Member profiles for the co-living community</p>
          </div>
          <Button size="sm" onClick={() => setAddProfileOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {userRoleLoading || loadingProfiles ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length > 0 ? (
          <>
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full bg-muted p-1.5">
                        <UserCircle className="h-7 w-7 text-muted-foreground" aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{profile.name}</p>
                      <span className="text-xs text-muted-foreground truncate">{profile.position}</span>
                    </div>
                    {profile.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{profile.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {profile.room && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DoorOpen className="h-3.5 w-3.5 flex-shrink-0" />
                          {profile.room}
                        </span>
                      )}
                      {profile.linkedin_url && (
                        <a
                          href={profile.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                          LinkedIn
                        </a>
                      )}
                      {canViewCommunityAdminProfiles &&
                        (() => {
                          const p = profile as CommunityProfileAdmin;
                          const link =
                            (p.magic_link && p.magic_link.trim()) ||
                            (p.guest_magic_link && p.guest_magic_link.trim()) ||
                            (p.invite_url && p.invite_url.trim());
                          if (!link) return null;
                          return (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await navigator.clipboard.writeText(link);
                                  toast({ title: "Copied", description: "Magic link copied to clipboard." });
                                } catch {
                                  toast({ title: "Copy failed", variant: "destructive" });
                                }
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Magic link
                            </Button>
                          );
                        })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Edit profile"
                      onClick={() => openEdit(profile)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label="Delete profile"
                      onClick={() => setDeletingProfile(profile)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.has_prev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.has_next}
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mt-4">No profiles added yet</p>
            <p className="text-sm text-muted-foreground">Add member profiles to showcase your community.</p>
            <Button className="mt-4" onClick={() => setAddProfileOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog
      open={addProfileOpen}
      onOpenChange={(open) => {
        if (addProfileSubmitting) return;
        if (!open) closeAddProfileDialog();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          if (addProfileSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (addProfileSubmitting) e.preventDefault();
        }}
      >
        <Form {...addProfileForm}>
          <form onSubmit={addProfileForm.handleSubmit(onSubmitAddProfile)}>
            <DialogHeader>
              <DialogTitle>Add profile</DialogTitle>
              <DialogDescription>
                Invite a guest by email. They will receive a magic link to complete onboarding.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={addProfileForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="name"
                        placeholder="Jane Smith"
                        disabled={addProfileSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addProfileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="jane@example.com"
                        disabled={addProfileSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addProfileForm.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://linkedin.com/in/…"
                        autoComplete="off"
                        disabled={addProfileSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeAddProfileDialog()}
                disabled={addProfileSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addProfileSubmitting}>
                {addProfileSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Add profile"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <Dialog
      open={editingProfile !== null}
      onOpenChange={(open) => {
        if (!open) {
          setEditingProfile(null);
          setEditAvatar(null);
          setRemoveAvatar(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        {editingProfile && (
          <div className="space-y-4 py-1">
            <div>
              <p className="text-sm font-medium mb-1.5">Name</p>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Position</p>
              <Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="Position" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Room <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} placeholder="Room" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">LinkedIn URL <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Input value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief bio…"
                rows={2}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Replace avatar <span className="text-muted-foreground font-normal">(optional)</span></p>
              <FileDropZone
                accept=".jpg,.jpeg,.png,.webp,.gif"
                label="New profile photo"
                file={editAvatar}
                onChange={(f) => {
                  setEditAvatar(f);
                  if (f) setRemoveAvatar(false);
                }}
              />
            </div>
            {editingProfile.avatar_url && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remove-avatar"
                  checked={removeAvatar}
                  onCheckedChange={(v) => {
                    setRemoveAvatar(v === true);
                    if (v === true) setEditAvatar(null);
                  }}
                />
                <Label htmlFor="remove-avatar" className="text-sm font-normal cursor-pointer">
                  Remove current avatar
                </Label>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingProfile(null);
              setEditAvatar(null);
              setRemoveAvatar(false);
            }}
            disabled={savingEdit}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void saveEdit()} disabled={savingEdit}>
            {savingEdit ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deletingProfile !== null} onOpenChange={(open) => { if (!open) setDeletingProfile(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
          <AlertDialogDescription>
            {deletingProfile ? (
              <>This will remove &quot;{deletingProfile.name}&quot; from community profiles. This cannot be undone.</>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
