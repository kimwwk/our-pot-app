"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthSliderProps {
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
}

export function MonthSlider({ selectedMonth, onMonthChange }: MonthSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate 12 months: 6 before current, current, 5 after current
  const generateMonths = () => {
    const months: Date[] = [];
    const current = new Date();

    for (let i = -6; i <= 5; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() + i, 1);
      months.push(date);
    }

    return months;
  };

  const [months] = useState(generateMonths());

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  const formatYear = (date: Date) => {
    return date.getFullYear().toString();
  };

  const isSameMonth = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth()
    );
  };

  const isCurrentMonth = (date: Date) => {
    const now = new Date();
    return isSameMonth(date, now);
  };

  const handlePrevMonth = () => {
    const currentIndex = months.findIndex((m) => isSameMonth(m, selectedMonth));
    if (currentIndex > 0) {
      onMonthChange(months[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = months.findIndex((m) => isSameMonth(m, selectedMonth));
    if (currentIndex < months.length - 1) {
      onMonthChange(months[currentIndex + 1]);
    }
  };

  // Auto-scroll to selected month
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const selectedIndex = months.findIndex((m) => isSameMonth(m, selectedMonth));
    const selectedButton = container.children[selectedIndex] as HTMLElement;

    if (selectedButton) {
      selectedButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedMonth, months]);

  return (
    <div className="relative pt-4 pb-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth flex-1"
        >
          {months.map((month) => {
            const isSelected = isSameMonth(month, selectedMonth);
            const isCurrent = isCurrentMonth(month);

            return (
              <button
                key={month.toISOString()}
                onClick={() => onMonthChange(month)}
                className="flex flex-col items-center gap-1 shrink-0 group"
              >
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isSelected
                      ? "text-foreground font-bold"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {formatMonth(month)}
                </span>
                <span
                  className={cn(
                    "text-[10px] transition-colors",
                    isSelected
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  )}
                >
                  {formatYear(month)}
                </span>
                <div
                  className={cn(
                    "h-1 rounded-full transition-all",
                    isSelected
                      ? "w-6 bg-primary shadow-[0_0_10px_rgba(19,236,91,0.5)]"
                      : isCurrent
                      ? "w-1.5 bg-muted-foreground/30"
                      : "w-1 bg-transparent group-hover:bg-muted-foreground/20"
                  )}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
