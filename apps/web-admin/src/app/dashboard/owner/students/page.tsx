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
    refreshStudents(studios.map((s) => s.uuid));
  };

  const refreshStudents = useCallback(async (studioIds: string[]) => {
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
  }, []);

  const studioIdsKey = useMemo(
    () => studios.map((studio) => studio.uuid).join(","),
    [studios],
  );

  useEffect(() => {
    if (!studiosLoading) {
      const studioIds = studioIdsKey ? studioIdsKey.split(",") : [];
      refreshStudents(studioIds);
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
                        <a
                          href={student.phone_number ? `https://wa.me/${student.phone_number.replace(/\D/g, "")}` : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 rounded-lg transition-colors ${
                            student.phone_number
                              ? "text-gray-400 hover:text-green-600 hover:bg-green-50"
                              : "text-gray-200 cursor-not-allowed"
                          }`}
                          title={student.phone_number ? "Chat on WhatsApp" : "No phone number"}
                          onClick={(e) => !student.phone_number && e.preventDefault()}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="w-4 h-4"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </a>
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
