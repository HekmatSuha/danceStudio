"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Mail, Lock, User, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  signInWithEmail,
  signUpWithEmail,
  sendResetPassword,
  type UserRole,
} from "../lib/auth";
import { getErrorMessage } from "../lib/errors";


interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "signin" | "signup";
  onAuthenticated?: (role: UserRole) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "signin",
  onAuthenticated,
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "F",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!isOpen) {
      setInfo(null);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string) => {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "F",
      password: "",
      confirmPassword: "",
    });
  };

  const handleAuthSuccess = (userRole: UserRole) => {
    resetForm();
    onClose();
    if (onAuthenticated) {
      onAuthenticated(userRole);
      return;
    }
    navigateToDashboard(userRole);
  };

  const navigateToDashboard = (userRole: UserRole) => {
    const slugMap: Record<UserRole, string> = {
      super_admin: 'super-admin',
      owner: 'owner',
      instructor: 'instructor',
      student: 'student',
    };
    router.push(`/dashboard/${slugMap[userRole]}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setInfo(null);

    const trimmedEmail = formData.email.trim();
    const password = formData.password;

    if (
      mode === "signup" &&
      formData.password !== formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }
    if (mode === "signup" && !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup" && !formData.phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (
      mode === "signup" &&
      (password.length < 8 || !/[0-9]/.test(password))
    ) {
      setError("Use at least 8 characters with a number.");
      return;
    }
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const { role: newRole } = await withTimeout(
          signUpWithEmail({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim() || "_",
            email: trimmedEmail,
            phone: formData.phone.trim(),
            password,
            role: "student",
            gender: formData.gender,
          }),
          15000,
          "Signup is taking too long. Please check your connection and try again."
        );
        setInfo("Account created and signed in successfully.");
        // Short delay to show success message before redirecting
        setTimeout(() => {
          handleAuthSuccess(newRole);
        }, 1000);
      } else {
        const result = await withTimeout(
          signInWithEmail({
            email: trimmedEmail,
            password,
          }),
          15000,
          "Sign in is taking too long. Please check your connection and try again."
        );
        setInfo(`Signed in as ${result.role}.`);
        setTimeout(() => {
          handleAuthSuccess(result.role);
        }, 500);
      }
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : undefined;
      const serverMsg =
        data && typeof data === "object" && "detail" in data
          ? String((data as { detail?: unknown }).detail ?? "")
          : data && typeof data === "object" && "error" in data
            ? String((data as { error?: unknown }).error ?? "")
            : typeof data === "string"
              ? data
              : Array.isArray(data)
                ? data.join(", ")
                : data && typeof data === "object"
                  ? Object.entries(data as Record<string, unknown>)
                      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                      .join(" | ")
                  : null;
      const message = serverMsg || getErrorMessage(err, "Something went wrong. Please try again.");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!formData.email) {
      setError("Enter your email to reset your password.");
      return;
    }

    setIsResetting(true);
    try {
      await sendResetPassword(formData.email);
      setInfo("Password reset code sent. Check your inbox.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to send reset email right now."));
    } finally {
      setIsResetting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    resetForm();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-8 pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="mb-2">
            {mode === "signin" ? "Welcome Back" : "Join Tance"}
          </h2>
          <p className="text-gray-600">
            {mode === "signin"
              ? "Sign in to access your account and book classes"
              : "Create an account to start your dance journey"}
          </p>
        </div>

        {(error || info) && (
          <div className="px-8 pb-0">
            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}
            {info && (
              <div className="mb-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
                {info}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          {mode === "signup" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block mb-2 text-gray-700">
                  First Name *
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block mb-2 text-gray-700">
                  Last Name *
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block mb-2 text-gray-700">
              {mode === "signin" ? "Email or Username *" : "Email Address *"}
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type={mode === "signin" ? "text" : "email"}
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={mode === "signin" ? "you@example.com or username" : "you@example.com"}
                autoComplete={mode === "signin" ? "username" : "email"}
              />
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label htmlFor="phone" className="block mb-2 text-gray-700">
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="block mb-2 text-gray-700">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block mb-2 text-gray-700">
              Password *
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="********"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Use 8+ characters and include a number for stronger security.
            </p>
          </div>

          {mode === "signup" && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block mb-2 text-gray-700"
              >
                Confirm Password *
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="********"
                />
              </div>
            </div>
          )}

          

          {mode === "signin" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting || isSubmitting}
                className="text-purple-600 hover:text-purple-700 disabled:opacity-60"
              >
                {isResetting ? "Sending reset..." : "Forgot password?"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
          >
            {isSubmitting
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>

          {mode === "signup" && (
            <p className="text-sm text-gray-600 text-center">
              By signing up, you agree to our Terms of Service and Privacy
              Policy
            </p>
          )}
        </form>

        {/* Switch Mode */}
        <div className="px-8 pb-8 text-center">
          <p className="text-gray-600">
            {mode === "signin"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              onClick={switchMode}
              className="text-purple-600 hover:text-purple-700"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
