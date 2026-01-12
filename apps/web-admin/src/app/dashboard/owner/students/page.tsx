"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, UserCheck, UserX, Pencil, Trash2 } from "lucide-react";
import { CreateUserForm } from "../../../../components/dashboard/CreateUserForm";
import { supabase } from "../../../../lib/supabase";
import { type AccountProfile } from "../../../../lib/auth";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";

type StudentRow = AccountProfile & { id?: string; created_at?: string; is_active?: boolean | null };
type BookingRow = { user?: StudentRow | null };

export default function OwnerStudentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { studios, loading: studiosLoading, role } = useOwnerStudiosGuard();

  const handleSuccess = () => {
    setShowForm(false);
    alert("Student created successfully!");
    setSearch("");
    refreshStudents();
  };

  const refreshStudents = useCallback(async () => {
    const studioIds = studios.map((studio) => studio.uuid);
    setLoading(true);
    if (studioIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const { data: slotRows, error: slotError } = await supabase
      .from("slots")
      .select("uuid")
      .in("studio_id", studioIds);

    if (slotError) {
      console.warn("Failed to load studio slots", slotError);
      setStudents([]);
      setLoading(false);
      return;
    }

    const slotIds = (slotRows as Array<{ uuid: string }> | null | undefined)?.map((row) => row.uuid) ?? [];
    if (slotIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const { data: bookingRows, error } = await supabase
      .from("bookings")
      .select("user:profiles(*)")
      .in("appointment_slot", slotIds);

    if (error) {
      console.warn("Failed to load students", error);
      setStudents([]);
      setLoading(false);
      return;
    }

    const unique = new Map<string, StudentRow>();
    (bookingRows as unknown as BookingRow[] | null | undefined)?.forEach((row) => {
      const user = row.user ?? null;
      const uuid = user?.uuid || user?.id;
      if (!uuid) return;
      const stableUser = { ...user, uuid } as StudentRow;
      unique.set(uuid, stableUser);
    });
    setStudents(Array.from(unique.values()));
    setLoading(false);
  }, [studios]);

  const studioIdsKey = studios.map((studio) => studio.uuid).join(",");

  useEffect(() => {
    if (!studiosLoading) {
      refreshStudents();
    }
  }, [studiosLoading, studioIdsKey, refreshStudents]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((s) =>
      s.email?.toLowerCase().includes(query) ||
      s.first_name?.toLowerCase().includes(query) ||
      s.last_name?.toLowerCase().includes(query)
    );
  }, [students, search]);

  if (studiosLoading) {
    return <div className="p-6 text-slate-500">Loading students...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return null;
  }

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

      setStudents((prev) =>
        prev.map((s) =>
          (s.id || s.uuid) === studentId
            ? {
                ...s,
                first_name: formData.get("firstName") as string,
                last_name: formData.get("lastName") as string,
                phone_number: formData.get("phone") as string,
              }
            : s
        )
      );
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
      setStudents((prev) =>
        prev.map((s) =>
          (s.id || s.uuid) === studentId ? { ...s, is_active: nextActive } : s
        )
      );
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
      setStudents((prev) => prev.filter((s) => (s.id || s.uuid) !== studentId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete student.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-600 mt-1">Manage your student base.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={18} />
            Add Student
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 max-w-2xl">
          <CreateUserForm
            initialRole="student"
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
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

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search students by name or email..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No students found. Add one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id || student.uuid} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>
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
                    <td className="px-6 py-4">{student.email}</td>
                    <td className="px-6 py-4">
                      {student.created_at ? new Date(student.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStudent(student)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit student"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(student)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={(student.is_active ?? true) ? "Deactivate" : "Activate"}
                          disabled={submitting}
                        >
                          {(student.is_active ?? true) ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete student"
                          disabled={submitting}
                        >
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
      )}
    </div>
  );
}
