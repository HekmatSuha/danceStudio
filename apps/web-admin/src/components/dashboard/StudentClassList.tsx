"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Loader2,
  Clock3,
  Search,
} from "lucide-react";
import { fetchClasses, type ClassEvent } from "../../lib/classes";
import { fetchDanceStyles, type DanceStyle } from "../../lib/danceStyles";
import { useAuthUser } from "../../lib/useAuthUser";
import {
  cancelBooking,
  fetchUserBookings,
  type Booking,
} from "../../lib/bookings";

type ActionState = {
  [classId: string]: boolean;
};

export function StudentClassList() {
  const { user } = useAuthUser();
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [danceStyles, setDanceStyles] = useState<DanceStyle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<ActionState>({});
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [classesData, stylesData] = await Promise.all([
          fetchClasses(),
          fetchDanceStyles(),
        ]);
        
        const now = Date.now();
        const upcoming = classesData.filter((c) => c.startAt > now);
        setClasses(upcoming);
        setDanceStyles(stylesData);
      } catch (err) {
        console.error(err);
        setError("Unable to load classes right now.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadBookings = async () => {
      if (!user) {
        setBookings([]);
        return;
      }
      try {
      const data = await fetchUserBookings();
      setBookings(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadBookings();
  }, [user]);

  const bookingMap = useMemo(() => {
    const map: Record<string, Booking> = {};
    bookings
      .filter((b) => b.status?.toLowerCase() !== "cancelled")
      .forEach((b) => {
      map[b.appointment_slot] = b;
    });
    return map;
  }, [bookings]);

  const filteredClasses = useMemo(() => {
    return classes
      .filter((c) => Boolean(bookingMap[c.id]))
      .filter((c) => {
        if (
          selectedStyle &&
          !c.title.toLowerCase().includes(selectedStyle.toLowerCase()) &&
          !c.description?.toLowerCase().includes(selectedStyle.toLowerCase())
        ) {
          return false;
        }
        if (selectedDate && !isSameDay(new Date(c.startAt), new Date(selectedDate))) {
          return false;
        }
        return true;
      });
  }, [classes, bookingMap, selectedStyle, selectedDate]);

  const setBusy = (classId: string, value: boolean) =>
    setActionState((prev) => ({ ...prev, [classId]: value }));

  const updateClassCounts = (
    classId: string,
    delta: { reserved?: number; waitlist?: number },
  ) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? {
              ...c,
              reservedCount: (c.reservedCount ?? 0) + (delta.reserved ?? 0),
              waitlistCount: (c.waitlistCount ?? 0) + (delta.waitlist ?? 0),
            }
          : c,
      ),
    );
  };

  const handleCancel = async (booking: Booking) => {
    const classId = booking.appointment_slot;
    setError(null);
    setBusy(classId, true);
    try {
      await cancelBooking(booking.uuid);
      setBookings((prev) => prev.filter((b) => b.uuid !== booking.uuid));
      if (booking.status?.toLowerCase() === "confirmed") {
        updateClassCounts(classId, { reserved: -1 });
      } else if (booking.status?.toLowerCase() === "waitlisted") {
        updateClassCounts(classId, { waitlist: -1 });
      }
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel this booking right now.",
      );
    } finally {
      setBusy(classId, false);
    }
  };

  const renderCTA = (c: ClassEvent) => {
    const booking = bookingMap[c.id];
    const busy = actionState[c.id];
    const seatsTaken = c.reservedCount ?? 0;
    const capacity = c.capacity || 1;
    if (!booking) {
      return null;
    }

    const isWaitlisted = booking.status?.toLowerCase() === "waitlisted";
    return (
      <button
        onClick={() => handleCancel(booking)}
        disabled={busy}
        className="text-red-500 font-semibold text-sm hover:text-red-700 flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Clock3 size={16} />}
        {isWaitlisted ? "Leave waitlist" : "Cancel booking"}
      </button>
    );
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading available classes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <select 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white appearance-none"
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
          >
            <option value="">All Dance Styles</option>
            {danceStyles.map(style => (
              <option key={style.uuid} value={style.name}>{style.name}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full md:w-auto relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="date" 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {filteredClasses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">No bookings found for the selected filters.</p>
          <button
            onClick={() => {
              setSelectedStyle("");
              setSelectedDate("");
            }}
            className="mt-2 text-purple-600 font-medium hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((c) => {
            const booking = bookingMap[c.id];
            const seatsTaken = c.reservedCount ?? 0;
            const waitlist = c.waitlistCount ?? 0;
            const capacity = c.capacity || 1;
            const percentFilled = Math.min(
              100,
              Math.round((seatsTaken / capacity) * 100),
            );
            const bookingStatus = booking?.status?.toLowerCase();
            const statusColor =
              bookingStatus === "pending"
                ? "bg-amber-100 text-amber-700"
                : bookingStatus === "waitlisted"
                ? "bg-amber-100 text-amber-700"
                : bookingStatus === "confirmed"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600";

            return (
              <div
                key={c.id}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col h-full"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider mb-2 ${
                        c.level === "beginner"
                          ? "bg-green-100 text-green-700"
                          : c.level === "intermediate"
                          ? "bg-yellow-100 text-yellow-700"
                          : c.level === "advanced"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {c.level}
                    </span>
                    <h4 className="text-lg font-bold text-gray-900 leading-tight">
                      {c.title}
                    </h4>
                    {c.teacherName && (
                      <p className="text-xs text-gray-500 mt-1">With {c.teacherName}</p>
                    )}
                  </div>
                  {booking && (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>
                      {bookingStatus === "pending"
                        ? "Payment pending"
                        : bookingStatus === "waitlisted"
                        ? "Waitlisted"
                        : bookingStatus === "confirmed"
                        ? "Confirmed"
                        : "Booked"}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4 flex-grow">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>{format(new Date(c.startAt), "EEE, MMM d")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span>
                      {format(new Date(c.startAt), "h:mm a")} -{" "}
                      {format(new Date(c.endAt), "h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{c.locationName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span>
                      {seatsTaken}/{capacity} filled
                      {waitlist > 0 ? ` - ${waitlist} waitlisted` : ""}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        percentFilled > 90
                          ? "bg-red-400"
                          : percentFilled > 70
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-auto">
                  <span className="font-bold text-gray-900 text-lg">${c.price}</span>
                  {renderCTA(c)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
