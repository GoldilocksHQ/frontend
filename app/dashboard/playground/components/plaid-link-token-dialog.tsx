"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlaidLinkError, usePlaidLink } from 'react-plaid-link';

export function PlaidLinkTokenDialog({
  open,
  onOpenChange,
  onSuccess,
  onExit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (publicToken: string) => void;
  onExit: (error: PlaidLinkError | null) => void;
}) {
  const [linkToken, setLinkToken] = useState('');
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);

  const { open: openPlaidLink, ready } = usePlaidLink({
    token: submittedToken,
    onSuccess,
    onExit,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkToken) {
      setSubmittedToken(linkToken);
    }
  };

  // Open Plaid link when token is submitted and ready
  useEffect(() => {
    if (submittedToken && ready) {
      openPlaidLink();
      onOpenChange(false);
    }
  }, [submittedToken, ready, openPlaidLink, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Plaid Link Token</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Paste link token here"
            value={linkToken}
            onChange={(e) => setLinkToken(e.target.value)}
          />
          <Button type="submit" className="w-full">
            Submit Token
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 