'use client';

import { ErrorBoundary } from './error-boundary';
import { Toaster } from "@/components/ui/toaster";

export function RootWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
      <Toaster />
    </ErrorBoundary>
  );
} 