"use client";
import { signOut } from "@/services/auth";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function SignoutPage() {
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogout = async () => {
    const {error} = await signOut();
    if (error) {
      setMessage(String(error));
      // Clear any tokens/cookies
    } else {
      setMessage("Signout successful");
      // Redirect to signin page after successful signout
      router.push('/dashboard/signin');
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