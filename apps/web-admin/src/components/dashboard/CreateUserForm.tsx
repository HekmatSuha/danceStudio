"use client";

import React, { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { registerUser, type UserRole } from "../../lib/auth";
import { getErrorMessage } from "../../lib/errors";

interface CreateUserFormProps {
  initialRole: UserRole;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateUserForm({ initialRole, onSuccess, onCancel }: CreateUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    gender: "F",
    role: initialRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        gender: formData.gender,
      });
      onSuccess();
    } catch (err: unknown) {
      console.error("User Creation Error:", err);
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : undefined;
      if (data) {
        console.error("Response Data:", data);
        
        // Helper to extract text from various error formats
        const extractText = (val: unknown): string => {
          if (typeof val === "string") return val;
          if (Array.isArray(val)) {
            return val.map(extractText).join(", ");
          }
          if (typeof val === "object" && val !== null) {
            const record = val as Record<string, unknown>;
            if (typeof record.message === "string") return record.message;
            if (typeof record.detail === "string") return record.detail;
            return JSON.stringify(val); // Last resort
          }
          return String(val);
        };

        if (typeof data === "string") {
           setError(data);
        } else if (typeof data === "object" && data !== null && "detail" in data) {
           setError(String((data as { detail?: unknown }).detail ?? ""));
        } else if (typeof data === "object" && data !== null) {
           const messages = Object.entries(data)
             .map(([key, val]) => {
               // Capitalize key for display
               const field = key.charAt(0).toUpperCase() + key.slice(1);
               return `${field}: ${extractText(val)}`;
             })
             .join('\n');
           setError(messages || "Failed to create user. Please check inputs.");
        } else {
           setError("Failed to create user. Server returned an error.");
        }
      } else {
        setError(getErrorMessage(err, "Failed to create user. Please check the inputs."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Create New {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
        </h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">First Name *</label>
          <input
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Last Name *</label>
          <input
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Gender</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          >
            <option value="F">Female</option>
            <option value="M">Male</option>
            <option value="O">Other</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Initial Password *</label>
          <input
            type="password"
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Min 8 chars"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
         <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-md transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>
    </form>
  );
}
