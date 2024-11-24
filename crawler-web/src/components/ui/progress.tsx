// src/components/ui/progress.tsx
'use client';

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// 带提示的进度条组件
export function ProgressWithText({
  value,
  total,
  className,
  text,
}: {
  value: number;
  total: number;
  className?: string;
  text?: string;
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm text-gray-600">
        <span>{text || `${value} / ${total}`}</span>
        <span>{percentage}%</span>
      </div>
      <Progress value={percentage} />
    </div>
  );
}

export { Progress }