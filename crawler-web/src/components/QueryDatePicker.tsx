// src/components/QueryDatePicker.tsx
'use client';

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QueryDatePickerProps {
  date: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
}

export function QueryDatePicker({ date, onChange, disabled }: QueryDatePickerProps) {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        查询日期
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "yyyy年MM月dd日") : <span>选择日期</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onChange}
            disabled={(date) => date > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {date && !disabled && (
        <Button 
          variant="ghost" 
          className="w-full"
          onClick={() => onChange(new Date())}
        >
          重置为当前时间
        </Button>
      )}
    </div>
  );
}