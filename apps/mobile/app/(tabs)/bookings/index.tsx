import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listBookings, cancelBooking, type Booking } from "../../../src/services/bookings";
import { router } from "expo-router";
import { supabase } from "../../../src/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FILTER_CHIPS = [
  { id: "teacher", label: "Select a teacher" },
  { id: "room", label: "All rooms" },
  { id: "type", label: "Type" },
  { id: "format", label: "Format" },
];

const ACCENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const isMounted = useRef(true);
  const visibleBookings = showArchived
    ? bookings
    : bookings.filter((b) => b.status !== "cancelled");
  const selectedIsPaid = selectedBooking?.status?.toLowerCase() === "confirmed";

  const renderDateLabel = (booking: Booking | null) => {
    if (!booking) return "Date TBD";
    const start = booking.slot?.start_time;
    const dateValue = start || booking.booking_date;
    if (!dateValue) return "Date TBD";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Date TBD";
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  const renderTimeLabel = (booking: Booking | null) => {
    if (!booking) return "Time TBD";
    const start = booking.slot?.start_time;
    if (!start) return "Time TBD";
    const date = new Date(start);
    if (Number.isNaN(date.getTime())) return "Time TBD";
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const renderTrainerLabel = (booking: Booking | null) => {
    if (!booking) return "Instructor TBA";
    const trainer = booking.slot?.trainer_details?.trainer_details;
    if (!trainer?.first_name) return "Instructor TBA";
    return `${trainer.first_name} ${trainer.last_name || ""}`.trim();
  };

  const renderDateKey = (value?: string | null) => {
    if (!value) return "unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "unknown";
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const renderDateHeading = (value?: string | null) => {
    if (!value) return "Date TBD";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date TBD";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const renderTimeRange = (start?: string | null, end?: string | null) => {
    if (!start) return "Time TBD";
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return "Time TBD";
    const startLabel = startDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (!end) return startLabel;
    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) return startLabel;
    const endLabel = endDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${startLabel} - ${endLabel}`;
  };

  const scheduleGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        dateValue: string;
        timeSlots: Map<
          string,
          { startTime: number; label: string; items: Booking[] }
        >;
      }
    >();

    visibleBookings.forEach((booking) => {
      const dateValue = booking.slot?.start_time || booking.booking_date || "";
      const dateKey = renderDateKey(dateValue);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { dateValue, timeSlots: new Map() });
      }
      const group = grouped.get(dateKey);
      if (!group) return;
      const start = booking.slot?.start_time || booking.booking_date || "";
      const end = booking.slot?.end_time || "";
      const timeLabel = renderTimeRange(start, end);
      const startTime = start ? new Date(start).getTime() : Number.MAX_SAFE_INTEGER;
      if (!group.timeSlots.has(timeLabel)) {
        group.timeSlots.set(timeLabel, {
          startTime,
          label: timeLabel,
          items: [],
        });
      }
      const timeGroup = group.timeSlots.get(timeLabel);
      if (timeGroup) {
        timeGroup.items.push(booking);
      }
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({
        key,
        dateLabel: renderDateHeading(value.dateValue),
        timeSlots: Array.from(value.timeSlots.values()).sort(
          (a, b) => a.startTime - b.startTime
        ),
      }));
  }, [visibleBookings]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }
      const cacheKey = `dancecrm.cache.bookings.${userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached && isMounted.current) {
        try {
          const parsed = JSON.parse(cached) as Booking[];
          if (Array.isArray(parsed)) {
            setBookings(parsed);
            setLoading(false);
          }
        } catch {
          // ignore cache parse errors
        }
      }

      const dataFresh = await listBookings();
      if (!isMounted.current) return;
      setBookings(dataFresh);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(dataFresh));
    } catch (err: any) {
      if (isMounted.current) {
        Alert.alert("Error", err?.message || "Failed to load bookings.");
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    load();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleCancel = async (bookingId: string) => {
    setWorkingId(bookingId);
    try {
      await cancelBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.uuid !== bookingId));
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Unable to cancel booking.");
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Schedule</Text>
            <Text style={styles.subtitle}>{visibleBookings.length} classes booked</Text>
          </View>
          <Pressable style={styles.addButton}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {FILTER_CHIPS.map((chip) => (
            <Pressable key={chip.id} style={styles.filterChip}>
              <Text style={styles.filterText}>{chip.label}</Text>
              <Ionicons name="chevron-down" size={14} color="#6b7280" />
            </Pressable>
          ))}
          <Pressable style={styles.viewChip}>
            <Text style={styles.filterText}>List</Text>
            <Ionicons name="chevron-down" size={14} color="#6b7280" />
          </Pressable>
        </ScrollView>

        <View style={styles.toggleRow}>
          <Switch
            value={showArchived}
            onValueChange={setShowArchived}
            trackColor={{ false: "#e5e7eb", true: "#c7d2fe" }}
            thumbColor={showArchived ? "#4f46e5" : "#ffffff"}
          />
          <Text style={styles.toggleLabel}>Show archived</Text>
        </View>

        {visibleBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No scheduled classes</Text>
            <Text style={styles.subtle}>
              Book a class and it will show up here with all the details.
            </Text>
          </View>
        ) : (
          scheduleGroups.map((dateGroup) => (
            <View key={dateGroup.key} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{dateGroup.dateLabel}</Text>
              <View style={styles.dayDivider} />
              {dateGroup.timeSlots.map((timeSlot, slotIndex) => (
                <View key={`${dateGroup.key}-${timeSlot.label}`} style={styles.timeRow}>
                  <Text style={styles.timeLabel}>{timeSlot.label}</Text>
                  <View style={styles.classList}>
                    {timeSlot.items.map((booking, index) => {
                      const accent = ACCENT_COLORS[(slotIndex + index) % ACCENT_COLORS.length];
                      const title = booking.slot?.title || "Class Reservation";
                      const studio = booking.slot?.studio_details?.name || "Studio";
                      const style = booking.slot?.dance_style_details?.name;
                      const trainer = renderTrainerLabel(booking);
                      return (
                        <Pressable
                          key={booking.uuid}
                          style={styles.classCard}
                          onPress={() => setSelectedBooking(booking)}
                        >
                          <View style={[styles.accentBar, { backgroundColor: accent }]} />
                          <View style={styles.classContent}>
                            <View style={styles.classHeader}>
                              <Text style={styles.classTitle}>{title}</Text>
                              {style ? <Text style={styles.classMeta}>{style}</Text> : null}
                            </View>
                            <Text style={styles.classSub}>
                              {studio} · {trainer}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selectedBooking}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBooking(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedBooking(null)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lesson details</Text>
              <Pressable onPress={() => setSelectedBooking(null)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color="#64748b" />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Class</Text>
                <Text style={styles.modalValue}>
                  {selectedBooking?.slot?.title || "Class Reservation"}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Room</Text>
                <Text style={styles.modalValue}>
                  {selectedBooking?.slot?.studio_details?.name || "Studio"}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Date</Text>
                <Text style={styles.modalValue}>{renderDateLabel(selectedBooking)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Time</Text>
                <Text style={styles.modalValue}>{renderTimeLabel(selectedBooking)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Teacher</Text>
                <Text style={styles.modalValue}>{renderTrainerLabel(selectedBooking)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Payment</Text>
                <Text style={styles.modalValue}>
                  {selectedIsPaid ? "Payment done" : selectedBooking?.status || "Pending"}
                </Text>
              </View>
              {selectedBooking?.client_notes ? (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Notes</Text>
                  <Text style={styles.modalValue}>{selectedBooking.client_notes}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalButton}
                onPress={() => setSelectedBooking(null)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </Pressable>
              {selectedBooking?.uuid ? (
                <Pressable
                  onPress={() => handleCancel(selectedBooking.uuid)}
                  style={({ pressed }) => [
                    styles.modalDanger,
                    pressed && { opacity: 0.85 },
                    (workingId === selectedBooking.uuid || selectedIsPaid) && { opacity: 0.6 },
                  ]}
                  disabled={workingId === selectedBooking.uuid || selectedIsPaid}
                >
                  {workingId === selectedBooking.uuid ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalDangerText}>
                      {selectedIsPaid ? "Payment done" : "Cancel booking"}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#4f46e5",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  filterRow: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 10,
  },
  viewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  dayCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4f46e5",
    textDecorationLine: "underline",
  },
  dayDivider: {
    height: 1,
    backgroundColor: "#eef2f7",
    marginVertical: 12,
  },
  timeRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
  },
  timeLabel: {
    width: 92,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  classList: {
    flex: 1,
    gap: 8,
  },
  classCard: {
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  accentBar: {
    width: 6,
  },
  classContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  classTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  classMeta: {
    fontSize: 12,
    color: "#64748b",
  },
  classSub: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  emptyState: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "white",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalClose: {
    padding: 6,
  },
  modalBody: {
    gap: 12,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  modalValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  modalFooter: {
    marginTop: 18,
    gap: 10,
  },
  modalButton: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalDanger: {
    backgroundColor: "#ef4444",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDangerText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
});
