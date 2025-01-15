"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
// import { authServices } from "../../../../services/authServices";

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true)
    setError("");

    try {
      // const {data, error} = await authServices.signIn({
      const {data, error: authError} = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(String(authError));
        return;
      }

      if (data) {
        router.push("/dashboard");
      }

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Sign in failed")
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-white shadow-md rounded p-8">
        <h1 className="text-3xl font-bold font-playfair mb-6">Sign In</h1>
        <form onSubmit={handleSignin} className="space-y-4">
          <div className="form-group">
            <label 
              className="block mb-1 font-roboto text-gray-700" 
              htmlFor="email"
            >
              Email Address
            </label>
            <input
              required
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              className="w-full border border-gray-300 p-2 rounded text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label 
              className="block mb-1 font-roboto" 
              htmlFor="password"
            >
              Password
            </label>
            <input
              required
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full border border-gray-300 p-2 rounded text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent py-2 rounded hover:bg-opacity-90 transition text-sm font-regular font-roboto"
          >
            {isLoading ? "Loading..." : "Sign In"}
          </button>
        </form>
        {error && <p className="text-red-500">{error}</p>}
        <p className="text-center mt-4 font-roboto">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="text-accent hover:underline">
            Sign Up
          </a>
        </p>
      </div>
    </main>
  );
}
