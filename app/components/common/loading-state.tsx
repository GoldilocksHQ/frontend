'use client';

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function LoadingWrapper({ 
  isLoading, 
  children, 
  message, 
  className = "min-h-[200px]" 
}: LoadingWrapperProps) {
  if (isLoading) {
    return <LoadingState message={message} className={className} />;
  }
  return <>{children}</>;
} 