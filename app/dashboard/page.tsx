"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/services/supabase/client";
import { User } from "@supabase/supabase-js";
import { generateKey, getKey } from "../../services/supabase/server";
import { CardApiKey } from "./card-api-key";
import { Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Get initial user
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!currentUser) {
          router.push('/signin');
          return;
        }

        setUser(currentUser);

        // Get or generate API key
        const { data: keyData, error: keyError } = await getKey(currentUser.id);
        // if () throw keyError;

        if (!keyData || keyError) {
          const { data: newKey, error: genError } = await generateKey(currentUser.id);
          if (genError) throw genError;
          setApiKey(newKey?.[0]?.api_key || "");
        } else {
          setApiKey(keyData?.api_key || "");
        }

      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    // Cleanup subscription
    return () => {
      supabase.auth.onAuthStateChange(() => {});
    };
  }, [router, supabase]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

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
        <CardApiKey apiKey={apiKey}></CardApiKey>
      </div>
    </div>
  );
}