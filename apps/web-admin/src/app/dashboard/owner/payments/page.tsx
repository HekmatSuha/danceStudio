"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Search, Plus } from "lucide-react";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";
import { supabase } from "../../../../lib/supabase";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";

type IncomeRow = {
  id: string;
  payer: string;
  amount: number;
  date: string;
  source: string;
  category: string;
  description: string;
};

type ExpenseRow = {
  id: string;
  receiver: string;
  amount: number;
  date: string;
  category: string;
  description: string;
};

const incomeSources = ["Cash", "Card", "Kaspi QR", "Bank transfer"];
const incomeCategories = ["Membership", "Class booking", "Merch", "Other"];
const expenseCategories = ["Rent", "Salary", "Marketing", "Utilities", "Supplies", "Other"];

export default function OwnerPaymentsPage() {
  const { studios, loading: studiosLoading, role } = useOwnerStudiosGuard();
  const [selectedStudioId, setSelectedStudioId] = useState("");
  const [activeTab, setActiveTab] = useState<"income" | "expenses">("income");

  const [payerQuery, setPayerQuery] = useState("");
  const [descriptionQuery, setDescriptionQuery] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [incomeSourceFilter, setIncomeSourceFilter] = useState("all");
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);

  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  const [incomeForm, setIncomeForm] = useState({
    date: "",
    amount: "0",
    source: "",
    category: "",
    payer: "",
    description: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    date: "",
    amount: "0",
    category: "",
    receiver: "",
    description: "",
  });

  useEffect(() => {
    if (!selectedStudioId && studios.length > 0) {
      setSelectedStudioId(studios[0].uuid);
    }
  }, [selectedStudioId, studios]);

  const {
    data: entriesPayload,
    isLoading: entriesLoading,
    error: entriesError,
    mutate,
  } = useSWR<Array<{
    id: string;
    entry_type: "income" | "expense";
    amount: number;
    date: string;
    payer: string;
    receiver: string;
    source: string;
    category: string;
    description: string;
  }>>(
    selectedStudioId ? `owner:payments:${selectedStudioId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("finance_entries")
        .select(
          "id, entry_type, amount, currency, payment_date, payer_name, receiver_name, payment_source, category, description"
        )
        .eq("studio_id", selectedStudioId)
        .order("payment_date", { ascending: false })
        .limit(500);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        entry_type: row.entry_type,
        amount: Number(row.amount || 0),
        date: row.payment_date,
        payer: row.payer_name || "-",
        receiver: row.receiver_name || "-",
        source: row.payment_source || "Other",
        category: row.category || "Other",
        description: row.description || "-",
      }));
    },
  );

  const entriesErrorMessage =
    entriesError instanceof Error ? entriesError.message : entriesError ? String(entriesError) : null;

  useEffect(() => {
    if (!entriesPayload) return;
    setIncomeRows(
      entriesPayload
        .filter((row) => row.entry_type === "income")
        .map((row) => ({
          id: row.id,
          payer: row.payer,
          amount: row.amount,
          date: row.date,
          source: row.source,
          category: row.category,
          description: row.description,
        }))
    );
    setExpenseRows(
      entriesPayload
        .filter((row) => row.entry_type === "expense")
        .map((row) => ({
          id: row.id,
          receiver: row.receiver,
          amount: row.amount,
          date: row.date,
          category: row.category,
          description: row.description,
        }))
    );
  }, [entriesPayload]);

  const filteredIncome = useMemo(() => {
    const queryPayer = payerQuery.trim().toLowerCase();
    const queryDesc = descriptionQuery.trim().toLowerCase();
    const from = rangeFrom ? new Date(`${rangeFrom}T00:00:00`).getTime() : null;
    const to = rangeTo ? new Date(`${rangeTo}T23:59:59`).getTime() : null;
    return incomeRows.filter((row) => {
      if (queryPayer && !row.payer.toLowerCase().includes(queryPayer)) return false;
      if (queryDesc && !row.description.toLowerCase().includes(queryDesc)) return false;
      if (incomeSourceFilter !== "all" && row.source !== incomeSourceFilter) return false;
      if (incomeCategoryFilter !== "all" && row.category !== incomeCategoryFilter) return false;
      const time = new Date(row.date).getTime();
      if (from && time < from) return false;
      if (to && time > to) return false;
      return true;
    });
  }, [
    incomeRows,
    payerQuery,
    descriptionQuery,
    rangeFrom,
    rangeTo,
    incomeSourceFilter,
    incomeCategoryFilter,
  ]);

  const filteredExpenses = useMemo(() => {
    const queryReceiver = payerQuery.trim().toLowerCase();
    const queryDesc = descriptionQuery.trim().toLowerCase();
    const from = rangeFrom ? new Date(`${rangeFrom}T00:00:00`).getTime() : null;
    const to = rangeTo ? new Date(`${rangeTo}T23:59:59`).getTime() : null;
    return expenseRows.filter((row) => {
      if (queryReceiver && !row.receiver.toLowerCase().includes(queryReceiver)) return false;
      if (queryDesc && !row.description.toLowerCase().includes(queryDesc)) return false;
      if (expenseCategoryFilter !== "all" && row.category !== expenseCategoryFilter) return false;
      const time = new Date(row.date).getTime();
      if (from && time < from) return false;
      if (to && time > to) return false;
      return true;
    });
  }, [expenseRows, payerQuery, descriptionQuery, rangeFrom, rangeTo, expenseCategoryFilter]);

  const incomeTotal = useMemo(
    () => filteredIncome.reduce((sum, row) => sum + row.amount, 0),
    [filteredIncome]
  );
  const expenseTotal = useMemo(
    () => filteredExpenses.reduce((sum, row) => sum + row.amount, 0),
    [filteredExpenses]
  );

  if (studiosLoading) {
    return <div className="p-6 text-slate-500">Loading finance...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return null;
  }

  const handleAddIncome = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudioId) return;
    const amount = Number(incomeForm.amount);
    if (!incomeForm.date || !Number.isFinite(amount)) return;
    setEntriesError(null);
    try {
      const { error } = await supabase.from("finance_entries").insert({
        studio_id: selectedStudioId,
        entry_type: "income",
        amount,
        currency: "KZT",
        payment_date: incomeForm.date,
        payer_name: incomeForm.payer || null,
        payment_source: incomeForm.source || null,
        category: incomeForm.category || null,
        description: incomeForm.description || null,
      });
      if (error) throw error;
      setIncomeForm({
        date: "",
        amount: "0",
        source: "",
        category: "",
        payer: "",
        description: "",
      });
      setShowIncomeDialog(false);
      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save income.";
      setEntriesError(message);
    }
  };

  const handleAddExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudioId) return;
    const amount = Number(expenseForm.amount);
    if (!expenseForm.date || !Number.isFinite(amount)) return;
    setEntriesError(null);
    try {
      const { error } = await supabase.from("finance_entries").insert({
        studio_id: selectedStudioId,
        entry_type: "expense",
        amount,
        currency: "KZT",
        payment_date: expenseForm.date,
        receiver_name: expenseForm.receiver || null,
        category: expenseForm.category || null,
        description: expenseForm.description || null,
      });
      if (error) throw error;
      setExpenseForm({ date: "", amount: "0", category: "", receiver: "", description: "" });
      setShowExpenseDialog(false);
      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save expense.";
      setEntriesError(message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10 lg:py-12">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Finance</p>
              <h1 className="text-3xl font-semibold text-slate-900">Income & expenses</h1>
            </div>
            {studios.length > 1 ? (
              <select
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                value={selectedStudioId}
                onChange={(event) => setSelectedStudioId(event.target.value)}
              >
                {studios.map((studio) => (
                  <option key={studio.uuid} value={studio.uuid}>
                    {studio.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              onClick={() =>
                activeTab === "income" ? setShowIncomeDialog(true) : setShowExpenseDialog(true)
              }
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              {activeTab === "income" ? "Add income" : "Add expense"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-400">
            <button
              onClick={() => setActiveTab("income")}
              className={activeTab === "income" ? "text-indigo-600" : "hover:text-slate-600"}
            >
              Income
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={activeTab === "expenses" ? "text-indigo-600" : "hover:text-slate-600"}
            >
              Expenses
            </button>
          </div>
        </header>

        <section className="mt-6 space-y-5">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input
                type="text"
                placeholder={activeTab === "income" ? "Search by payer" : "Search by receiver"}
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-3 bg-white text-sm"
                value={payerQuery}
                onChange={(event) => setPayerQuery(event.target.value)}
              />
            </div>
            <div className="relative md:col-span-2">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input
                type="text"
                placeholder="Search by description"
                className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-3 bg-white text-sm"
                value={descriptionQuery}
                onChange={(event) => setDescriptionQuery(event.target.value)}
              />
            </div>
            <div className="relative">
              <input
                type="date"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-sm"
                value={rangeFrom}
                onChange={(event) => setRangeFrom(event.target.value)}
              />
              <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            </div>
            <div className="relative">
              <input
                type="date"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-sm"
                value={rangeTo}
                onChange={(event) => setRangeTo(event.target.value)}
              />
              <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            </div>
            {activeTab === "income" ? (
              <>
                <select
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-sm text-slate-600"
                  value={incomeSourceFilter}
                  onChange={(event) => setIncomeSourceFilter(event.target.value)}
                >
                  <option value="all">All sources</option>
                  {incomeSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-sm text-slate-600"
                  value={incomeCategoryFilter}
                  onChange={(event) => setIncomeCategoryFilter(event.target.value)}
                >
                  <option value="all">All categories</option>
                  {incomeCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-sm text-slate-600"
                value={expenseCategoryFilter}
                onChange={(event) => setExpenseCategoryFilter(event.target.value)}
              >
                <option value="all">All categories</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {entriesErrorMessage ? (
              <div className="px-6 py-4 text-sm text-rose-500">{entriesErrorMessage}</div>
            ) : null}
            <div className="flex items-center justify-end px-6 py-4 text-sm text-slate-500">
              Total:{" "}
              <span className="ml-2 font-semibold text-slate-900">
                {(activeTab === "income" ? incomeTotal : expenseTotal).toLocaleString()}
              </span>
            </div>
            <div className="overflow-x-auto">
              {activeTab === "income" ? (
                <table className="w-full text-sm text-slate-600">
                  <thead className="border-t border-slate-100 text-xs uppercase font-semibold text-slate-400">
                    <tr>
                      <th className="px-6 py-4 text-left">#</th>
                      <th className="px-6 py-4 text-left">Payer</th>
                      <th className="px-6 py-4 text-left">Amount</th>
                      <th className="px-6 py-4 text-left">Payment date</th>
                      <th className="px-6 py-4 text-left">Source</th>
                      <th className="px-6 py-4 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entriesLoading ? (
                      <tr>
                        <td className="px-6 py-6 text-center text-slate-400" colSpan={6}>
                          Loading income entries...
                        </td>
                      </tr>
                    ) : filteredIncome.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-center text-slate-400" colSpan={6}>
                          No income entries yet.
                        </td>
                      </tr>
                    ) : (
                      filteredIncome.map((row, index) => (
                        <tr key={row.id}>
                          <td className="px-6 py-4">{index + 1}</td>
                          <td className="px-6 py-4 text-slate-900">{row.payer}</td>
                          <td className="px-6 py-4">{row.amount.toLocaleString()}</td>
                          <td className="px-6 py-4">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">{row.source}</td>
                          <td className="px-6 py-4">{row.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm text-slate-600">
                  <thead className="border-t border-slate-100 text-xs uppercase font-semibold text-slate-400">
                    <tr>
                      <th className="px-6 py-4 text-left">#</th>
                      <th className="px-6 py-4 text-left">Receiver</th>
                      <th className="px-6 py-4 text-left">Amount</th>
                      <th className="px-6 py-4 text-left">Payment date</th>
                      <th className="px-6 py-4 text-left">Category</th>
                      <th className="px-6 py-4 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entriesLoading ? (
                      <tr>
                        <td className="px-6 py-6 text-center text-slate-400" colSpan={6}>
                          Loading expense entries...
                        </td>
                      </tr>
                    ) : filteredExpenses.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-center text-slate-400" colSpan={6}>
                          No expense entries yet.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((row, index) => (
                        <tr key={row.id}>
                          <td className="px-6 py-4">{index + 1}</td>
                          <td className="px-6 py-4 text-slate-900">{row.receiver}</td>
                          <td className="px-6 py-4">{row.amount.toLocaleString()}</td>
                          <td className="px-6 py-4">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">{row.category}</td>
                          <td className="px-6 py-4">{row.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add income</DialogTitle>
            <DialogDescription>Record a new income entry.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddIncome} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Date *</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={incomeForm.date}
                onChange={(event) => setIncomeForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Amount *</label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={incomeForm.amount}
                onChange={(event) => setIncomeForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Payment source *</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600"
                value={incomeForm.source}
                onChange={(event) => setIncomeForm((prev) => ({ ...prev, source: event.target.value }))}
              >
                <option value="">Select source</option>
                {incomeSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Income category *</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600"
                value={incomeForm.category}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                <option value="">Select category</option>
                {incomeCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Payer</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={incomeForm.payer}
                onChange={(event) => setIncomeForm((prev) => ({ ...prev, payer: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-start">
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
                value={incomeForm.description}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowIncomeDialog(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Add income
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>Record a new expense entry.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Date *</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={expenseForm.date}
                onChange={(event) => setExpenseForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Amount *</label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Expense category *</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600"
                value={expenseForm.category}
                onChange={(event) =>
                  setExpenseForm((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                <option value="">Select category</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Receiver</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={expenseForm.receiver}
                onChange={(event) =>
                  setExpenseForm((prev) => ({ ...prev, receiver: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-start">
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
                value={expenseForm.description}
                onChange={(event) =>
                  setExpenseForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExpenseDialog(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Add expense
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
