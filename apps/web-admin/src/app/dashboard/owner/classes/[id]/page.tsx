"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar, Mail, Phone, Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import { supabase } from "../../../../../lib/supabase";
import { createBookingForStudent, fetchSlotBookings, type BookingWithUser } from "../../../../../lib/bookings";
import { type AccountProfile } from "../../../../../lib/auth";
import { updateClass } from "../../../../../lib/classes";

type ClassDetail = {
  id: string;
  title: string;
  teacherName: string;
  locationName: string;
  startAt: number;
  endAt: number;
  capacity: number;
};

type StudentProfile = AccountProfile & { id?: string | null };

export default function OwnerClassDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const classId = typeof params?.id === "string" ? params.id : "";
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<ClassDetail | null>(null);
  const [participants, setParticipants] = useState<BookingWithUser[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("confirmed");
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLevel, setEditLevel] = useState("all");
  const [editPrice, setEditPrice] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  useEffect(() => {
    if (!classId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: slot, error } = await supabase
          .from("slots")
          .select(`
            uuid,
            title,
            start_time,
            end_time,
            max_participants,
            trainer:profiles(first_name, last_name),
            studio:studios(name, address, city),
            room:rooms(name)
          `)
          .eq("uuid", classId)
          .single();

        if (error) throw error;

        const trainer = Array.isArray(slot?.trainer) ? slot?.trainer?.[0] : slot?.trainer;
        const teacherName = trainer
          ? `${trainer.first_name || ""} ${trainer.last_name || ""}`.trim()
          : "Unknown Instructor";
        const studio = Array.isArray(slot?.studio) ? slot?.studio?.[0] : slot?.studio;
        const room = Array.isArray(slot?.room) ? slot?.room?.[0] : slot?.room;
        const location = room?.name
          ? `${room.name}${studio?.name ? ` @ ${studio.name}` : ""}`
          : studio?.address || studio?.city || studio?.name || "Studio";

        setClassInfo({
          id: slot.uuid,
          title: slot.title || "Class",
          teacherName,
          locationName: location,
          startAt: new Date(slot.start_time).getTime(),
          endAt: new Date(slot.end_time).getTime(),
          capacity: slot.max_participants || 0,
        });
        const startLocal = format(new Date(slot.start_time), "yyyy-MM-dd'T'HH:mm");
        const endLocal = format(new Date(slot.end_time), "yyyy-MM-dd'T'HH:mm");
        setEditTitle(slot.title || "Class");
        setEditDescription(slot.description || "");
        setEditLevel(slot.level || "all");
        setEditPrice(slot.price ? String(slot.price) : "");
        setEditCapacity(slot.max_participants ? String(slot.max_participants) : "");
        setEditStart(startLocal);
        setEditEnd(endLocal);

        const bookingData = await fetchSlotBookings(slot.uuid);
        setParticipants(bookingData);

        const { data: studentRows } = await supabase
          .from("profiles")
          .select("id, uuid, first_name, last_name, email, phone_number, role")
          .eq("role", "student")
          .order("first_name", { ascending: true });

        setStudents((studentRows as StudentProfile[]) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classId]);

  useEffect(() => {
    if (searchParams?.get("edit") === "1") {
      setShowEdit(true);
    }
  }, [searchParams]);

  const participantIds = useMemo(
    () => new Set(participants.map((p) => p.user?.id).filter(Boolean)),
    [participants],
  );

  const availableStudents = useMemo(
    () => students.filter((s) => !participantIds.has(s.id || s.uuid)),
    [students, participantIds],
  );

  const handleAddStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!classInfo || !selectedStudentId) return;
    setSubmitting(true);
    try {
      await createBookingForStudent(classInfo.id, selectedStudentId, selectedStatus);
      const bookingData = await fetchSlotBookings(classInfo.id);
      setParticipants(bookingData);
      setSelectedStudentId("");
      setSelectedStatus("confirmed");
      setShowAddStudent(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!classInfo) return;
    setEditSubmitting(true);
    try {
      const startAt = editStart ? new Date(editStart) : null;
      const endAt = editEnd ? new Date(editEnd) : null;
      if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new Error("Invalid start or end time.");
      }

      await updateClass(classInfo.id, {
        title: editTitle.trim() || "Class",
        description: editDescription.trim(),
        level: editLevel as any,
        price: Number(editPrice || 0),
        capacity: Number(editCapacity || 0),
        startAt,
        endAt,
      });

      setClassInfo((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim() || prev.title,
              startAt: startAt.getTime(),
              endAt: endAt.getTime(),
              capacity: Number(editCapacity || prev.capacity || 0),
            }
          : prev
      );
      setShowEdit(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to update class.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const reservedCount = participants.filter((p) => p.status !== "cancelled").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {classInfo?.title || (loading ? "Loading..." : "Class")}
            </h1>
            <p className="text-slate-500 mt-1">
              {classInfo?.teacherName || "Instructor"} - {classInfo?.locationName || "Studio"}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-3">
              <span className="inline-flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                {classInfo
                  ? `${new Date(classInfo.startAt).toLocaleDateString()}`
                  : "Date"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                {reservedCount}/{classInfo?.capacity ?? 0} students
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowAddStudent(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-sm hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add student
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setShowEdit(true)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Edit class details
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Participants</h2>
          <span className="text-sm text-slate-500">Total: {participants.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {participants.map((booking, index) => {
                const student = booking.user;
                const fullName = student
                  ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
                  : "Unknown Student";
                const status =
                  booking.status === "cancelled"
                    ? "Cancelled"
                    : booking.status === "pending"
                    ? "Pending"
                    : "Active";
                return (
                <tr key={booking.uuid}>
                  <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {fullName}
                  </td>
                  <td className="px-6 py-4">{student?.email || "-"}</td>
                  <td className="px-6 py-4">{student?.phone_number || "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        status === "Active"
                          ? "bg-emerald-50 text-emerald-600"
                          : status === "Pending"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2 text-slate-400">
                      <button className="p-2 rounded-lg hover:bg-slate-50">
                        <Mail size={16} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-slate-50">
                        <Phone size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add student to class</DialogTitle>
            <DialogDescription>
              Select a student and confirm enrollment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Student</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                required
              >
                <option value="">Select student</option>
                {availableStudents.map((student) => {
                  const id = student.id || student.uuid;
                  const name = `${student.first_name || ""} ${student.last_name || ""}`.trim();
                  return (
                    <option key={id} value={id}>
                      {name || student.email || "Student"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr] items-center">
              <label className="text-sm font-medium text-slate-600">Status</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="confirmed">Active</option>
                <option value="pending">Waitlist</option>
              </select>
            </div>
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-emerald-500 px-8 py-3 text-white font-semibold disabled:opacity-70"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
            <DialogDescription>Update the basic class details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateClass} className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Title</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                rows={3}
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">Level</label>
                <select
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  value={editLevel}
                  onChange={(event) => setEditLevel(event.target.value)}
                >
                  <option value="all">All levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Capacity</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  value={editCapacity}
                  onChange={(event) => setEditCapacity(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  value={editPrice}
                  onChange={(event) => setEditPrice(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Start / End</label>
                <div className="grid gap-2 sm:grid-cols-1">
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                    value={editStart}
                    onChange={(event) => setEditStart(event.target.value)}
                  />
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                    value={editEnd}
                    onChange={(event) => setEditEnd(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 font-medium"
              >
                {editSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
