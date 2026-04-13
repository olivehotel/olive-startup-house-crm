import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_LEN = 48;

const MAX_W_DEFAULT = "max-w-[min(220px,100%)]";
const MAX_W_COMPACT = "max-w-[min(140px,100%)]";
/** Wider cap for centered mobile cards so email truncates within the card. */
const MAX_W_COMPACT_CENTER = "max-w-full";

const LINE_CLAMP_CLASSES: Record<2 | 3 | 4 | 5 | 6, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
};

type TruncatedCellProps = {
  value?: string | null;
  /** Show tooltip + info icon when text is longer than this. */
  maxLength?: number;
  /** When set, any non-empty value uses tooltip + (i); hover shows full text (e.g. Location). */
  alwaysTooltip?: boolean;
  /** Narrower max width for dense tables. */
  compact?: boolean;
  /** Center content (e.g. mobile cards). */
  align?: "left" | "center";
  /**
   * Multiline clamp instead of single-line ellipsis (e.g. message_text).
   * Use with break-words so long unbroken strings do not overflow the card.
   */
  lineClamp?: 2 | 3 | 4 | 5 | 6;
  /** Multiline only: paragraph alignment (`start` = left, recommended for body text). */
  alignContent?: "center" | "start";
  /** Prefer `break-all` for long tokens (e.g. addresses). */
  breakTokens?: boolean;
  className?: string;
};

export function TruncatedCell({
  value,
  maxLength = DEFAULT_MAX_LEN,
  alwaysTooltip = false,
  compact = false,
  align = "left",
  lineClamp,
  alignContent,
  breakTokens = false,
  className,
}: TruncatedCellProps) {
  const text = value?.trim() ?? "";
  if (!text) {
    return (
      <span
        className={cn(
          "text-muted-foreground",
          align === "center" && "block text-center",
          className,
        )}
      >
        —
      </span>
    );
  }

  const widthCap = compact
    ? align === "center"
      ? MAX_W_COMPACT_CENTER
      : MAX_W_COMPACT
    : MAX_W_DEFAULT;
  const useTooltip = alwaysTooltip || text.length > maxLength;

  const multiline = lineClamp != null;
  const clampClass = multiline ? LINE_CLAMP_CLASSES[lineClamp] : null;
  const breakClass = breakTokens ? "break-all" : "break-words";

  if (multiline) {
    const multilineAlign =
      alignContent === "center"
        ? "text-center"
        : "text-left";

    const rowJustify =
      alignContent === "center" ? "justify-center" : "justify-start";

    const multilinePlain = (
      <span
        className={cn(
          "box-border block w-full min-w-0 max-w-full overflow-hidden whitespace-normal px-1",
          breakClass,
          clampClass,
          multilineAlign,
          widthCap,
          className,
        )}
      >
        {text}
      </span>
    );

    if (!useTooltip) {
      return multilinePlain;
    }

    const multilineWithInfo = (
      <span
        className={cn(
          "box-border inline-flex w-full min-w-0 max-w-full cursor-default items-start gap-1.5 px-1",
          rowJustify,
          widthCap,
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 overflow-hidden whitespace-normal",
            breakClass,
            clampClass,
            multilineAlign,
          )}
        >
          {text}
        </span>
        <Info
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </span>
    );

    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{multilineWithInfo}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-md whitespace-pre-wrap break-words text-left"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!useTooltip) {
    return (
      <span
        className={cn(
          "block truncate",
          breakClass,
          widthCap,
          align === "center" && "mx-auto w-full min-w-0 max-w-full text-center",
          className,
        )}
        title={text}
      >
        {text}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 min-w-0 max-w-full cursor-default",
            align === "center"
              ? "w-full justify-center overflow-hidden text-center"
              : "text-left",
            widthCap,
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 shrink truncate text-left",
              breakClass,
            )}
          >
            {text}
          </span>
          <Info
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-md whitespace-pre-wrap break-words text-left"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
