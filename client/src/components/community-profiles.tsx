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
  X,
  Loader2,
  Linkedin,
  DoorOpen,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  getCommunityProfiles,
  editCommunityProfile,
  deleteCommunityProfile,
} from "@/actions/community";
import { supabase } from "@/lib/supabase";
import type { InsertProfile, CommunityProfile, CommunityProfilesPagination } from "@shared/schema";
import { insertProfileSchema } from "@shared/schema";
import { FileDropZone } from "@/components/file-drop-zone";
import {
  Dialog,
  DialogContent,
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
  const [showAddProfileForm, setShowAddProfileForm] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
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

  const profileForm = useForm<InsertProfile>({
    resolver: zodResolver(insertProfileSchema),
    defaultValues: { name: "", position: "", description: "", room: "", linkedin_url: "" },
  });

  const loadPage = useCallback(async (p: number) => {
    setLoadingProfiles(true);
    try {
      const { profiles: list, pagination: pag } = await getCommunityProfiles(p);
      setProfiles(list ?? []);
      setPagination(pag ?? null);
    } catch {
      setPagination(null);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const resetProfileForm = () => {
    profileForm.reset();
    setAvatarFile(null);
    setShowAddProfileForm(false);
  };

  const onSubmitProfile = async (data: InsertProfile) => {
    setProfileUploading(true);
    try {
      const body = new FormData();
      body.append("name", data.name);
      body.append("position", data.position);
      if (data.description) body.append("description", data.description);
      if (data.room) body.append("room", data.room);
      if (data.linkedin_url) body.append("linkedin_url", data.linkedin_url);
      if (avatarFile) body.append("avatar", avatarFile);

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session?.access_token) {
        throw new Error("Session expired — please log out and log in again.");
      }

      const { error: fnError } = await supabase.functions.invoke("community_add_profile", {
        body,
        headers: { Authorization: `Bearer ${refreshData.session.access_token}` },
      });
      if (fnError) throw fnError;

      resetProfileForm();
      toast({ title: "Profile created", description: `"${data.name}" has been added.` });
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
      setProfileUploading(false);
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
      const { profiles: next, pagination: pag } = await getCommunityProfiles(currentPage);
      setProfiles(next ?? []);
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
          <Button size="sm" onClick={() => setShowAddProfileForm((v) => !v)}>
            {showAddProfileForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showAddProfileForm ? "Cancel" : "Add Profile"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddProfileForm && (
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Founder & CEO" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="room"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Room 204" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="linkedin_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn URL <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief bio or description..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <p className="text-sm font-medium mb-2">Avatar <span className="text-muted-foreground">(optional)</span></p>
                  <FileDropZone
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    label="Upload profile photo"
                    file={avatarFile}
                    onChange={setAvatarFile}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetProfileForm} disabled={profileUploading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={profileUploading}>
                    {profileUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Add Profile"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {loadingProfiles ? (
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
        ) : !showAddProfileForm ? (
          <div className="text-center py-12">
            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mt-4">No profiles added yet</p>
            <p className="text-sm text-muted-foreground">Add member profiles to showcase your community.</p>
            <Button className="mt-4" onClick={() => setShowAddProfileForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Profile
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>

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
