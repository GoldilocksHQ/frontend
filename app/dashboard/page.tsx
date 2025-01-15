"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient"
import { User } from "@supabase/supabase-js";
import { generateKey, getKey } from "../../services/apiKeyServices";

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUser();
  });

  const getUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      alert(error.message);
      setError(error.message);
      return;
    }
    setUser(user);
    checkUserDetail();
  }

  function checkUserDetail() {
    if (!user) {
      setError("You must be signed in to generate an API key.");
      return
    }
    
    const userId = user.id
    if (!userId) {
      setError("User ID not found");
      return
    }

    setError(null);
  }
  

  const handleGenerateKey = async () => {
    // Suppose userId is from current session or local state
    if (error) {
      alert(error);
      return;
    }
    const userId = user!.id;
    const {data, error: apiError} = await generateKey(userId);

    if (apiError) {
      alert(`Error: ${apiError}`);
      return;
    } else {
      if (!data) {
        alert("No API key found");
        return;
      }
      alert("New API key created");
      setApiKey(data[0].api_key);
    }

    // const res = await fetch ("/api/api-keys", {
    //   method: "POST",
    //   headers: {"Content-Type": "application/json"},
    //   body: JSON.stringify({ action: "generate-key", userId }),
    // });
    // const data = await res.json();
    // if (res.ok) {
    //   alert(`New API key: ${data.apiKey}`);
    //   getApiKey();
    // } else {
    //   alert(data.error);
    // }
  };
  
  const getApiKey = async () => {
    if (!user) {
      alert("You must be signed in to generate an API key.");
      return;
    }
    
    const userId = user.id
    if (!userId) {
      alert("User ID not found");
      return;
    }
     
    const {data, error} = await getKey(userId);
    if (error) {
      alert(`Error: ${error}`);
      return;
    } else {
      if (!data) {
        alert("No API key found");
        return;
      }
      alert(`API key: ${data[0].api_key}`);
      setApiKey(data[0].api_key);
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={handleGenerateKey}>Generate API Key</button>
      <button onClick={getApiKey}>Get My Keys</button>
      <ul>
        <li className="api-key">
          API Key: {apiKey}
        </li>
      </ul>
    </div>
  );
};