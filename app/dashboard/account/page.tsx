"use client";

import React, { useState } from "react";
import { signOut } from "@/services/supabase/server";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
export default function AccountPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignout = async () => {
    setLoading(true);
    try {
      const { error: authError } = await signOut();
      if (authError) throw error;
      // Redirect to signin page after successful signout
      router.push('/signin');
      router.refresh();
    } catch (error: unknown) {
      setError(String(error));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Account</h2>
      </div>
      <Button onClick={handleSignout} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign Out"}</Button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
