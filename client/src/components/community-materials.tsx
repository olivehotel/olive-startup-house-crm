import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  BookOpen,
  BookMarked,
  Presentation,
  Lightbulb,
  FileText,
  X,
  Loader2,
  Video,
  Link2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  COMMUNITY_DOCUMENTS_BUCKET,
  downloadCommunityDocumentFromStorage,
} from "@/lib/community-document-storage";
import type {
  InsertMaterial,
  MaterialTypeId,
  MaterialTypeValue,
  CommunityDocument,
  CommunityDocumentsPagination,
} from "@shared/schema";
import { insertMaterialSchema, materialTypes, materialTypeIds } from "@shared/schema";
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
import { getCommunityDocuments, editCommunityDocument, deleteCommunityDocument } from "@/actions/community";

const LINK_TYPE_ID: MaterialTypeId = materialTypeIds.link;
const DOCUMENT_TYPE_ID: MaterialTypeId = materialTypeIds.document;

const materialTypeConfig: Record<MaterialTypeId, { label: string; icon: React.ElementType; color: string }> = {
  [materialTypeIds.document]: { label: "Document", icon: FileText,    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  [materialTypeIds.slide]:    { label: "Slide",    icon: Presentation, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  [materialTypeIds.tip]:      { label: "Tip",      icon: Lightbulb,    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  [materialTypeIds.video]:    { label: "Video",    icon: Video,        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  [materialTypeIds.guide]:    { label: "Guide",    icon: BookMarked,   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  [materialTypeIds.rule]:     { label: "Rule",     icon: BookOpen,     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  [materialTypeIds.link]:     { label: "Link",     icon: Link2,        color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
};

const acceptByType: Record<MaterialTypeId, string> = {
  [materialTypeIds.document]: ".pdf,.doc,.docx,.xls,.xlsx,.xml",
  [materialTypeIds.slide]:    ".jpg,.jpeg,.png,.webp,.gif,.ppt,.pptx",
  [materialTypeIds.tip]:      ".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx",
  [materialTypeIds.video]:    ".mp4,.webm,.mov,.avi",
  [materialTypeIds.guide]:    ".pdf,.doc,.docx",
  [materialTypeIds.rule]:     ".pdf,.doc,.docx,.xls,.xlsx,.xml",
  [materialTypeIds.link]:     "",
};

function materialRowConfig(doc: CommunityDocument) {
  if (doc.type_id && materialTypeConfig[doc.type_id]) {
    return materialTypeConfig[doc.type_id];
  }
  const v = doc.type?.value;
  if (v && v in materialTypeIds) {
    return materialTypeConfig[materialTypeIds[v as MaterialTypeValue]];
  }
  return materialTypeConfig[materialTypeIds.document];
}

function isLinkDocument(doc: CommunityDocument): boolean {
  return doc.type?.value === "link" || doc.type_id === materialTypeIds.link;
}

function materialTypeIdForDoc(doc: CommunityDocument): MaterialTypeId {
  if (doc.type_id && materialTypeConfig[doc.type_id]) return doc.type_id;
  const v = doc.type?.value;
  if (v && v in materialTypeIds) return materialTypeIds[v as MaterialTypeValue];
  return materialTypeIds.document;
}

export function CommunityMaterials() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<CommunityDocument[]>([]);
  const [pagination, setPagination] = useState<CommunityDocumentsPagination | null>(null);
  const [page, setPage] = useState(1);
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  const [editingDoc, setEditingDoc] = useState<CommunityDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingDoc, setDeletingDoc] = useState<CommunityDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const form = useForm<InsertMaterial>({
    resolver: zodResolver(insertMaterialSchema),
    defaultValues: { title: "", description: "", type: DOCUMENT_TYPE_ID, url: "" },
  });

  const selectedType = form.watch("type") as MaterialTypeId;
  const isLinkType = selectedType === LINK_TYPE_ID;

  const loadPage = useCallback(async (p: number) => {
    setLoadingDocuments(true);
    try {
      const { documents: docs, pagination: pag } = await getCommunityDocuments(p);
      setDocuments(docs ?? []);
      setPagination(pag);
    } catch {
      setPagination(null);
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const resetForm = () => {
    form.reset();
    setMainFile(null);
    setShowAddForm(false);
  };

  const onSubmit = async (data: InsertMaterial) => {
    if (!isLinkType && !mainFile) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }
    if (isLinkType && !data.url) {
      toast({ title: "Please enter a URL", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("type_id", data.type);
      body.append("title", data.title);
      if (data.description) body.append("description", data.description);

      if (isLinkType) {
        body.append("link", data.url!);
      } else {
        body.append("file", mainFile!);
      }

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session?.access_token) {
        throw new Error("Session expired — please log out and log in again.");
      }

      const { error: fnError } = await supabase.functions.invoke("load_community_document", {
        body,
        headers: { Authorization: `Bearer ${refreshData.session.access_token}` },
      });
      if (fnError) throw fnError;

      resetForm();
      toast({ title: "Material uploaded", description: `"${data.title}" has been sent.` });
      if (page === 1) {
        await loadPage(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (doc: CommunityDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditDescription(doc.description ?? "");
    setEditLink((doc.link ?? doc.url) ?? "");
    setEditFile(null);
  };

  const saveEdit = async () => {
    if (!editingDoc) return;
    if (!editTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (isLinkDocument(editingDoc)) {
      const link = editLink.trim();
      if (!link) {
        toast({ title: "Please enter a URL", variant: "destructive" });
        return;
      }
      let urlOk = false;
      try {
        const u = new URL(link);
        urlOk = u.protocol === "http:" || u.protocol === "https:";
      } catch {
        urlOk = false;
      }
      if (!urlOk) {
        toast({ title: "Please enter a valid URL", variant: "destructive" });
        return;
      }
    }

    setSavingEdit(true);
    try {
      const fd = new FormData();
      fd.append("document_id", editingDoc.id);
      fd.append("title", editTitle.trim());
      if (editDescription.trim()) fd.append("description", editDescription.trim());
      if (isLinkDocument(editingDoc)) {
        fd.append("link", editLink.trim());
      } else if (editFile) {
        fd.append("file", editFile);
      }
      await editCommunityDocument(fd);
      toast({ title: "Material updated", description: `"${editTitle.trim()}" has been saved.` });
      setEditingDoc(null);
      setEditFile(null);
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
    if (!deletingDoc) return;
    setDeleting(true);
    try {
      await deleteCommunityDocument(deletingDoc.id);
      toast({ title: "Material deleted", description: `"${deletingDoc.title}" has been removed.` });
      setDeletingDoc(null);
      await loadPage(page);
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

  const handleDownloadMaterial = async (doc: CommunityDocument) => {
    if (!doc.file_path) return;
    setDownloadingId(doc.id);
    try {
      const result = await downloadCommunityDocumentFromStorage(
        supabase,
        COMMUNITY_DOCUMENTS_BUCKET,
        doc.file_path,
        doc.title,
      );
      if (!result.ok) {
        toast({ title: "Download failed", description: result.message, variant: "destructive" });
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Community Materials</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Rules, slides, and tips for residents</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {showAddForm ? "Cancel" : "Add Material"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="House Rules 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={(v) => { field.onChange(v); setMainFile(null); }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(materialTypes) as MaterialTypeId[]).map((id) => (
                              <SelectItem key={id} value={id}>
                                {materialTypeConfig[id].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isLinkType ? (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/resource" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div>
                    <p className="text-sm font-medium mb-2">File</p>
                    <FileDropZone
                      accept={acceptByType[selectedType]}
                      label={`Upload ${materialTypeConfig[selectedType].label.toLowerCase()} file`}
                      file={mainFile}
                      onChange={setMainFile}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief description visible to residents..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={uploading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      "Send Material"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {loadingDocuments ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length > 0 ? (
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {documents.map((doc) => {
              const config = materialRowConfig(doc);
              const Icon = config.icon;
              const href = doc.link ?? doc.url;
              const canDownloadFromStorage = !isLinkDocument(doc) && !!doc.file_path;
              const showExternalLink = !!href && (isLinkDocument(doc) || !doc.file_path);
              const isDownloading = downloadingId === doc.id;
              return (
                <div key={doc.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
                  <span className={`inline-flex items-center justify-center rounded-md p-2 flex-shrink-0 ${config.color}`}>
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <div
                    className={
                      canDownloadFromStorage
                        ? "min-w-0 flex-1 text-left cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        : "min-w-0 flex-1"
                    }
                    role={canDownloadFromStorage ? "button" : undefined}
                    tabIndex={canDownloadFromStorage ? 0 : undefined}
                    aria-busy={canDownloadFromStorage ? isDownloading : undefined}
                    aria-label={canDownloadFromStorage ? `Download ${doc.title}` : undefined}
                    onClick={
                      canDownloadFromStorage && !isDownloading
                        ? () => void handleDownloadMaterial(doc)
                        : undefined
                    }
                    onKeyDown={
                      canDownloadFromStorage && !isDownloading
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void handleDownloadMaterial(doc);
                            }
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Edit material"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(doc);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label="Delete material"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingDoc(doc);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {showExternalLink && href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors p-2"
                        aria-label="Open link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
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
          </div>
        ) : !showAddForm ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mt-4">No materials added yet</p>
            <p className="text-sm text-muted-foreground">Upload documents, slides, or tips for your residents.</p>
            <Button className="mt-4" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Material
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>

    <Dialog
      open={editingDoc !== null}
      onOpenChange={(open) => {
        if (!open) {
          setEditingDoc(null);
          setEditFile(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit material</DialogTitle>
        </DialogHeader>
        {editingDoc && (
          <div className="space-y-4 py-1">
            <div>
              <p className="text-sm font-medium mb-1.5">Title</p>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
            </div>
            {isLinkDocument(editingDoc) ? (
              <div>
                <p className="text-sm font-medium mb-1.5">URL</p>
                <Input value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="https://…" />
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium mb-2">Replace file <span className="text-muted-foreground font-normal">(optional)</span></p>
                <FileDropZone
                  accept={acceptByType[materialTypeIdForDoc(editingDoc)]}
                  label={`New ${materialTypeConfig[materialTypeIdForDoc(editingDoc)].label.toLowerCase()} file`}
                  file={editFile}
                  onChange={setEditFile}
                />
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description…"
                rows={2}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { setEditingDoc(null); setEditFile(null); }} disabled={savingEdit}>
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

    <AlertDialog open={deletingDoc !== null} onOpenChange={(open) => { if (!open) setDeletingDoc(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this material?</AlertDialogTitle>
          <AlertDialogDescription>
            {deletingDoc ? (
              <>This will remove &quot;{deletingDoc.title}&quot; from community materials. This cannot be undone.</>
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
