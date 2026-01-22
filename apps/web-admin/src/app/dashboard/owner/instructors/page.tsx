"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Filter, Plus, Search, UserX, UserCheck, Mail, MapPin, Pencil, MoreVertical } from "lucide-react";
import { fetchTrainers, type Trainer } from "../../../../lib/trainers";
import { createInstructorAction } from "../../../actions/create-instructor";
import { supabase } from "../../../../lib/supabase";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";
import { getErrorMessage } from "../../../../lib/errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";

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

  const studioIdsKey = useMemo(
    () => studios.map((studio) => studio.uuid).join(","),
    [studios],
  );

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
        const studioIds = studioIdsKey ? studioIdsKey.split(",") : [];
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
  }, [refreshTrigger, studioIdsKey]);

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
    
    const studioId = formData.get("studioId");
    if (!studioId && studios.length > 0) {
       formData.set("studioId", studios[0].uuid);
    }
    
    try {
      const result = await createInstructorAction(formData);
      if (result.success) {
        setShowForm(false);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert("Error: " + result.message);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, "An unexpected error occurred."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Instructors</h1>
           <p className="text-slate-600 mt-1">Manage your teaching staff accounts.</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          Add Instructor
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search instructors..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto overflow-x-auto">
          <div className="relative min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none appearance-none cursor-pointer text-sm font-medium text-slate-700"
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
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none appearance-none cursor-pointer text-sm font-medium text-slate-700"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
           <div className="text-center py-12 text-slate-400">Loading instructors...</div>
        ) : filteredInstructors.length === 0 ? (
           <div className="text-center py-16">
             <div className="mx-auto h-12 w-12 text-gray-300 mb-3 bg-gray-50 rounded-full flex items-center justify-center">
               <UserX size={24} />
             </div>
             <h3 className="text-lg font-medium text-gray-900">No instructors found</h3>
             <p className="text-gray-500 mt-1">Try adjusting your filters or add a new instructor.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Instructor</th>
                  <th className="px-6 py-4">Studio</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Bio Excerpt</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInstructors.map((instructor) => (
                  <tr key={instructor.uuid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                           {instructor.first_name?.[0]}{instructor.last_name?.[0]}
                         </div>
                         <div>
                           <p className="font-semibold text-slate-900">
                             {instructor.first_name} {instructor.last_name}
                           </p>
                           <p className="text-xs text-slate-500">
                             {/* Mock email if not available in Trainer type for brevity */}
                             Instructor
                           </p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="truncate max-w-[150px]">
                          {instructor.studio_details?.name || "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        (instructor.is_active ?? true)
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {(instructor.is_active ?? true) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <p className="truncate max-w-[200px] text-slate-500 italic">
                         {instructor.bio || "No bio available."}
                       </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingInstructor(instructor)}
                          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit Details"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(instructor)}
                          className={`p-2 rounded-lg transition-colors ${
                            (instructor.is_active ?? true)
                              ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                              : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50" 
                          }`}
                          title={(instructor.is_active ?? true) ? "Deactivate" : "Activate"}
                        >
                           {(instructor.is_active ?? true) ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Instructor</DialogTitle>
            <DialogDescription>Create a login for a new teacher.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">First Name *</label>
                        <input name="firstName" required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Jane" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Last Name *</label>
                        <input name="lastName" required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Doe" />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Email (Login) *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="email" name="email" required className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" placeholder="jane@example.com" />
                    </div>
                </div>
                
                <div className="text-sm text-slate-500">
                    An invite email will be sent so the instructor can set their password.
                </div>

                {studios.length > 1 ? (
                   <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Assign to Studio</label>
                      <select name="studioId" className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-500">
                         {studios.map(s => (
                            <option key={s.uuid} value={s.uuid}>{s.name}</option>
                         ))}
                      </select>
                   </div>
                ) : studios.length === 1 ? (
                   <input type="hidden" name="studioId" value={studios[0].uuid} />
                ) : (
                   <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800">
                      No studios found. Please ensure you have a studio before adding instructors.
                      <input name="studioId" className="mt-2 w-full border border-amber-200 rounded p-1" placeholder="Or paste Studio ID manually" />
                   </div>
                )}

                <input type="hidden" name="ownerUserId" value={ownerUserId} />

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Bio (Optional)</label>
                    <textarea name="bio" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 resize-none" rows={3} placeholder="Short introduction..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70 font-medium shadow-sm"
                    >
                        {submitting ? "Creating..." : "Create Account"}
                    </button>
                </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingInstructor} onOpenChange={(open) => !open && setEditingInstructor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Instructor</DialogTitle>
          </DialogHeader>
          {editingInstructor && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">First Name *</label>
                  <input name="firstName" defaultValue={editingInstructor.first_name} required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Last Name *</label>
                  <input name="lastName" defaultValue={editingInstructor.last_name} required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Bio</label>
                <textarea name="bio" defaultValue={editingInstructor.bio || ""} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 resize-none" rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingInstructor(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70 font-medium shadow-sm">
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
