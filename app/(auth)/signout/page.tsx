"use client";
import { authServices } from "@/services/authServices";
import React, { useState } from "react";

export default function SignoutPage() {
  const [message, setMessage] = useState("");

  const handleLogout = async () => {
    const {error} = await authServices.signOut();
    if (error) {
      setMessage(String(error));
      // Clear any tokens/cookies
    } else {
      setMessage("Signout successful");
    }
  };

  return (
    <div>
      <h1>Logout</h1>
      <button onClick={handleLogout}>Log Out</button>
      <p>{message}</p>
    </div>
  );
}