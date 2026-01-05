"use client";

import React, { useState } from "react";
import { Plus, MapPin, Building2 } from "lucide-react";
import { createStudio } from "../../../../lib/studios";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";

const parseOptionalNumber = (value: FormDataEntryValue | null) => {
  if (value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function OwnerStudiosPage() {
  const { studios, loading, reload, role } = useOwnerStudiosGuard();
  const [showForm, setShowForm] = useState(false);

  const handleCreateStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    try {
      await createStudio({
        name: formData.get("name") as string,
        city: formData.get("city") as string,
        address: formData.get("address") as string,
        latitude: parseOptionalNumber(formData.get("latitude")),
        longitude: parseOptionalNumber(formData.get("longitude")),
      });
      setShowForm(false);
      reload();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to create studio. You might not have permission.";
      alert(msg);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading studios...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Studios</h1>
          <p className="text-slate-600 mt-1">Manage your studio locations.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={18} />
            Add Studio
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 max-w-2xl bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold mb-4">Add New Studio</h3>
          <form onSubmit={handleCreateStudio} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Studio Name *</label>
              <input name="name" required className="w-full border border-gray-300 p-2 rounded-lg" placeholder="e.g. Downtown Dance" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input name="city" required className="w-full border border-gray-300 p-2 rounded-lg" placeholder="e.g. New York" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input name="address" required className="w-full border border-gray-300 p-2 rounded-lg" placeholder="e.g. 123 Main St" />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input name="latitude" type="number" step="0.000001" min="-90" max="90" className="w-full border border-gray-300 p-2 rounded-lg" placeholder="e.g. 40.712776" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input name="longitude" type="number" step="0.000001" min="-180" max="180" className="w-full border border-gray-300 p-2 rounded-lg" placeholder="e.g. -74.005974" />
               </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Create Studio</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading studios...</div>
      ) : studios.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No studios found. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studios.map((studio) => (
            <div key={studio.uuid} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Building2 size={24} />
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">{studio.name}</h3>
              <div className="flex items-center gap-2 text-slate-500 mt-2 text-sm">
                <MapPin size={16} />
                <span>{studio.address}, {studio.city}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
