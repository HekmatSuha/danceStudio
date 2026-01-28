"use client";

import React from "react";
import Link from "next/link";

type OutstandingStudent = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  amount: number;
};

type OwnerOutstandingBalancesProps = {
  loading: boolean;
  error: string | null;
  students: OutstandingStudent[];
};

export function OwnerOutstandingBalances({
  loading,
  error,
  students,
}: OwnerOutstandingBalancesProps) {
  return (
    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900">Outstanding balances</h2>
        <Link
          href="/dashboard/owner/students"
          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          View all
        </Link>
      </div>
      {loading ? (
        <div className="text-sm text-slate-400">Loading balances...</div>
      ) : error ? (
        <div className="text-sm text-rose-500">{error}</div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No outstanding balances right now.
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/dashboard/owner/students/${student.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 hover:border-rose-200 hover:bg-rose-50 transition-all"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">
                  {student.name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {student.email || student.phone || "No contact"}
                </div>
              </div>
              <div className="text-sm font-semibold text-rose-600">
                KZT {student.amount.toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
