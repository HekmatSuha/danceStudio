"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ArrowLeft, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useAuthUser } from "../../lib/useAuthUser";
import { signOut, updateProfile } from "../../lib/auth";
import { getErrorMessage } from "../../lib/errors";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const { user, loading } = useAuthUser();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("F");
  const [danceLevel, setDanceLevel] = useState("Beginner");
  const [interests, setInterests] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.phone_number || "");
      setGender(user.gender || "F");
      setDanceLevel(user.dance_level || "Beginner");
      setInterests((user.interests || []).join(", "));
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const uploadAvatar = async () => {
    if (!user || !avatarFile) return null;
    setAvatarUploading(true);
    try {
      const safeName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.uuid}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const avatarUrl = await uploadAvatar();
      await updateProfile({
        firstName,
        lastName,
        phone,
        gender,
        danceLevel,
        interests: interests.split(",").map(s => s.trim()).filter(Boolean),
        avatarUrl: avatarUrl ?? undefined,
      });
      if (avatarUrl) {
        setAvatarPreview(avatarUrl);
        setAvatarFile(null);
      }
      setStatus("Profile updated.");
    } catch (err: unknown) {
      setStatus(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 bg-gray-50">
        <Loader2 className="animate-spin mr-2" /> Loading profile...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-4 mb-8 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-gray-500">
              Signed in as <strong>{user.email}</strong>
            </span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-red-100"
            >
              <LogOut size={18} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4">
        {status && (
          <div className="mb-6 rounded-xl px-4 py-3 text-sm flex items-center shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
            {status}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile photo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-semibold">
                    {user.first_name?.[0] || user.email?.[0] || "U"}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Profile photo</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <Upload size={16} />
                  {avatarUploading ? "Uploading..." : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">PNG or JPG up to 5MB.</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                value={user.email || ""}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none bg-white"
              >
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Dance Level</label>
              <select
                value={danceLevel}
                onChange={(e) => setDanceLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none bg-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Interests (comma separated)</label>
              <input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                placeholder="Salsa, Bachata, Ballet"
              />
            </div>
            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
