"use client";
import { useState, useEffect } from "react";
import { supabase } from '../../../../lib/supabaseClient';
import { authServices } from "@/services/authServices";
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/dashboard');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error: authError } = await authServices.signUp({ email, password });
      if (authError) throw error;
      router.push('/dashboard');
    } catch (error: unknown) {
      setError(String(error));
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-white shadow-md rounded p-8">
        <h1 className="text-3xl font-bold font-playfair mb-6">Sign Up</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block mb-1 font-roboto" htmlFor="email">
              Email Address
            </label>
            <input
              required
              type="email"
              id="email"
              className="w-full border border-gray-300 p-2 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-roboto" htmlFor="password">
              Password
            </label>
            <input
              required
              type="password"
              id="password"
              className="w-full border border-gray-300 p-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-accent text-white py-2 rounded hover:bg-opacity-90 transition font-roboto"
          >
            Sign Up
          </button>
        </form>
        <p className="text-center mt-4 font-roboto">
          Already have an account?{" "}
          <a href="/sign-in" className="text-accent hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
