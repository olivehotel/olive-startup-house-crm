import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { eachDayOfInterval, format, isSameDay, isWeekend } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronsDownUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  type CheckerboardBed,
  type CheckerboardBooking,
  type CheckerboardLocation,
  type CheckerboardModel,
  type CheckerboardRoomGroup,
  type CheckerboardViewMode,
  formatRangeTitle,
  navigateAnchor,
  occupancyForDay,
  overlapsCalendarDay,
  viewRange,
} from "@/lib/checkerboard-api";

const LABEL_W = 240;
const MIN_DAY_PX = 36;
/** Month view: floor width so the strip is wider than typical main column (~1400px), forcing horizontal scroll for all days. */
const MONTH_TABLE_MIN_WIDTH = 1500;

export type EcoSmartCheckerboardProps = {
  anchor: Date;
  view: CheckerboardViewMode;
  location: CheckerboardLocation;
  onAnchorChange: Dispatch<SetStateAction<Date>>;
  onViewChange: Dispatch<SetStateAction<CheckerboardViewMode>>;
  onLocationChange: Dispatch<SetStateAction<CheckerboardLocation>>;
  data: CheckerboardModel | undefined;
  isLoading: boolean;
  error: Error | null;
};

function bookingSpanInView(
  booking: CheckerboardBooking,
  days: Date[],
): { startI: number; endI: number } | null {
  let startI = -1;
  let endI = -1;
  days.forEach((d, i) => {
    if (overlapsCalendarDay(booking, d)) {
      if (startI === -1) startI = i;
      endI = i;
    }
  });
  if (startI === -1) return null;
  return { startI, endI };
}

function bedHasActiveBookingInRange(bed: CheckerboardBed, days: Date[]): boolean {
  return bed.bookings.some((b) => days.some((d) => overlapsCalendarDay(b, d)));
}

function bookingStatusDisplay(b: CheckerboardBooking): string {
  if (b.statusLabel?.trim()) return b.statusLabel.trim();
  return b.variant === "pending" ? "Pending" : "Confirmed";
}

function dashOr(value?: string | null): string {
  const s = value?.trim();
  return s ? s : "—";
}

function BookingInfoHover({
  booking,
  roomTitle,
  bedName,
  barTint,
}: {
  booking: CheckerboardBooking;
  roomTitle: string;
  bedName: string;
  /** Text color on the white (i) badge so it matches green vs amber bars */
  barTint: "emerald" | "amber";
}) {
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  const rows: { label: string; value: string }[] = [
    { label: "ID", value: String(booking.id) },
    { label: "Full Name", value: booking.guestName },
    { label: "Phone Number", value: dashOr(booking.phone) },
    { label: "Status", value: bookingStatusDisplay(booking) },
    { label: "Check-In Date", value: fmt(booking.start) },
    { label: "Check-Out Date", value: fmt(booking.end) },
    {
      label: "Number of Guests",
      value: booking.guestCount != null ? String(booking.guestCount) : "—",
    },
    { label: "Room", value: bedName },
    { label: "Category", value: roomTitle },
    { label: "Tariff", value: "—" },
    { label: "Sum to pay", value: dashOr(booking.tariffSummary) },
    { label: "Paid", value: dashOr(booking.paidSummary) },
    { label: "Debt", value: dashOr(booking.debtSummary) },
  ];

  const tintClass =
    barTint === "amber"
      ? "text-amber-800 dark:text-amber-950"
      : "text-emerald-800 dark:text-emerald-950";

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-semibold leading-none shadow-sm",
            "hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
            tintClass,
          )}
          aria-label="Booking information"
          onPointerDown={(e) => e.stopPropagation()}
        >
          i
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        sideOffset={6}
        className={cn(
          "w-80 max-h-[min(70vh,28rem)] overflow-y-auto border p-0 shadow-xl",
          "rounded-xl border-white/50 bg-white/80 text-foreground backdrop-blur-[10px]",
          "dark:border-border/60 dark:bg-background/80 dark:backdrop-blur-[10px]",
        )}
      >
        <div className="border-b border-border/40 px-3 py-2 dark:border-border/50">
          <p className="text-sm font-semibold text-foreground">Information</p>
        </div>
        <div className="space-y-1.5 px-3 py-2.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,46%)_minmax(0,54%)] gap-x-2 gap-y-0.5 text-xs leading-snug"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="text-right font-medium text-foreground break-words">{row.value}</span>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function EcoSmartCheckerboard({
  anchor,
  view,
  location,
  onAnchorChange,
  onViewChange,
  onLocationChange,
  data,
  isLoading,
  error,
}: EcoSmartCheckerboardProps) {
  const days = useMemo(() => {
    const { from, to } = viewRange(anchor, view);
    return eachDayOfInterval({ start: from, end: to });
  }, [anchor, view]);

  const numDays = days.length;

  const today = new Date();
  const todayIndex = days.findIndex((d) => isSameDay(d, today));

  const { gridTemplate, tableWidth, dayColPx } = useMemo(() => {
    const natural = LABEL_W + numDays * MIN_DAY_PX;
    const targetWidth =
      view === "month" ? Math.max(natural, MONTH_TABLE_MIN_WIDTH) : natural;
    const dayPx = Math.max(
      MIN_DAY_PX,
      Math.ceil((targetWidth - LABEL_W) / Math.max(numDays, 1)),
    );
    const tw = LABEL_W + numDays * dayPx;
    return {
      gridTemplate: `${LABEL_W}px repeat(${numDays}, ${dayPx}px)`,
      tableWidth: tw,
      dayColPx: dayPx,
    };
  }, [view, numDays]);

  const locationTabTriggerClassName = cn(
    "rounded-md border border-transparent bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-none ring-offset-background transition-colors",
    "data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  );

  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 overflow-hidden rounded-t-xl p-4 border-b border-border bg-muted/20">
          <div className="flex w-full justify-start">
            <Tabs
              value={location}
              onValueChange={(v) => v && onLocationChange(v as CheckerboardLocation)}
            >
              <TabsList className="h-auto w-fit justify-start gap-2 bg-transparent p-0 text-muted-foreground">
                <TabsTrigger value="mp" className={locationTabTriggerClassName}>
                  Menlo Park
                </TabsTrigger>
                <TabsTrigger value="pa" className={locationTabTriggerClassName}>
                  Palo Alto
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onAnchorChange((a) => navigateAnchor(a, view, -1))}
                aria-label="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[200px] text-center text-sm font-semibold tabular-nums">
                {formatRangeTitle(anchor, view)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onAnchorChange((a) => navigateAnchor(a, view, 1))}
                aria-label="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => onAnchorChange(new Date())}
              >
                Today
              </Button>
            </div>

            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && onViewChange(v as CheckerboardViewMode)}
              variant="outline"
              size="sm"
              className="justify-end"
            >
              <ToggleGroupItem value="week" aria-label="Week view">
                WEEK
              </ToggleGroupItem>
              <ToggleGroupItem value="month" aria-label="Month view">
                MONTH
              </ToggleGroupItem>
              <ToggleGroupItem value="3month" aria-label="Three month view">
                3 MONTHS
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-destructive">
            {String((error as Error).message).includes("401") ||
            String((error as Error).message).includes("403")
              ? "Unable to load checkerboard (sign in or check permissions)."
              : `Could not load checkerboard: ${(error as Error).message}`}
          </div>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-visible overscroll-x-contain touch-pan-x">
            <div style={{ width: tableWidth, minWidth: tableWidth }}>
              {/* Header */}
              <div
                className="grid border-b border-border bg-background"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div
                  className="sticky left-0 z-40 flex items-end border-r border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground"
                  style={{ width: LABEL_W, minWidth: LABEL_W }}
                >
                  Rooms
                </div>
                {days.map((d) => {
                  const weekend = isWeekend(d);
                  const isToday = todayIndex >= 0 && isSameDay(d, today);
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "border-l border-border/60 px-0.5 py-2 text-center text-[11px] leading-tight",
                        weekend && "bg-muted/40",
                        isToday && "bg-primary/10",
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        {isToday && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                            aria-hidden
                          />
                        )}
                        <div
                          className={cn(
                            "font-semibold tabular-nums",
                            isToday && "text-primary",
                          )}
                        >
                          {format(d, "d")}
                        </div>
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {format(d, "EEE")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !data?.rooms.length ? (
                <div className="space-y-2 p-8 text-center text-sm text-muted-foreground max-w-md mx-auto">
                  <p className="font-medium text-foreground">No rooms for this period</p>
                  <p>
                    Try another location (MP or PA), move to a different week or month, or widen the
                    date range. If you expect data here, the API response shape may not match the
                    app (check the Network tab in dev tools).
                  </p>
                  {import.meta.env.DEV && (
                    <p className="text-xs text-muted-foreground/90 pt-2">
                      Dev: console may list top-level JSON keys from the last response.
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {data.rooms.map((room) => (
                    <RoomBlock
                      key={room.id}
                      room={room}
                      days={days}
                      gridTemplate={gridTemplate}
                      dayColPx={dayColPx}
                      todayIndex={todayIndex}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoomBlock({
  room,
  days,
  gridTemplate,
  dayColPx,
  todayIndex,
}: {
  room: CheckerboardRoomGroup;
  days: Date[];
  gridTemplate: string;
  dayColPx: number;
  todayIndex: number;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="grid border-b border-border" style={{ gridTemplateColumns: gridTemplate }}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="sticky left-0 z-40 flex items-center gap-2 border-r border-border bg-background px-2 py-2 text-left text-sm font-medium hover:bg-muted"
            style={{ width: LABEL_W, minWidth: LABEL_W }}
          >
            <ChevronsDownUp
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
            />
            <span className="truncate">{room.title}</span>
          </button>
        </CollapsibleTrigger>
        {days.map((d) => {
          const { occupied, total } = occupancyForDay(room.beds, d);
          const weekend = isWeekend(d);
          return (
            <div
              key={`h-${room.id}-${d.toISOString()}`}
              className={cn(
                "flex items-center justify-center border-l border-border/60 py-2 text-[11px] tabular-nums",
                weekend && "bg-muted/40",
              )}
            >
              <span className="text-muted-foreground">
                {total === 0 ? "—" : `${occupied}/${total}`}
              </span>
            </div>
          );
        })}
      </div>

      <CollapsibleContent>
        {room.beds.map((bed) => (
          <BedRow
            key={bed.id}
            bed={bed}
            roomTitle={room.title}
            days={days}
            gridTemplate={gridTemplate}
            dayColPx={dayColPx}
            todayIndex={todayIndex}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function BedRow({
  bed,
  roomTitle,
  days,
  gridTemplate,
  dayColPx,
  todayIndex,
}: {
  bed: CheckerboardBed;
  roomTitle: string;
  days: Date[];
  gridTemplate: string;
  dayColPx: number;
  todayIndex: number;
}) {
  const activeInView = bedHasActiveBookingInRange(bed, days);
  const occupied =
    typeof bed.occupied === "boolean" ? bed.occupied : activeInView;

  return (
    <div
      className="grid border-b border-border/80"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div
        className="sticky left-0 z-40 flex items-center gap-2 border-r border-border bg-background px-3 py-1.5 text-sm"
        style={{ width: LABEL_W, minWidth: LABEL_W }}
      >
        <span
          className={cn(
            "inline-block h-2 w-2 shrink-0 rounded-full",
            occupied ? "bg-emerald-500" : "bg-muted-foreground/30",
          )}
          aria-hidden
        />
        <span className="truncate text-muted-foreground">{bed.name}</span>
      </div>

      <div className="relative min-h-[40px]" style={{ gridColumn: "2 / -1" }}>
        <TimelineInner
          days={days}
          bookings={bed.bookings}
          roomTitle={roomTitle}
          bedName={bed.name}
          todayIndex={todayIndex}
          dayColPx={dayColPx}
        />
      </div>
    </div>
  );
}

function TimelineInner({
  days,
  bookings,
  roomTitle,
  bedName,
  todayIndex,
  dayColPx,
}: {
  days: Date[];
  bookings: CheckerboardBooking[];
  roomTitle: string;
  bedName: string;
  todayIndex: number;
  dayColPx: number;
}) {
  const numDays = days.length;

  return (
    <div
      className="relative grid h-full min-h-[40px]"
      style={{
        gridTemplateColumns: `repeat(${numDays}, ${dayColPx}px)`,
      }}
    >
      {days.map((d) => {
        const weekend = isWeekend(d);
        return (
          <div
            key={d.toISOString()}
            className={cn("border-l border-border/50", weekend && "bg-muted/25")}
          />
        );
      })}

      {todayIndex >= 0 && (
        <div
          className="pointer-events-none absolute bottom-0 top-0 z-[11] w-px bg-primary shadow-[0_0_0_1px_hsl(var(--background))]"
          style={{
            left: `calc(${(todayIndex + 0.5) / numDays} * 100%)`,
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-[12] px-0.5 py-1">
        {bookings.map((b) => {
          const span = bookingSpanInView(b, days);
          if (!span) return null;
          const { startI, endI } = span;
          const left = (startI / numDays) * 100;
          const width = ((endI - startI + 1) / numDays) * 100;
          const isPending =
            b.variant === "pending" || /create/i.test(b.statusLabel ?? "");
          return (
            <div
              key={b.id}
              className={cn(
                "pointer-events-auto absolute top-1 flex h-7 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-md px-1.5 text-[10px] font-medium leading-tight text-white shadow-sm",
                isPending ? "bg-amber-500/90" : "bg-emerald-600/90",
              )}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                minWidth: 4,
              }}
            >
              <span className="min-w-0 flex-1 truncate">{b.guestName}</span>
              <BookingInfoHover
                booking={b}
                roomTitle={roomTitle}
                bedName={bedName}
                barTint={isPending ? "amber" : "emerald"}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
