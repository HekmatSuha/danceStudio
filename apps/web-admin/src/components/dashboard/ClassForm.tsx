"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { createClass, type CreateClassInput } from "../../lib/classes";
import { useAuthUser } from "../../lib/useAuthUser";
import { fetchMyStudios, type Studio, fetchRooms, type Room, createRoom } from "../../lib/studios";
import { fetchTrainers, type Trainer } from "../../lib/trainers";
import { fetchDanceStyles, type DanceStyle } from "../../lib/danceStyles";
import { supabase } from "../../lib/supabase";
import Image from "next/image";

interface ClassFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClassForm({ onSuccess, onCancel }: ClassFormProps) {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [studios, setStudios] = useState<Studio[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [styles, setStyles] = useState<DanceStyle[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomSubmitting, setRoomSubmitting] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState(20);
  const [roomPricePerHour, setRoomPricePerHour] = useState("");

  const [formData, setFormData] = useState<Partial<CreateClassInput>>({
    title: "",
    description: "",
    price: 0,
    currency: "USD",
    capacity: 10,
    studioId: "",
    trainerId: "",
    danceStyleId: "",
  });

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "specific">("none");
  const [untilDate, setUntilDate] = useState("");
  const [specificDays, setSpecificDays] = useState<number[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(formData.title && formData.studioId && startDate && startTime),
    [formData.title, formData.studioId, startDate, startTime],
  );

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [studiosData, trainersData, stylesData] = await Promise.all([
          fetchMyStudios(),
          fetchTrainers(),
          fetchDanceStyles(),
        ]);
        setStudios(studiosData);
        setTrainers(trainersData);
        setStyles(stylesData);
        
        if (!formData.studioId && studiosData.length) {
          setFormData((prev) => ({ ...prev, studioId: studiosData[0].uuid }));
        }
      } catch (err) {
        console.warn("Failed to load form data", err);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [formData.studioId]);

  useEffect(() => {
    const loadRooms = async () => {
      if (!formData.studioId) {
        setRooms([]);
        return;
      }
      try {
        const data = await fetchRooms(formData.studioId);
        setRooms(data);
      } catch (err) {
        console.warn("Failed to load rooms", err);
        setRooms([]);
      }
    };
    loadRooms();
  }, [formData.studioId]);

  const handleCreateRoom = async () => {
    if (!formData.studioId) return;
    if (!roomName.trim()) {
      alert("Room name is required.");
      return;
    }
    setRoomSubmitting(true);
    try {
      await createRoom({
        studioId: formData.studioId,
        name: roomName.trim(),
        capacity: Number(roomCapacity),
        pricePerHour: roomPricePerHour
          ? Number(roomPricePerHour)
          : undefined,
      });
      const data = await fetchRooms(formData.studioId);
      setRooms(data);
      setShowRoomForm(false);
      setRoomName("");
      setRoomCapacity(20);
      setRoomPricePerHour("");
    } catch (err) {
      console.warn("Failed to create room", err);
      alert("Failed to create room.");
    } finally {
      setRoomSubmitting(false);
    }
  };

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (!canSubmit) {
      setError("Please fill in title, studio, date, and time.");
      return;
    }
    setLoading(true);
    try {
      const buildOccurrences = () => {
        const occurrences: Date[] = [];
        const base = new Date(`${startDate}T${startTime}`);
        const until = untilDate ? new Date(`${untilDate}T23:59:59`) : null;
        const maxOccurrences = 180;

        const addDays = (date: Date, days: number) => {
          const next = new Date(date);
          next.setDate(next.getDate() + days);
          return next;
        };

        if (recurrence === "none") {
          return [base];
        }

        if (recurrence === "daily") {
          let cursor = new Date(base);
          while (occurrences.length < maxOccurrences) {
            if (until && cursor > until) break;
            occurrences.push(new Date(cursor));
            cursor = addDays(cursor, 1);
          }
          return occurrences;
        }

        if (recurrence === "weekly") {
          let cursor = new Date(base);
          while (occurrences.length < maxOccurrences) {
            if (until && cursor > until) break;
            occurrences.push(new Date(cursor));
            cursor = addDays(cursor, 7);
          }
          return occurrences;
        }

        const days = new Set(specificDays);
        if (days.size === 0) return [base];

        let cursor = new Date(base);
        while (occurrences.length < maxOccurrences) {
          if (until && cursor > until) break;
          if (days.has(cursor.getDay())) {
            occurrences.push(new Date(cursor));
          }
          cursor = addDays(cursor, 1);
        }

        return occurrences;
      };

      const occurrences = buildOccurrences();
      let finalTrainerId = formData.trainerId;
      
      // Safe check for trainer role
      const isTrainer = Array.isArray(user?.roles)
        ? user.roles.some((r) => {
            if (typeof r === "string") {
              return r === "TRAINER" || r === "INSTRUCTOR";
            }
            if (typeof r === "object" && r && "code" in r) {
              const code = String((r as { code?: string }).code ?? "");
              return code === "TRAINER" || code === "INSTRUCTOR";
            }
            return false;
          })
        : typeof user?.roles === "string" &&
          (user.roles.includes("TRAINER") || user.roles.includes("INSTRUCTOR"));

      if (!finalTrainerId && isTrainer) {
          finalTrainerId = user?.uuid;
      }

      const formatRule = () => {
        if (recurrence === "none") return "";
        const until = untilDate ? `;UNTIL=${untilDate.replace(/-/g, "")}` : "";
        if (recurrence === "daily") return `FREQ=DAILY${until}`;
        if (recurrence === "weekly") return `FREQ=WEEKLY${until}`;
        const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
        const byDay = specificDays.map((d) => dayMap[d]).join(",");
        return `FREQ=WEEKLY;BYDAY=${byDay}${until}`;
      };

      const recurringRule = formatRule() || undefined;
      let imageUrl: string | null = null;

      if (imageFile) {
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const safeStartTime = startTime.replace(":", "");
        const path = `${formData.studioId}/${startDate}-${safeStartTime}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("class-images")
          .upload(path, imageFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const { data } = supabase.storage.from("class-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      for (const start of occurrences) {
        const end = new Date(start.getTime() + durationMinutes * 60000);
        await createClass({
          studioId: formData.studioId!,
          title: formData.title!,
          description: formData.description || "",
          price: Number(formData.price || 0),
          currency: formData.currency || "USD",
          capacity: Number(formData.capacity || 1),
          startAt: start,
          endAt: end,
          trainerId: finalTrainerId || undefined,
          danceStyleId: formData.danceStyleId,
          recurringRule,
          imageUrl,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create slot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">New Slot</h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Class Title *</label>
          <input
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Salsa Beginner 1"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Studio *</label>
          <select
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            value={formData.studioId ?? ""}
            onChange={(e) => setFormData({ ...formData, studioId: e.target.value })}
            disabled={loadingData}
          >
            {!formData.studioId && <option value="">Select a studio</option>}
            {studios.map((s) => (
              <option key={s.uuid} value={s.uuid}>
                {s.name} {s.city ? `• ${s.city}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Trainer</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            value={formData.trainerId ?? ""}
            onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
            disabled={loadingData}
          >
            <option value="">No specific trainer</option>
            {trainers.map((t) => (
              <option key={t.uuid} value={t.uuid}>
                {t.first_name} {t.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Room</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            value={formData.roomId ?? ""}
            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
            disabled={loadingData || !formData.studioId}
          >
            <option value="">No specific room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          {formData.studioId && rooms.length === 0 && (
            <button
              type="button"
              onClick={() => setShowRoomForm((prev) => !prev)}
              className="mt-2 text-sm text-purple-600 hover:text-purple-700"
            >
              {showRoomForm ? "Cancel new room" : "Create a new room"}
            </button>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Dance Style</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            value={formData.danceStyleId ?? ""}
            onChange={(e) => setFormData({ ...formData, danceStyleId: e.target.value })}
            disabled={loadingData}
          >
            <option value="">Select a style</option>
            {styles.map((s) => (
              <option key={s.uuid} value={s.uuid}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Date *</label>
          <input
            type="date"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Start Time *</label>
          <input
            type="time"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Duration (min)</label>
          <input
            type="number"
            min="15"
            step="15"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Repeat</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week (same day)</option>
            <option value="specific">Specific days</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Repeat Until</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
            min={startDate || undefined}
          />
        </div>

        {recurrence === "specific" && (
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Days of week</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Sun", value: 0 },
                { label: "Mon", value: 1 },
                { label: "Tue", value: 2 },
                { label: "Wed", value: 3 },
                { label: "Thu", value: 4 },
                { label: "Fri", value: 5 },
                { label: "Sat", value: 6 },
              ].map((day) => (
                <label
                  key={day.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                    specificDays.includes(day.value)
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={specificDays.includes(day.value)}
                    onChange={(e) => {
                      setSpecificDays((prev) =>
                        e.target.checked
                          ? [...prev, day.value]
                          : prev.filter((d) => d !== day.value)
                      );
                    }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1 col-span-2">
            <label className="text-sm font-medium text-gray-700">Price</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Currency</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
              value={formData.currency || "USD"}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            >
              <option value="USD">USD</option>
              <option value="KZT">KZT</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Capacity</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What will be taught in this class?"
        />
      </div>

      {showRoomForm && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <h4 className="text-sm font-semibold text-slate-700">New Room</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
                className="w-full border border-gray-300 p-2 rounded-lg bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                <input
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(Number(e.target.value))}
                  type="number"
                  min="1"
                  required
                  className="w-full border border-gray-300 p-2 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price/Hour</label>
                <input
                  value={roomPricePerHour}
                  onChange={(e) => setRoomPricePerHour(e.target.value)}
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 p-2 rounded-lg bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRoomForm(false)} className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button type="button" onClick={handleCreateRoom} disabled={roomSubmitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-70">
                {roomSubmitting ? "Creating..." : "Create Room"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Class Image (optional)</label>
        <input
          type="file"
          accept="image/*"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />
        {imagePreviewUrl && (
          <div className="relative h-40 w-full overflow-hidden rounded-lg border border-gray-200">
            <Image
              src={imagePreviewUrl}
              alt="Class preview"
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {loading ? "Creating..." : "Create Slot"}
        </button>
      </div>
    </form>
  );
}
