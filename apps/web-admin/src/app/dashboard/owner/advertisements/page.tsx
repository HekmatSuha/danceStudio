"use client";

import React, { useState } from "react";
import { Plus, Trash2, Megaphone, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";

type Advertisement = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

// Mock data
const INITIAL_ADS: Advertisement[] = [
  {
    id: "1",
    title: "Summer Dance Camp",
    description: "Join us for a week of intensive training!",
    imageUrl: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&q=80&w=300",
    isActive: true,
  },
  {
    id: "2",
    title: "New Salsa Beginners Class",
    description: "Starting next Monday. Sign up now!",
    imageUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=300",
    isActive: true,
  }
];

export default function AdvertisementsPage() {
  const { studios, loading, role } = useOwnerStudiosGuard();
  const [ads, setAds] = useState<Advertisement[]>(INITIAL_ADS);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Mock API call
    setTimeout(() => {
      const newAd: Advertisement = {
        id: Math.random().toString(36).substring(7),
        title,
        description,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?auto=format&fit=crop&q=80&w=300",
        isActive: true,
      };
      setAds([newAd, ...ads]);
      
      // Reset form
      setTitle("");
      setDescription("");
      setImageUrl("");
      setShowForm(false);
      setSubmitting(false);
    }, 800);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;
    setAds(ads.filter(ad => ad.id !== id));
  };

  const toggleActive = (id: string) => {
    setAds(ads.map(ad => ad.id === id ? { ...ad, isActive: !ad.isActive } : ad));
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
             <Megaphone className="text-purple-600" />
             Advertisements
          </h1>
          <p className="text-slate-600 mt-1">Manage promotional banners seen by your students.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            Create Ad
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 max-w-2xl bg-white p-6 rounded-2xl border border-purple-100 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold mb-4">New Advertisement</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input 
                required 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="e.g. Special Workshop"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="Short details about the offer..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input 
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for a random dance image.</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting} 
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-md font-medium disabled:opacity-70 flex items-center gap-2"
              >
                {submitting ? "Creating..." : "Publish Ad"}
              </button>
            </div>
          </form>
        </div>
      )}

      {ads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <ImageIcon className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No advertisements yet</h3>
          <p className="text-slate-500 mt-1">Create your first ad to promote events or offers.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <div key={ad.id} className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                <img 
                  src={ad.imageUrl} 
                  alt={ad.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md ${
                    ad.isActive ? "bg-emerald-500/90 text-white" : "bg-slate-500/90 text-white"
                  }`}>
                    {ad.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{ad.title}</h3>
                </div>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{ad.description}</p>
                
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <button
                    onClick={() => toggleActive(ad.id)}
                    className="text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors"
                  >
                    {ad.isActive ? "Deactivate" : "Activate"}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(ad.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete ad"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
