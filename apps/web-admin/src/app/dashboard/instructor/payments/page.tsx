"use client";

import React from "react";
import { DollarSign, CreditCard, Wallet } from "lucide-react";

export default function InstructorPaymentsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <DollarSign className="text-emerald-600" />
          Online Payments
        </h1>
        <p className="text-slate-600 mt-2">
          Track payouts and manage payment methods for your classes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "This month", value: "$0", icon: <Wallet size={18} /> },
          { label: "Pending payouts", value: "$0", icon: <DollarSign size={18} /> },
          { label: "Active methods", value: "0", icon: <CreditCard size={18} /> },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 text-slate-600">
              <span className="rounded-xl bg-slate-100 p-2">{card.icon}</span>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Connect payout method</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add your preferred payout method to receive payments from your classes.
        </p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add payout method
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No payments have been recorded yet.
      </div>
    </div>
  );
}
