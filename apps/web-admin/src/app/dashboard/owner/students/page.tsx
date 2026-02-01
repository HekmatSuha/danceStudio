"use client";

import React, { useMemo, useState } from "react";
import {
  Plus,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  Search,
  Filter,
  Download,
  Eye,
} from "lucide-react";
import { CreateUserForm } from "../../../../components/dashboard/CreateUserForm";
import { supabase } from "../../../../lib/supabase";
import { type AccountProfile } from "../../../../lib/auth";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";
import { useRouter } from "next/navigation";
import useSWR from "swr";

type StudentRow = AccountProfile & { id?: string; created_at?: string; is_active?: boolean | null };
type BookingRow = { user?: StudentRow | null };

export default function OwnerStudentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { studios, loading: studiosLoading, role } = useOwnerStudiosGuard();
  const router = useRouter();

  const studioIdsKey = useMemo(
    () => studios.map((studio) => studio.uuid).join(","),
    [studios],
  );

  const handleSuccess = () => {
    setShowForm(false);
    alert("Student created successfully!");
    setNameSearch("");
    setPhoneSearch("");
    void mutate();
  };

  const {
    data: studentPayload,
    isLoading,
    mutate,
  } = useSWR<{
    students: StudentRow[];
    bookingCounts: Record<string, number>;
    balances: Record<string, number>;
  }>(
    studioIdsKey ? `owner:students:${studioIdsKey}` : null,
    async () => {
      const studioIds = studioIdsKey ? studioIdsKey.split(",") : [];
      if (studioIds.length === 0) {
        return { students: [], bookingCounts: {}, balances: {} };
      }

      const { data: linkRows, error: linkError } = await supabase
        .from("student_studios")
        .select("student_id")
        .in("studio_id", studioIds);

      if (linkError) {
        console.warn("Failed to load studio students", linkError);
        return { students: [], bookingCounts: {}, balances: {} };
      }

      const studentIds = Array.from(
        new Set(
          (linkRows as { student_id?: string | null }[] | null | undefined)
            ?.map((row) => row.student_id)
            .filter((id): id is string => Boolean(id)) || [],
        ),
      );

      if (studentIds.length === 0) {
        return { students: [], bookingCounts: {}, balances: {} };
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", studentIds)
        .order("created_at", { ascending: false });

      if (profileError) {
        console.warn("Failed to load students", profileError);
        return { students: [], bookingCounts: {}, balances: {} };
      }

      const rows = (profiles || [])
        .filter((p) => !p.role || p.role === "student")
        .map((p) => ({
          ...p,
          uuid: p.id,
        })) as StudentRow[];

      const { data: slotRows, error: slotError } = await supabase
        .from("slots")
        .select("uuid, price")
        .in("studio_id", studioIds);

      if (slotError) {
        console.warn("Failed to load studio slots", slotError);
        return { students: rows, bookingCounts: {}, balances: {} };
      }

      const slotPriceMap = new Map<string, number>();
      (slotRows as { uuid: string; price?: number | string | null }[] | null | undefined)?.forEach((row) => {
        if (!row?.uuid) return;
        slotPriceMap.set(row.uuid, Number(row.price || 0));
      });

      const slotIds = Array.from(slotPriceMap.keys());
      if (slotIds.length === 0) {
        return { students: rows, bookingCounts: {}, balances: {} };
      }

      const { data: bookingRows, error: bookingError } = await supabase
        .from("bookings")
        .select("user_id, appointment_slot, status, attended")
        .in("appointment_slot", slotIds);

      if (bookingError) {
        console.warn("Failed to load studio bookings", bookingError);
        return { students: rows, bookingCounts: {}, balances: {} };
      }

      const counts: Record<string, number> = {};
      const totals: Record<string, number> = {};
      const studentIdSet = new Set(studentIds);
      (bookingRows as { user_id?: string | null; appointment_slot?: string | null; status?: string | null; attended?: boolean | null }[] | null | undefined)?.forEach((row) => {
        if (!row.user_id) return;
        if (!studentIdSet.has(row.user_id)) return;
        const status = (row.status || "").toLowerCase();
        if (status !== "cancelled") {
          counts[row.user_id] = (counts[row.user_id] || 0) + 1;
        }
        const attended = row.attended === true || status === "confirmed";
        if (!attended) return;
        const slotId = String(row.appointment_slot || "");
        const price = slotPriceMap.get(slotId) || 0;
        totals[row.user_id] = (totals[row.user_id] || 0) + price;
      });

      const { data: paymentRows, error: paymentError } = await supabase
        .from("finance_entries")
        .select("student_id, amount")
        .in("studio_id", studioIds)
        .in("student_id", studentIds)
        .eq("entry_type", "income");

      if (paymentError) {
        console.warn("Failed to load student payments", paymentError);
        return { students: rows, bookingCounts: counts, balances: {} };
      }

      const paidByStudent: Record<string, number> = {};
      (paymentRows as { student_id?: string | null; amount?: number | string | null }[] | null | undefined)?.forEach((row) => {
        if (!row.student_id) return;
        paidByStudent[row.student_id] = (paidByStudent[row.student_id] || 0) + Number(row.amount || 0);
      });

      const balances: Record<string, number> = {};
      studentIds.forEach((studentId) => {
        const total = totals[studentId] || 0;
        const paid = paidByStudent[studentId] || 0;
        balances[studentId] = Math.max(0, total - paid);
      });

      return { students: rows, bookingCounts: counts, balances };
    },
  );

  const students = studentPayload?.students ?? [];
  const bookingCounts = studentPayload?.bookingCounts ?? {};
  const balances = studentPayload?.balances ?? {};

  const filteredStudents = useMemo(() => {
    const nameQuery = nameSearch.trim().toLowerCase();
    const phoneQuery = phoneSearch.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(dateFrom).getTime() : null;
    const toDate = dateTo ? new Date(dateTo).getTime() : null;

    return students.filter((s) => {
      const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim().toLowerCase();
      const email = s.email?.toLowerCase() || "";
      const phone = s.phone_number?.toLowerCase() || "";
      if (nameQuery && !fullName.includes(nameQuery) && !email.includes(nameQuery)) {
        return false;
      }
      if (phoneQuery && !phone.includes(phoneQuery)) {
        return false;
      }
      if (fromDate || toDate) {
        const created = s.created_at ? new Date(s.created_at).getTime() : null;
        if (created == null) return false;
        if (fromDate && created < fromDate) return false;
        if (toDate && created > toDate) return false;
      }
      if (genderFilter !== "all") {
        const gender = (s.gender || "").toLowerCase();
        if (genderFilter === "male" && gender !== "male") return false;
        if (genderFilter === "female" && gender !== "female") return false;
        if (genderFilter === "other" && gender && gender !== "other") return false;
      }
      if (statusFilter !== "all") {
        const isActive = s.is_active ?? true;
        const studentId = s.id || s.uuid;
        const hasBookings = Boolean(studentId && (bookingCounts[studentId] ?? 0) > 0);
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive && hasBookings) return false;
      }
      return true;
    });
  }, [students, bookingCounts, nameSearch, phoneSearch, dateFrom, dateTo, genderFilter, statusFilter]);

  if (studiosLoading) {
    return <div className="p-6 text-slate-500">Loading students...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return null;
  }

  const handleStudentClick = (student: StudentRow) => {
    const id = student.id || student.uuid;
    if (!id) return;
    router.push(`/dashboard/owner/students/${id}`);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const studentId = editingStudent.id || editingStudent.uuid;
    if (!studentId) {
      setSubmitting(false);
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.get("firstName") as string,
          last_name: formData.get("lastName") as string,
          phone_number: formData.get("phone") as string,
        })
        .eq("id", studentId);

      if (error) throw error;

      await mutate();
      setEditingStudent(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (student: StudentRow) => {
    const studentId = student.id || student.uuid;
    if (!studentId) return;
    const nextActive = !(student.is_active ?? true);
    if (!confirm(`${nextActive ? "Activate" : "Deactivate"} ${student.first_name} ${student.last_name}?`)) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: nextActive })
        .eq("id", studentId);
      if (error) throw error;
      await mutate();
    } catch (err) {
      console.error(err);
      alert("Failed to update student status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student: StudentRow) => {
    const studentId = student.id || student.uuid;
    if (!studentId) return;
    if (!confirm(`Delete ${student.first_name} ${student.last_name}?`)) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", studentId);
      if (error) throw error;
      await mutate();
    } catch (err) {
      console.error(err);
      alert("Failed to delete student.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-600 mt-1">Manage your student base.</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-3">
            <button className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
              <Filter size={18} className="mx-auto" />
            </button>
            <button className="h-11 w-11 rounded-xl bg-indigo-100 text-indigo-600 hover:bg-indigo-200">
              <Download size={18} className="mx-auto" />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="mb-8 max-w-2xl">
          <CreateUserForm
            initialRole="student"
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
            studios={studios}
          />
        </div>
      )}

      {editingStudent && (
        <div className="mb-8 max-w-2xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Edit Student</h3>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input name="firstName" defaultValue={editingStudent.first_name} required className="w-full border border-gray-300 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input name="lastName" defaultValue={editingStudent.last_name} required className="w-full border border-gray-300 p-2 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" defaultValue={editingStudent.phone_number || ""} className="w-full border border-gray-300 p-2 rounded-lg" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70">
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            <input
              type="text"
              placeholder="Search by name"
              className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
            <input
              type="text"
              placeholder="Search by phone"
              className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="all">Gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No students found. Add one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex justify-end px-6 py-4 text-sm text-slate-500">
            Total: {filteredStudents.length}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Photo</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4">Classes</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">Gender</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => {
                  const studentId = student.id || student.uuid;
                  const initials = `${student.first_name?.[0] || ""}${student.last_name?.[0] || ""}`.trim() || "S";
                  const isActive = student.is_active ?? true;
                  const classCount = studentId ? (bookingCounts[studentId] ?? 0) : 0;
                  const balance = studentId ? (balances[studentId] ?? 0) : 0;
                  return (
                  <tr
                    key={studentId}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleStudentClick(student)}
                  >
                    <td className="px-6 py-4 text-slate-500">{filteredStudents.length - index}</td>
                    <td className="px-6 py-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-semibold">
                        {initials}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {student.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{student.phone_number || "-"}</td>
                    <td className="px-6 py-4">
                      {student.created_at ? new Date(student.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{classCount}</td>
                    <td className={`px-6 py-4 font-semibold ${balance > 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 capitalize">{student.gender || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStudentClick(student);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View student"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStudent(student);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit student"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(student);
                          }}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={(student.is_active ?? true) ? "Deactivate" : "Activate"}
                          disabled={submitting}
                        >
                          {(student.is_active ?? true) ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudent(student);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete student"
                          disabled={submitting}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
