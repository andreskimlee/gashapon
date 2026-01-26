"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function EnterPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Wrong password!");
      }
    } catch {
      setError("Something went wrong. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-sky via-pastel-pink/20 to-pastel-mint/30 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-4 border-pastel-coral/30 max-w-md w-full text-center">
        {/* Cute mascot/logo */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pastel-coral to-pastel-pink rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            <Image
              src="/grabbit-coin-image.png"
              alt="Grabbit"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>
        </div>

        <h1 className="font-display text-3xl text-pastel-coral text-outline-sm mb-2">
          GRABBIT
        </h1>
        <p className="text-pastel-text/70 mb-6 text-sm">
          Enter the secret password to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-4 py-3 rounded-xl border-2 border-pastel-coral/30 focus:border-pastel-coral focus:outline-none text-center text-lg bg-white/50 placeholder:text-pastel-text/40"
              disabled={loading}
              autoFocus
            />
            {/* Cute decorative elements */}
            <span className="absolute -top-2 -left-2 text-2xl">✨</span>
            <span className="absolute -bottom-2 -right-2 text-2xl">🎮</span>
          </div>

          {error && (
            <p className="text-red-500 text-sm animate-pulse">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 px-6 bg-gradient-to-r from-pastel-coral to-pastel-pink text-white font-display text-xl rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">🎰</span>
                CHECKING...
              </span>
            ) : (
              "ENTER"
            )}
          </button>
        </form>

        <p className="mt-6 text-xs text-pastel-text/50">
          This site is currently in private beta
        </p>
      </div>
    </div>
  );
}
