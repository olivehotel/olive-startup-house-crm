import { useRef } from "react";
import { Upload, File, X } from "lucide-react";

interface FileDropZoneProps {
  accept: string;
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}

export function FileDropZone({ accept, label, file, onChange }: FileDropZoneProps) {
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
