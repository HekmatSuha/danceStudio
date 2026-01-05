"use client";

import React, { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createRoom,
  deleteRoom,
  fetchRooms,
  updateRoom,
  type Room,
} from "../../../../lib/studios";
import { useOwnerStudiosGuard } from "../../../../lib/useOwnerStudiosGuard";

export default function OwnerRoomsPage() {
  const { studios, loading, role } = useOwnerStudiosGuard();
  const [selectedStudioId, setSelectedStudioId] = useState<string>("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (!selectedStudioId && studios.length) {
      setSelectedStudioId(studios[0].uuid);
    }
  }, [studios, selectedStudioId]);

  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedStudioId) {
        setRooms([]);
        return;
      }
      try {
        const data = await fetchRooms(selectedStudioId);
        setRooms(data);
      } catch (err) {
        console.warn("Failed to load rooms", err);
      }
    };
    loadRooms();
  }, [selectedStudioId]);

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudioId) return;
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await createRoom({
        studioId: selectedStudioId,
        name: formData.get("name") as string,
        capacity: Number(formData.get("capacity")),
        pricePerHour: formData.get("pricePerHour")
          ? Number(formData.get("pricePerHour"))
          : undefined,
        currency: (formData.get("currency") as string) || "USD",
      });
      const data = await fetchRooms(selectedStudioId);
      setRooms(data);
      setShowForm(false);
      form.reset();
    } catch (err) {
      console.error(err);
      const message =
        (err as { message?: string; details?: string })?.message ||
        (err as { details?: string })?.details ||
        "Failed to create room.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRoom) return;
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await updateRoom(editingRoom.id, {
        name: formData.get("name") as string,
        capacity: Number(formData.get("capacity")),
        pricePerHour: formData.get("pricePerHour")
          ? Number(formData.get("pricePerHour"))
          : null,
        currency: (formData.get("currency") as string) || "USD",
      });
      const data = await fetchRooms(selectedStudioId);
      setRooms(data);
      setEditingRoom(null);
    } catch (err) {
      console.error(err);
      const message =
        (err as { message?: string; details?: string })?.message ||
        (err as { details?: string })?.details ||
        "Failed to update room.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(`Delete room "${room.name}"?`)) return;
    setSubmitting(true);
    try {
      await deleteRoom(room.id);
      const data = await fetchRooms(selectedStudioId);
      setRooms(data);
    } catch (err) {
      console.error(err);
      const message =
        (err as { message?: string; details?: string })?.message ||
        (err as { details?: string })?.details ||
        "Failed to delete room.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const canManageSelectedStudio = Boolean(selectedStudioId);

  if (loading) {
    return <div className="p-6 text-slate-500">Loading rooms...</div>;
  }
  if (role === "owner" && studios.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rooms</h1>
          <p className="text-slate-600 mt-1">Manage studio classrooms and capacities.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
            disabled={!canManageSelectedStudio || submitting}
            title={
              canManageSelectedStudio
                ? "Add a room"
                : "You do not have permission to manage rooms for this studio."
            }
          >
            <Plus size={18} />
            Add Room
          </button>
        )}
      </div>

      <div className="mb-6 max-w-lg">
        <label className="block text-sm font-medium text-gray-700 mb-1">Studio</label>
        <select
          value={selectedStudioId}
          onChange={(e) => setSelectedStudioId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
          disabled={loading}
        >
          {studios.map((studio) => (
            <option key={studio.uuid} value={studio.uuid}>
              {studio.name}
            </option>
          ))}
        </select>
        {!loading && studios.length > 0 && !canManageSelectedStudio && (
          <p className="text-sm text-amber-600 mt-2">
            You can view rooms, but you do not have permission to create or edit
            rooms for this studio.
          </p>
        )}
      </div>

      {showForm && (
        <div className="mb-8 max-w-2xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Create Room</h3>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
              <input name="name" required className="w-full border border-gray-300 p-2 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                <input name="capacity" type="number" min="1" required className="w-full border border-gray-300 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price/Hour</label>
                <input name="pricePerHour" type="number" min="0" className="w-full border border-gray-300 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select name="currency" className="w-full border border-gray-300 p-2 rounded-lg bg-white">
                  <option value="USD">USD</option>
                  <option value="KZT">KZT</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70">
                {submitting ? "Creating..." : "Create Room"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingRoom && (
        <div className="mb-8 max-w-2xl bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Edit Room</h3>
          <form onSubmit={handleEditRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
              <input name="name" defaultValue={editingRoom.name} required className="w-full border border-gray-300 p-2 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                <input name="capacity" type="number" min="1" defaultValue={editingRoom.capacity} required className="w-full border border-gray-300 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price/Hour</label>
                <input name="pricePerHour" type="number" min="0" defaultValue={editingRoom.price_per_hour ?? ""} className="w-full border border-gray-300 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select name="currency" defaultValue={editingRoom.currency || "USD"} className="w-full border border-gray-300 p-2 rounded-lg bg-white">
                  <option value="USD">USD</option>
                  <option value="KZT">KZT</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingRoom(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70">
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No rooms found. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{room.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">Capacity: {room.capacity}</p>
                  {room.price_per_hour !== undefined && (
                    <p className="text-sm text-slate-500 mt-1">
                      Price/Hour: {room.currency || "USD"} {room.price_per_hour}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingRoom(room)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit room"
                    type="button"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete room"
                    type="button"
                    disabled={submitting}
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
