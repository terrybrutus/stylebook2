import { Button } from "@/components/ui/button";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Plus,
} from "lucide-react";
import { useCallback, useState } from "react";
import AppointmentModal from "../components/AppointmentModal";
import type { AppointmentModalState, CalendarView } from "../types";
import { DayView } from "./calendar/DayView";
import { MonthView } from "./calendar/MonthView";
import { WeekView } from "./calendar/WeekView";

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addWeeks(dateStr: string, n: number): string {
  return addDays(dateStr, n * 7);
}

function addMonths(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function formatDateHeader(view: CalendarView, dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (view === "day") {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (view === "week") {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function Calendar() {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const pathname = routerState.location.pathname;

  const view: CalendarView =
    pathname === "/calendar/day"
      ? "day"
      : pathname === "/calendar/month"
        ? "month"
        : "week";

  const [currentDate, setCurrentDate] = useState<string>(getTodayStr);
  const [modalState, setModalState] = useState<AppointmentModalState>({
    isOpen: false,
    mode: "create",
  });

  const handlePrev = useCallback(() => {
    if (view === "day") setCurrentDate((d) => addDays(d, -1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, -1));
    else setCurrentDate((d) => addMonths(d, -1));
  }, [view]);

  const handleNext = useCallback(() => {
    if (view === "day") setCurrentDate((d) => addDays(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  }, [view]);

  const handleToday = useCallback(() => {
    setCurrentDate(getTodayStr());
  }, []);

  const handleModalChange = useCallback((state: AppointmentModalState) => {
    setModalState(state);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalState((s) => ({ ...s, isOpen: false }));
  }, []);

  const handleDayClick = useCallback(
    (date: string) => {
      setCurrentDate(date);
      navigate({ to: "/calendar/day" });
    },
    [navigate],
  );

  const handleOpenCreate = useCallback(() => {
    setModalState({ isOpen: true, mode: "create", prefillDate: getTodayStr() });
  }, []);

  const d = new Date(`${currentDate}T00:00:00`);

  const viewTabs: {
    id: CalendarView;
    label: string;
    icon: React.ReactNode;
    to: string;
  }[] = [
    {
      id: "day",
      label: "Day",
      icon: <CalendarDays size={14} />,
      to: "/calendar/day",
    },
    {
      id: "week",
      label: "Week",
      icon: <CalendarRange size={14} />,
      to: "/calendar",
    },
    {
      id: "month",
      label: "Month",
      icon: <Grid3x3 size={14} />,
      to: "/calendar/month",
    },
  ];

  return (
    <div className="flex flex-col h-full" data-ocid="calendar.page">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border bg-card flex-shrink-0 flex-wrap gap-y-2">
        {/* View tabs */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => navigate({ to: tab.to })}
              data-ocid={`calendar.${tab.id}_tab`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrev}
            data-ocid="calendar.prev_button"
          >
            <ChevronLeft size={16} />
          </Button>
          <button
            type="button"
            className="text-sm font-semibold text-foreground px-2 py-1 rounded hover:bg-muted transition-colors min-w-[160px] text-center"
            onClick={handleToday}
            data-ocid="calendar.today_button"
          >
            {formatDateHeader(view, currentDate)}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
            data-ocid="calendar.next_button"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Today shortcut */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs ml-auto"
          onClick={handleToday}
          data-ocid="calendar.jump_today_button"
        >
          Today
        </Button>
      </div>

      {/* Calendar view — scrollable */}
      <div className="flex flex-1 overflow-hidden relative">
        {view === "day" && (
          <div className="flex flex-1 overflow-y-auto">
            <DayView date={currentDate} onModalChange={handleModalChange} />
          </div>
        )}
        {view === "week" && (
          <WeekView
            anchorDate={d}
            onModalChange={handleModalChange}
            onDayClick={handleDayClick}
          />
        )}
        {view === "month" && (
          <MonthView
            year={d.getFullYear()}
            month={d.getMonth()}
            onDayClick={handleDayClick}
            onModalChange={handleModalChange}
          />
        )}
      </div>

      {/* Floating action button */}
      <button
        type="button"
        className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 active:scale-95 transition-all md:bottom-6"
        onClick={handleOpenCreate}
        aria-label="New appointment"
        data-ocid="calendar.new_appointment_fab"
      >
        <Plus size={24} />
      </button>

      {/* Appointment modal */}
      <AppointmentModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        mode={modalState.mode}
        appointment={modalState.appointment}
        prefillDate={modalState.prefillDate}
        prefillTime={modalState.prefillTime}
      />
    </div>
  );
}
