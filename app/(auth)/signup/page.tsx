"use client";
import { authServices } from "@/services/authServices";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async () => {
    const {error} = await authServices.signUp({ email, password });
    if (error) {
      setError(String(error));
    } else {
      setSuccess("Sigup successful");
    }
  };
      

    // try {
    //   const res = await fetch("/api/auth", {
    //     method: "POST",
    //     headers: {"Content-Type": "application/json"},
    //     body: JSON.stringify({ action: "signup", email, password }),
    //   });
    //   const data = await res.json();
    //   if (!res.ok) throw new Error(data.error);
    //   setSuccess("Signup successful");
    // }catch (error: unknown) {
    //   setError(error instanceof Error ? error.message : "An unknown error occurred");
    // }
  // };

  return (
    <div>
      <h1>Signup</h1>
      {error && <p style={{color:'red'}}>{error}</p>}
      {success && <p style={{color:'green'}}>{success}</p>}
      <input 
        type="email" 
        placeholder="Email" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
      />
      <input 
        type="password" 
        placeholder="Password" 
        value={password} 
        onChange={e => setPassword(e.target.value)} 
      />
      <button onClick={handleSignup}>Signup</button>
    </div>
  );
};