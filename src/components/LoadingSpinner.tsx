import React from 'react'
import { cn } from '../lib/utils'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = 'Loading...',
  className
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen bg-background", className)}>
      <div className={cn(
        "animate-spin rounded-full border-4 border-border border-t-primary",
        sizeClasses[size]
      )}></div>
      {message && (
        <p className="mt-4 text-muted-foreground text-sm">{message}</p>
      )}
    </div>
  )
}
