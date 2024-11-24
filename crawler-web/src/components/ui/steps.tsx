import * as React from "react"
import { CheckIcon } from 'lucide-react'
import { cn } from "@/lib/utils"

export interface Step {
  id: number
  title: string
  description?: string
}

interface StepsProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Steps({ steps, currentStep, className }: StepsProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full overflow-auto", className)}>
      <ol className="flex items-center space-x-2 md:space-x-4 lg:space-x-8">
        {steps.map((step, stepIdx) => (
          <li key={step.title} className="relative flex-1">
            {stepIdx !== steps.length - 1 && (
              <div className="absolute top-4 left-0 -right-4 md:-right-8 lg:-right-12 h-0.5 w-full">
                <div
                  className="h-full bg-muted transition-all duration-500 ease-in-out"
                  style={{
                    width: step.id <= currentStep ? "100%" : "0%",
                  }}
                />
              </div>
            )}
            <div className="relative flex flex-col items-center group">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  step.id < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.id === currentStep
                    ? "border-primary text-primary"
                    : "border-muted-foreground text-muted-foreground"
                )}
                aria-current={step.id === currentStep ? "step" : undefined}
              >
                {step.id < currentStep ? (
                  <CheckIcon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="mt-2 w-20 md:w-32 text-center">
                <span
                  className={cn(
                    "text-xs md:text-sm font-medium block",
                    step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1 hidden md:block md:line-clamp-2">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}