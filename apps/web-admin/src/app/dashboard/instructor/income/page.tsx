"use client";

import React from "react";
import { TrendingUp, DollarSign, Calendar } from "lucide-react";

export default function InstructorIncomeAnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <TrendingUp className="text-emerald-600" />
          Income Analytics
        </h1>
        <p className="text-slate-600 mt-2">
          Monitor earnings and payouts from your classes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Earnings this month", value: "$0", icon: <DollarSign size={18} /> },
          { label: "Last payout", value: "Not available", icon: <Calendar size={18} /> },
          { label: "Projected next payout", value: "$0", icon: <TrendingUp size={18} /> },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 text-slate-600">
              <span className="rounded-xl bg-slate-100 p-2">{card.icon}</span>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Unlock income tracking</h2>
        <p className="mt-2 text-sm text-slate-500">
          Connect payments to see detailed payout history and forecasts.
        </p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Connect payments
        </button>
      </div>
    </div>
  );
}
