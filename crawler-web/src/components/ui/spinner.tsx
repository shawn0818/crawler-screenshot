// src/components/ui/spinner.tsx
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-3",
  lg: "h-12 w-12 border-4",
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export function LoadingOverlay({ message = "加载中..." }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center space-y-4 p-8 rounded-lg">
        <Spinner size="lg" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  )
}

// 带有进度显示的加载遮罩
export function LoadingOverlayWithProgress({
  current,
  total,
  message = "加载中...",
}) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center space-y-4 p-8 rounded-lg">
        <Spinner size="lg" />
        <p className="text-gray-600 font-medium">{message}</p>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{current}/{total}</span>
          <span className="text-sm text-gray-500">({percentage}%)</span>
        </div>
      </div>
    </div>
  );
}