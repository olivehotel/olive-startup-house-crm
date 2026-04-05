import { useState, useRef } from "react";
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
  Upload,
  Loader2,
  File,
  Video,
  Link2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { InsertMaterial, MaterialTypeId } from "@shared/schema";
import { insertMaterialSchema, materialTypes } from "@shared/schema";

const LINK_TYPE_ID: MaterialTypeId = "b6a97d5b-20a5-4cfb-969b-c626e10e2f6d";
const DOCUMENT_TYPE_ID: MaterialTypeId = "113d2721-9243-4bff-9b8a-145a878456d4";

const materialTypeConfig: Record<MaterialTypeId, { label: string; icon: React.ElementType; color: string }> = {
  "113d2721-9243-4bff-9b8a-145a878456d4": { label: "Document", icon: FileText,    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  "72c083ba-6501-4f81-996b-6c488f5db458": { label: "Slide",    icon: Presentation, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "80a1eece-e2ed-45a4-95e3-f431e56f8678": { label: "Tip",      icon: Lightbulb,    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "a1a8348c-69cd-4b9f-9a9f-56da587fcc78": { label: "Video",    icon: Video,        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  "f29c05ef-25ea-4a12-96e8-e9a4aa54b637": { label: "Guide",    icon: BookMarked,   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "f7653665-11dc-4044-a3db-75b0e24398b1": { label: "Rule",     icon: BookOpen,     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  "b6a97d5b-20a5-4cfb-969b-c626e10e2f6d": { label: "Link",     icon: Link2,        color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
};

const acceptByType: Record<MaterialTypeId, string> = {
  "113d2721-9243-4bff-9b8a-145a878456d4": ".pdf,.doc,.docx,.xls,.xlsx,.xml",
  "72c083ba-6501-4f81-996b-6c488f5db458": ".jpg,.jpeg,.png,.webp,.gif,.ppt,.pptx",
  "80a1eece-e2ed-45a4-95e3-f431e56f8678": ".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx",
  "a1a8348c-69cd-4b9f-9a9f-56da587fcc78": ".mp4,.webm,.mov,.avi",
  "f29c05ef-25ea-4a12-96e8-e9a4aa54b637": ".pdf,.doc,.docx",
  "f7653665-11dc-4044-a3db-75b0e24398b1": ".pdf,.doc,.docx,.xls,.xlsx,.xml",
  "b6a97d5b-20a5-4cfb-969b-c626e10e2f6d": "",
};

function FileDropZone({
  accept,
  label,
  file,
  onChange,
}: {
  accept: string;
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          <File className="h-4 w-4 text-primary" />
          <span className="font-medium truncate max-w-[200px]">{file.name}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Upload className="h-5 w-5" />
          <p className="text-sm">{label}</p>
          <p className="text-xs">{accept.replaceAll(",", " ")}</p>
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mainFile, setMainFile] = useState<File | null>(null);

  const form = useForm<InsertMaterial>({
    resolver: zodResolver(insertMaterialSchema),
    defaultValues: { title: "", description: "", type: DOCUMENT_TYPE_ID, url: "" },
  });

  const selectedType = form.watch("type") as MaterialTypeId;
  const isLinkType = selectedType === LINK_TYPE_ID;

  const resetForm = () => {
    form.reset();
    setMainFile(null);
    setShowAddForm(false);
  };

  const onSubmit = async (data: InsertMaterial) => {
    console.log(data, "data");
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

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Community Hub</h1>
          <p className="text-muted-foreground">Co-living & co-working engagement and post-sale CRM</p>
        </div>
      </div>

      {/* Community Materials */}
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
        <CardContent>
          {showAddForm ? (
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
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mt-4">No materials added yet</p>
              <p className="text-sm text-muted-foreground">Upload documents, slides, or tips for your residents.</p>
              <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Material
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
