"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { sendResetPassword, confirmPasswordReset } from "../../lib/auth";

function ResetPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get("email") || "";
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await sendResetPassword(email.trim());
      setStatus({ type: "success", text: "Code sent. Check your email." });
      setStep("confirm");
    } catch (err: any) {
      setStatus({
        type: "error",
        text: err?.message || "Unable to send reset code.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (password.length < 8) {
      setStatus({ type: "error", text: "Use at least 8 characters." });
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(code.trim(), password);
      setStatus({ type: "success", text: "Password updated. You can sign in now." });
      setTimeout(() => router.push("/login"), 800);
    } catch (err: any) {
      setStatus({
        type: "error",
        text: err?.message || "Invalid code or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-purple-600">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-purple-600 uppercase">
            Password reset
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {step === "request" ? "Send reset code" : "Enter code & new password"}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            We’ll email a verification code. Paste it here to set a new password.
          </p>
        </div>

        {status && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              status.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {status.text}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email or username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="you@example.com or username"
                  autoComplete="email"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white rounded-lg py-3 font-semibold shadow-md hover:bg-purple-700 transition disabled:opacity-70"
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Verification code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Enter the code from email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white rounded-lg py-3 font-semibold shadow-md hover:bg-purple-700 transition disabled:opacity-70"
            >
              {loading ? "Updating..." : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetPageInner />
    </Suspense>
  );
}
