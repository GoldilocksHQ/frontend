"use client";

import React, { useState } from "react";
import { authServices } from "@/services/authServices";

export default function AccountPage() {
  const [error, setError] = useState("");

  const handleSignout = async () => {
    try {
      const { error: authError } = await authServices.signOut();
      if (authError) throw error;
    } catch (error: unknown) {
      setError(String(error));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-playfair font-bold mb-4">Account</h1>
      <button
        onClick={handleSignout}
        className="bg-accent text-white py-2 px-6 rounded hover:bg-opacity-90 transition font-roboto"
      >
        Sign Out
      </button>
    </div>
  );
}
