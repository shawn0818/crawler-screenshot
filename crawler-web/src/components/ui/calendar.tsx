// src/components/ui/calendar.tsx
"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7 gap-0",
        head_cell: "w-9 text-center text-slate-500 text-[0.8rem] font-normal dark:text-slate-400",
        row: "grid grid-cols-7 gap-0 mt-2",
        cell: "w-9 relative p-0 text-center",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected: cn(
          "bg-slate-900 text-slate-50",
          "hover:bg-slate-900 hover:text-slate-50",
          "focus:bg-slate-900 focus:text-slate-50",
          "dark:bg-slate-50 dark:text-slate-900",
          "dark:hover:bg-slate-50 dark:hover:text-slate-900",
          "dark:focus:bg-slate-900 focus:text-slate-50"
        ),
        day_today: cn(
          "bg-slate-100 text-slate-900",
          "dark:bg-slate-800 dark:text-slate-50"
        ),
        day_outside: cn(
          "text-slate-500 opacity-50",
          "dark:text-slate-400"
        ),
        day_disabled: "text-slate-500 opacity-50 dark:text-slate-400",
        day_range_middle: cn(
          "aria-selected:bg-slate-100 aria-selected:text-slate-900",
          "dark:aria-selected:bg-slate-800 dark:aria-selected:text-slate-50"
        ),
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        NextMonthButton: () => <ChevronRightIcon className="h-4 w-4" />,
        PreviousMonthButton: () => <ChevronLeftIcon className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }