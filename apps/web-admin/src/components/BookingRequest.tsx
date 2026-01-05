"use client";

import React, { useState } from "react";
import { createBooking } from "../lib/bookings";

export function BookingRequest() {
  const [className, setClassName] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await createBooking(className.trim());
      setStatus({ type: "success", text: "Booking submitted." });
      setClassName("");
      setPreferredDate("");
      setMessage("");
    } catch (err: any) {
      setStatus({
        type: "error",
        text: err?.message || "Unable to send request. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="booking" className="py-16 bg-gradient-to-r from-purple-700 via-pink-600 to-purple-500 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="uppercase tracking-wide text-sm text-purple-100 mb-2">Book Your Spot</p>
          <h2 className="text-3xl font-semibold mb-3">Request a class booking directly</h2>
          <p className="text-purple-100 mb-8">
            Tell us which class or style you want to join and your preferred time. We'll confirm availability.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 grid gap-4 md:grid-cols-2"
        >
          {status && (
            <div className={`md:col-span-2 rounded-lg px-4 py-3 ${status.type === "error" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
              {status.text}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Class / Style *</label>
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              placeholder="e.g. Beginner Hip Hop, Ballet, Salsa"
              className="px-4 py-3 rounded-lg bg-white text-gray-900 border border-transparent focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Preferred Date & Time</label>
            <input
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              placeholder="e.g. Fridays after 6pm"
              className="px-4 py-3 rounded-lg bg-white text-gray-900 border border-transparent focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-semibold">Notes</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Any goals, level, or special requests?"
              className="px-4 py-3 rounded-lg bg-white text-gray-900 border border-transparent focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 rounded-lg bg-gradient-to-r from-white to-purple-100 text-purple-800 font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-70"
            >
              {loading ? "Sending..." : "Send Booking Request"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
