"use client";

import React, { useEffect, useState } from "react";
import { Plus, MapPin, Building2, User, Pencil, Trash2 } from "lucide-react";
import { listStudios, updateStudio, deleteStudio, type Studio } from "../../../../lib/studios";
import { supabase } from "../../../../lib/supabase";
import { createTenantAction } from "../../../actions/create-tenant";
import { inviteStudioOwnerAction } from "../../../actions/invite-studio-owner";
import { getErrorMessage } from "../../../../lib/errors";

const parseOptionalNumber = (value: FormDataEntryValue | null) => {
  if (value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function SuperAdminStudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const [ownerInviteSubmitting, setOwnerInviteSubmitting] = useState(false);
  const [ownerInviteFirstName, setOwnerInviteFirstName] = useState("");
  const [ownerInviteLastName, setOwnerInviteLastName] = useState("");
  const [ownerInviteEmail, setOwnerInviteEmail] = useState("");

  useEffect(() => {
    setLoading(true);
    listStudios()
      .then(setStudios)
      .catch((err) => console.warn("Failed to load studios", err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  useEffect(() => {
    setOwnerInviteFirstName("");
    setOwnerInviteLastName("");
    setOwnerInviteEmail("");
  }, [editingStudio]);

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await createTenantAction(formData);
      if (result.success) {
        alert(result.message || "Studio created successfully.");
        setShowCreateForm(false);
        setSendInvite(false);
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

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudio) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const imageFileEntry = formData.get("studioImage");
      const imageFile = imageFileEntry instanceof File ? imageFileEntry : null;
      let imageUrl: string | null | undefined = undefined;

      if (imageFile && imageFile.size > 0) {
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "studio.jpg";
        const path = `${editingStudio.uuid}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("studio-images")
          .upload(path, imageFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const { data } = supabase.storage.from("studio-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      await updateStudio(editingStudio.uuid, {
        name: formData.get("name") as string,
        city: formData.get("city") as string,
        address: formData.get("address") as string,
        latitude: parseOptionalNumber(formData.get("latitude")),
        longitude: parseOptionalNumber(formData.get("longitude")),
        whatsapp: (formData.get("whatsapp") as string) || null,
        image_url: imageUrl
      });
      setEditingStudio(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      console.error("Failed to update studio", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : getErrorMessage(err, "Failed to update studio.");
      alert(message || "Failed to update studio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerInvite = async () => {
    if (!editingStudio) return;
    setOwnerInviteSubmitting(true);
    const formData = new FormData();
    formData.set("studioId", editingStudio.uuid);
    formData.set("firstName", ownerInviteFirstName);
    formData.set("lastName", ownerInviteLastName);
    formData.set("email", ownerInviteEmail);

    try {
      const result = await inviteStudioOwnerAction(formData);
      if (result.success) {
        alert(result.message || "Owner invite sent.");
        setOwnerInviteFirstName("");
        setOwnerInviteLastName("");
        setOwnerInviteEmail("");
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert("Error: " + result.message);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, "An unexpected error occurred."));
    } finally {
      setOwnerInviteSubmitting(false);
    }
  };

  const handleDelete = async (studio: Studio) => {
    if (!confirm(`Are you sure you want to delete "${studio.name}"? This action cannot be undone.`)) return;
    try {
      await deleteStudio(studio.uuid);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      console.error(err);
      alert(
        getErrorMessage(
          err,
          "Failed to delete studio. Ensure all related data (classes, staff) is removed first."
        )
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manage Studios</h1>
          <p className="text-slate-600 mt-1">Create and oversee all studio tenants.</p>
        </div>
        {!showCreateForm && !editingStudio && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={18} />
            Create New Studio
          </button>
        )}
      </div>

      {/* CREATE FORM */}
      {showCreateForm && (
        <div className="mb-8 max-w-4xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            Create New Studio Tenant
          </h3>
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            
            {/* Studio Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
              <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">1. Studio Details</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Studio Name *</label>
                <input name="name" required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Star Dance Academy" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input name="city" required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Almaty" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <input name="address" required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Abay 10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input name="latitude" type="number" step="0.000001" min="-90" max="90" className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 43.238949" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input name="longitude" type="number" step="0.000001" min="-180" max="180" className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 76.889709" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  name="whatsapp"
                  type="tel"
                  required
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. +77011234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Studio Image (Optional)</label>
                <input
                  name="studioImage"
                  type="file"
                  accept="image/*"
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Used on the landing page studio card.</p>
              </div>
            </div>

            {/* Owner Details */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-100">
              <h4 className="font-semibold text-blue-800 text-sm uppercase tracking-wide flex items-center gap-2">
                <User size={16} />
                2. Owner Account (Optional)
              </h4>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="sendInvite"
                  checked={sendInvite}
                  onChange={(event) => setSendInvite(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Send password setup email now
              </label>
              <p className="text-xs text-slate-500">
                If enabled, the owner will receive a link to set their own password.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name {sendInvite ? "*" : ""}
                  </label>
                  <input
                    name="ownerFirstName"
                    required={sendInvite}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name {sendInvite ? "*" : ""}
                  </label>
                  <input
                    name="ownerLastName"
                    required={sendInvite}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Username) {sendInvite ? "*" : ""}
                </label>
                <input
                  type="email"
                  name="ownerEmail"
                  required={sendInvite}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="owner@studio.com"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowCreateForm(false); setSendInvite(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? "Creating..." : "Create Tenant"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT FORM */}
      {editingStudio && (
        <div className="mb-8 max-w-2xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold mb-4">Edit Studio Details</h3>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Studio Name *</label>
              <input name="name" defaultValue={editingStudio.name} required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input name="city" defaultValue={editingStudio.city} required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input name="address" defaultValue={editingStudio.address} required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input name="latitude" type="number" step="0.000001" min="-90" max="90" defaultValue={editingStudio.latitude ?? ""} className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input name="longitude" type="number" step="0.000001" min="-180" max="180" defaultValue={editingStudio.longitude ?? ""} className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input
                name="whatsapp"
                type="tel"
                defaultValue={editingStudio.whatsapp ?? ""}
                required
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Studio Image</label>
              <div className="flex items-center gap-4">
                {editingStudio.image_url ? (
                  <div className="h-20 w-32 overflow-hidden rounded-lg border border-gray-200 bg-slate-100">
                    <img src={editingStudio.image_url} alt={editingStudio.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-32 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                    No image
                  </div>
                )}
                <input
                  name="studioImage"
                  type="file"
                  accept="image/*"
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Upload a new image to replace the current one.</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setEditingStudio(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
            </div>
          </form>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Owner Invite</h4>
            <p className="text-xs text-slate-500">
              Send a password setup email to the studio owner when they are ready.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  value={ownerInviteFirstName}
                  onChange={(event) => setOwnerInviteFirstName(event.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  value={ownerInviteLastName}
                  onChange={(event) => setOwnerInviteLastName(event.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={ownerInviteEmail}
                onChange={(event) => setOwnerInviteEmail(event.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="owner@studio.com"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleOwnerInvite}
                disabled={ownerInviteSubmitting}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-70"
              >
                {ownerInviteSubmitting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading studios...</div>
      ) : studios.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No studios found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studios.map((studio) => (
            <div key={studio.uuid} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setShowCreateForm(false); setEditingStudio(studio); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Studio"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(studio)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Studio"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">{studio.name}</h3>
              <div className="flex items-center gap-2 text-slate-500 mt-2 text-sm">
                <MapPin size={16} />
                <span>{studio.address}, {studio.city}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-slate-400 font-mono">
                ID: {studio.uuid}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
