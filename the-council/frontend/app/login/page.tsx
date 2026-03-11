"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push(callbackUrl);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-council-navy flex items-center justify-center px-4">
      {/* Background ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(201,168,76,0.06), transparent)",
        }}
      />

      <div
        className="relative w-full max-w-[400px] p-10 rounded-xl"
        style={{
          background: "#0f1e35",
          border: "1px solid #1e3a5f",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(201,168,76,0.06)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="rule-gold w-16 mx-auto mb-6" />
          <h1
            className="text-council-gold mb-2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.25rem",
              letterSpacing: "0.15em",
              fontWeight: 300,
            }}
          >
            THE COUNCIL
          </h1>
          <p className="label-caps">Enter your credentials</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-caps block mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="glass-input w-full px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="label-caps block mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="glass-input w-full px-4 py-3 text-sm"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-primary w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Entering..." : "Enter the Council"}
          </button>
        </form>

        <div className="rule-gold w-16 mx-auto mt-8" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-council-navy flex items-center justify-center">
        <p className="text-council-text-secondary">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
