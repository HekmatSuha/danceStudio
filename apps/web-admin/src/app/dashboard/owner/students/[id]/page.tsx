"use client";

import React, { useState } from "react";
import {
  Calendar,
  ChevronDown,
  Info,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";

type TabKey = "classes" | "season" | "payments" | "visits" | "history";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "classes", label: "Classes" },
  { key: "season", label: "Season tickets" },
  { key: "payments", label: "Payments" },
  { key: "visits", label: "Visits" },
  { key: "history", label: "History" },
];

const SEASON_TICKETS = [
  {
    id: "1",
    title: "Robotics Tue, Thu, 5:00 PM",
    remaining: "11/11",
    price: "13515",
    status: "Active",
    start: "22.01.2026",
    end: "21.02.2026",
  },
  {
    id: "2",
    title: "Finance",
    remaining: "10/10",
    price: "10000",
    status: "Active",
    start: "22.01.2026",
    end: "21.02.2026",
  },
  {
    id: "3",
    title: "Chemistry",
    remaining: "8/8",
    price: "20000",
    status: "Active",
    start: "21.01.2026",
    end: "20.02.2026",
  },
];

const PAYMENTS = [
  {
    id: "1",
    type: "Kaspi QR",
    sum: "16 645 T",
    date: "22.01.2026",
    description: "Demo Admission [DEMO]",
  },
  {
    id: "2",
    type: "Payment by card through the terminal",
    sum: "13 515 T",
    date: "22.01.2026",
    description: "Subscription payment (demo) [DEMO]",
  },
  {
    id: "3",
    type: "Payment by card through the terminal",
    sum: "10 000 T",
    date: "22.01.2026",
    description: "Subscription payment (demo) [DEMO]",
  },
];

const VISITS = [
  {
    id: "1",
    title: "English Mon, Wed, Fri 11:00",
    status: "Visited",
    payment: "Paid",
    date: "22.01.2026",
  },
  {
    id: "2",
    title: "Finance",
    status: "Missed",
    payment: "Paid",
    date: "22.01.2026",
  },
  {
    id: "3",
    title: "Robotics Tue, Thu, 5:00 PM",
    status: "I was sick",
    payment: "Paid",
    date: "22.01.2026",
  },
];

export default function OwnerStudentDetailPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("classes");
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center gap-6">
        <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
          <UserRound size={38} className="text-slate-400" />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-xl font-semibold text-slate-900">student 1</h1>
            <div className="flex items-center gap-2 text-slate-500">
              <Info size={18} className="text-indigo-500" />
              <MessageCircle size={18} className="text-emerald-500" />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Balance:</span>
              <span className="text-indigo-600 font-semibold border-b border-dashed border-indigo-400 pb-0.5">
                5 000 T
              </span>
              <button className="text-indigo-500 font-medium hover:underline">
                Reconciliation
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Users size={16} className="text-indigo-500" /> Group classes
            </span>
            <span className="inline-flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" /> Joined Jan 2026
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-400">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`transition-colors ${
              activeTab === tab.key
                ? "text-indigo-600"
                : "hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {activeTab === "classes" ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Finance - Coach Phillip
              </h2>
              <p className="text-sm text-slate-400 mt-1">Group classes</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-7xl font-semibold text-slate-900">6</div>
              <div className="h-12 w-12 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                <Users size={22} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-slate-500">
                <button className="p-2 rounded-lg hover:bg-slate-50">
                  <Settings size={18} />
                </button>
                <button className="p-2 rounded-lg hover:bg-slate-50">
                  <Plus size={18} />
                </button>
              </div>
              <button className="rounded-full bg-orange-400 text-white px-6 py-2 text-sm font-semibold">
                Unpin
              </button>
            </div>
          </div>
          <button className="rounded-2xl border border-dashed border-indigo-200 bg-white/60 text-indigo-400 flex items-center justify-center text-4xl font-light min-h-[320px]">
            +
          </button>
        </section>
      ) : null}

      {activeTab === "season" ? (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name"
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500">
                  <Users size={18} />
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Beginning of the period"
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="End of the period"
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            <button
              onClick={() => setShowSeasonForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-sm hover:bg-indigo-700"
            >
              <Plus size={18} />
              Get a subscription
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Remaining/Duration</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Start of action</th>
                    <th className="px-6 py-4">Completion date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SEASON_TICKETS.map((ticket, index) => (
                    <tr key={ticket.id}>
                      <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4">{ticket.title}</td>
                      <td className="px-6 py-4">{ticket.remaining}</td>
                      <td className="px-6 py-4">{ticket.price}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{ticket.start}</td>
                      <td className="px-6 py-4">{ticket.end}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                            <Users size={16} />
                          </button>
                          <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                            <Info size={16} />
                          </button>
                          <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "payments" ? (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid gap-4 lg:grid-cols-5 text-sm">
            {[
              { id: "total-income", label: "Total income", value: "77 073 T" },
              { id: "total-purchases", label: "Total purchases", value: "77 073 T" },
              { id: "returns", label: "Returns", value: "0 T" },
              { id: "average-bill", label: "Average bill", value: "15 415 T" },
              { id: "purchase-count", label: "Total purchases", value: "5" },
            ].map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <span className="text-slate-400">{item.label}</span>
                <span className="text-lg font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input
                  type="text"
                  placeholder="Search by description"
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Beginning of the period"
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="End of the period"
                  className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
                <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <select className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-600">
                  <option>All types</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-sm hover:bg-indigo-700"
            >
              <Plus size={18} />
              Make a payment
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Sum</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PAYMENTS.map((payment, index) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4">{payment.type}</td>
                      <td className="px-6 py-4">{payment.sum}</td>
                      <td className="px-6 py-4">{payment.date}</td>
                      <td className="px-6 py-4">{payment.description}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                            <Info size={16} />
                          </button>
                          <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "visits" ? (
        <section className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input
                type="text"
                placeholder="Search by occupation"
                className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Beginning of the period"
                className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
              <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="End of the period"
                className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
              <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {VISITS.map((visit, index) => (
                    <tr key={visit.id}>
                      <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4">{visit.title}</td>
                      <td className="px-6 py-4">
                        <select className="border border-slate-200 rounded-full px-3 py-1 text-sm text-emerald-600 bg-emerald-50">
                          <option>Visited</option>
                          <option>Missed</option>
                          <option>I was sick</option>
                          <option>Vacation</option>
                          <option>Visited (by car)</option>
                          <option>One-time lesson</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">{visit.payment}</td>
                      <td className="px-6 py-4">{visit.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="space-y-6">
          <div className="relative max-w-xs">
            <select className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-600">
              <option>All</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
            There are no activities yet
          </div>
        </section>
      ) : null}

      <Dialog open={showSeasonForm} onOpenChange={setShowSeasonForm}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New season ticket</DialogTitle>
            <DialogDescription>
              Fill in the subscription details for this student.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Subscription *
              </label>
              <button className="w-full border border-slate-200 rounded-xl px-4 py-3 text-left text-sm text-slate-600 flex items-center justify-between">
                For multiple classes
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">Class</label>
              <button className="w-full border border-slate-200 rounded-xl px-4 py-3 text-left text-sm text-slate-600 flex items-center justify-between">
                Finance
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Date of issue *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select date"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Subscription cost *
              </label>
              <input
                type="text"
                placeholder="10 000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Write off from balance
              </label>
              <input
                type="text"
                placeholder="10 000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr] items-center">
              <label className="text-sm font-medium text-slate-600">
                Available on balance
              </label>
              <input
                type="text"
                placeholder="5000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Number of classes"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Subscription start"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Subscription expiration"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              </div>
            </div>
            <textarea
              placeholder="Add a comment"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
            />
            <div className="flex justify-center pt-2">
              <button className="rounded-2xl bg-emerald-500 px-8 py-3 text-white font-semibold">
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add income</DialogTitle>
            <DialogDescription>
              Record a new income entry for this student.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Date *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select date"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Sum *</label>
              <input
                type="text"
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Payment source *</label>
              <button className="w-full border border-slate-200 rounded-xl px-4 py-3 text-left text-sm text-slate-600 flex items-center justify-between">
                Cashless transfer
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Income item *</label>
              <button className="w-full border border-slate-200 rounded-xl px-4 py-3 text-left text-sm text-slate-600 flex items-center justify-between">
                Purchasing a season ticket
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-start">
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                placeholder=""
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
              />
            </div>
            <div className="flex justify-center pt-2">
              <button className="rounded-2xl bg-lime-500 px-8 py-3 text-white font-semibold">
                Add
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
