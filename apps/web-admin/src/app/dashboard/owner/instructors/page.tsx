"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Filter, Plus, Search, UserX, UserCheck } from "lucide-react";
import { fetchTrainers, type Trainer } from "../../../../lib/trainers";
import { createInstructorAction } from "../../../actions/create-instructor";
import { supabase } from "../../../../lib/supabase";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";

export default function OwnerInstructorsPage() {
  const [instructors, setInstructors] = useState<Trainer[]>([]);
  const { studios, loading: studiosLoading, role } = useOwnerStudiosGuard();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [studioFilter, setStudioFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [editingInstructor, setEditingInstructor] = useState<Trainer | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setOwnerUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    const load = async () => {
      try {
        const studioIds = studios.map((studio) => studio.uuid);
        const trainersData = studioIds.length > 0
          ? await fetchTrainers({ studioIds })
          : [];

        if (!isMounted) return;
        setInstructors(trainersData);
      } catch (err) {
        console.warn("Failed to load data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger, studios.map((studio) => studio.uuid).join(",")]);

  const filteredInstructors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return instructors.filter((instructor) => {
      const matchesSearch = !query
        || instructor.first_name?.toLowerCase().includes(query)
        || instructor.last_name?.toLowerCase().includes(query);
      const matchesStudio = studioFilter === "all" || instructor.studio === studioFilter;
      const isActive = instructor.is_active ?? true;
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" && isActive)
        || (statusFilter === "inactive" && !isActive);
      return matchesSearch && matchesStudio && matchesStatus;
    });
  }, [instructors, search, studioFilter, statusFilter]);

  if (studiosLoading) {
    return <div className="p-6 text-slate-500">Loading instructors...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return null;
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInstructor) return;
    setEditSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.get("firstName") as string,
          last_name: formData.get("lastName") as string,
          bio: formData.get("bio") as string,
        })
        .eq("id", editingInstructor.uuid);

      if (error) throw error;

      setInstructors((prev) =>
        prev.map((item) =>
          item.uuid === editingInstructor.uuid
            ? {
                ...item,
                first_name: formData.get("firstName") as string,
                last_name: formData.get("lastName") as string,
                bio: (formData.get("bio") as string) || "",
              }
            : item
        )
      );
      setEditingInstructor(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update instructor.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleActive = async (instructor: Trainer) => {
    const nextActive = !(instructor.is_active ?? true);
    if (!confirm(`${nextActive ? "Activate" : "Deactivate"} ${instructor.first_name} ${instructor.last_name}?`)) {
      return;
    }
    setEditSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: nextActive })
        .eq("id", instructor.uuid);

      if (error) throw error;

      setInstructors((prev) =>
        prev.map((item) =>
          item.uuid === instructor.uuid ? { ...item, is_active: nextActive } : item
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update instructor status.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    // Check if studio is selected
    const studioId = formData.get("studioId");
    if (!studioId && studios.length > 0) {
       // If hidden or auto-selected, ensure it's passed. 
       // If default was not set in select value, set it manually?
       // The select below has value={s.uuid}, so if user didn't change it, 
       // standard form behavior might send the first option if it's selected by default.
       // But if select has no 'selected' attribute, browser defaults to first.
       formData.set("studioId", studios[0].uuid);
    }
    
    try {
      const result = await createInstructorAction(formData);
      if (result.success) {
        alert("Instructor account created successfully!");
        setShowForm(false);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert("Error: " + result.message);
      }
    } catch (err: any) {
      alert("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Instructors</h1>
          <p className="text-slate-600 mt-1">Manage your teaching staff accounts.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={18} />
            Add Instructor
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search instructors..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            value={studioFilter}
            onChange={(e) => setStudioFilter(e.target.value)}
          >
            <option value="all">All studios</option>
            {studios.map((studio) => (
              <option key={studio.uuid} value={studio.uuid}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {showForm && (
        <div className="mb-8 max-w-2xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Create Instructor Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input name="firstName" required className="border border-gray-300 p-2 rounded-lg w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input name="lastName" required className="border border-gray-300 p-2 rounded-lg w-full" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login) *</label>
                        <input type="email" name="email" required className="border border-gray-300 p-2 rounded-lg w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                        <input type="password" name="password" required minLength={8} className="border border-gray-300 p-2 rounded-lg w-full" placeholder="Min 8 chars" />
                    </div>
                </div>
                {studios.length > 1 ? (
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Studio</label>
                      <select name="studioId" className="w-full border border-gray-300 p-2 rounded-lg bg-white">
                         {studios.map(s => (
                            <option key={s.uuid} value={s.uuid}>{s.name}</option>
                         ))}
                      </select>
                   </div>
                ) : studios.length === 1 ? (
                   <input type="hidden" name="studioId" value={studios[0].uuid} />
                ) : (
                   <div className="space-y-2">
                      <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                        No studios found for your account. You can paste a Studio ID or the system will try to resolve it by owner.
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Studio ID (optional)</label>
                        <input name="studioId" className="w-full border border-gray-300 p-2 rounded-lg" placeholder="Paste studio UUID" />
                      </div>
                   </div>
                )}

                <input type="hidden" name="ownerUserId" value={ownerUserId} />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea name="bio" className="border border-gray-300 p-2 rounded-lg w-full" rows={3} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Creating..." : "Create Account"}
                    </button>
                </div>
            </form>
        </div>
      )}

      {editingInstructor && (
        <div className="mb-8 max-w-2xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Edit Instructor</h3>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input name="firstName" defaultValue={editingInstructor.first_name} required className="border border-gray-300 p-2 rounded-lg w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input name="lastName" defaultValue={editingInstructor.last_name} required className="border border-gray-300 p-2 rounded-lg w-full" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea name="bio" defaultValue={editingInstructor.bio || ""} className="border border-gray-300 p-2 rounded-lg w-full" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingInstructor(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={editSubmitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70">
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading instructors...</div>
      ) : filteredInstructors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No instructors found. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInstructors.map((instructor) => (
            <div
              key={instructor.uuid}
              className={`bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${
                (instructor.is_active ?? true) ? "border-slate-200" : "border-amber-200 bg-amber-50/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    {instructor.first_name?.[0]}
                    {instructor.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {instructor.first_name} {instructor.last_name}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                        Instructor
                      </span>
                      {!instructor.is_active && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingInstructor(instructor)}
                    className="px-2 py-1 text-sm text-gray-600 hover:text-purple-600"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(instructor)}
                    className="px-2 py-1 text-sm text-gray-600 hover:text-purple-600 flex items-center gap-1"
                    title={instructor.is_active ? "Deactivate" : "Activate"}
                    disabled={editSubmitting}
                  >
                    {instructor.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                    {instructor.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                 {instructor.bio && (
                   <p className="line-clamp-2 italic">"{instructor.bio}"</p>
                 )}
                 {instructor.studio_details && (
                    <p className="text-xs text-slate-400">
                        {instructor.studio_details.name}
                    </p>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
