'use client';
import React, { useState } from 'react';

export default function SignoutPage() {
  const [message, setMessage] = useState('');

  const handleLogout = async () => {
    const res = await fetch('/api/auth/signout', {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
      // Clear any tokens/cookies
    } else {
      setMessage(`Error: ${data.error}`);
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