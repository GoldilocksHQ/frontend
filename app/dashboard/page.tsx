"use client";
import { useState } from "react";

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState("");

  const handleGenerateKey = async () => {
    // Suppose userId is from current session or local state
    const userId = "user_id";

    const res = await fetch ("/api/api-keys", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ action: "generate-key", userId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`New API key: ${data.apiKey}`);
      getApiKey();
    } else {
      alert(data.error);
    }
  };
  
  const getApiKey = async () => {
    const userId = "user_id";
    const res = await fetch(`/api/api-keys?user-id=${userId}`);
    const data = await res.json();
    if (res.ok) {
      setApiKey(data.apiKey);
    } else {
      alert(data.error);
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