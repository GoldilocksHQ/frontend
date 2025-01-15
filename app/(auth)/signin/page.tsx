"use client";
import { useState } from "react";
import { authServices } from "@/services/authServices";

export default function SigninPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    const {error} = await authServices.signIn({ email, password });
    if (error) {
      setError(String(error));
    } else {
      setMessage("Sigin successful");
    }
  };

  return (
    <div>
      <h1>Login</h1>
      {error && <p style={{color:'red'}}>{error}</p>}
      {message && <p style={{color:'green'}}>{message}</p>}
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
      <button onClick={handleLogin}>Signin</button>
    </div>
  );
}