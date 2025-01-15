"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { generateKey, getKey } from "../../../services/apiKeyServices";
import { CardApiKey } from "./card-api-key"

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [, setUser] = useState<User | null>(null);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
     try {
        const { data: {user }, error: userError} = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(user);

        if (user) {
          const { data: keyData, error: keyError } = await getKey(user.id);
          if (keyError) throw keyError;

          if (!keyData || keyData.length === 0) {
            const { data: newKey, error: genError } = await generateKey(user.id);
            if (genError) throw genError;
            setApiKey(newKey?.[0]?.api_key || "");
        } else {
          setApiKey(keyData[0]?.api_key || "");
        }
     }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    }
  };
  
    initializeData();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Home</h2>
      </div>
      <div className="items-top justify-center p-4 mb-4 font-roboto">
        <CardApiKey apiKey={apiKey}></CardApiKey>
      </div>
    </div>
  );
}
