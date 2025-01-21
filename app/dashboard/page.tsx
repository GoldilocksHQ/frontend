"use client";
import { useEffect, useState } from "react";
import { getUser } from '@/services/supabase/client';
import { User } from "@supabase/supabase-js";
import { CardApiKey } from "./card-api-key";
import { Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { APIKeyManager } from "../../lib/api-key-manager";

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [, setApiKeyManager] = useState<APIKeyManager | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        const user = await getUser();
        if (!user) {
          router.push('/signin');
          return;
        }
        setUser(user);
        const apiKeyManager = await APIKeyManager.getInstance();
        setApiKeyManager(apiKeyManager);
        setApiKey(apiKeyManager.getKey());
      } catch (error) {
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [router]);

  return loading ? (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ) : (
    <div className="flex-1 space-y-4 p-8 pt-6">
    <div className="flex items-center justify-between mb-4">

        <h2 className="text-3xl font-bold tracking-tight">Home</h2>
      </div>
      <div className="items-top justify-center mb-4 font-roboto">
        {error ? <div className="text-red-500">Error: {error}</div> : <CardApiKey apiKey={apiKey}></CardApiKey>}
      </div>
    </div>
  );
}