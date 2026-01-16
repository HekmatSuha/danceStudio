import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listBookings, cancelBooking, type Booking } from "../../../src/services/bookings";
import { router } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const visibleBookings = bookings.filter((b) => b.status !== "cancelled");

  const renderDateLabel = (booking: Booking) => {
    const start = booking.slot?.start_time;
    const dateValue = start || booking.booking_date;
    if (!dateValue) return "Date TBD";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Date TBD";
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  const renderTimeLabel = (booking: Booking) => {
    const start = booking.slot?.start_time;
    if (!start) return "Time TBD";
    const date = new Date(start);
    if (Number.isNaN(date.getTime())) return "Time TBD";
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const renderTrainerLabel = (booking: Booking) => {
    const trainer = booking.slot?.trainer_details?.trainer_details;
    if (!trainer?.first_name) return "Instructor TBA";
    return `${trainer.first_name} ${trainer.last_name || ""}`.trim();
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }
      const data = await listBookings();
      setBookings(data);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>My Reservations</Text>
          <Text style={styles.subtitle}>{visibleBookings.length} classes booked</Text>
        </View>
        {visibleBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No reservations yet</Text>
            <Text style={styles.subtle}>
              Book a class and it will show up here with all the details.
            </Text>
          </View>
        ) : (
          visibleBookings.map((b) => (
            <View key={b.uuid} style={styles.card}>
              <View style={styles.mediaRow}>
                <View style={styles.imageWrap}>
                  {b.slot?.image_url ? (
                    <Image source={{ uri: b.slot.image_url }} style={styles.image} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>
                        {b.slot?.dance_style_details?.name?.[0] || "C"}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.meta}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {b.slot?.title || "Class Reservation"}
                  </Text>
                  <Text style={styles.metaText}>
                    {b.slot?.studio_details?.name || "Studio"}{" "}
                    {b.slot?.studio_details?.city ? `- ${b.slot.studio_details.city}` : ""}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, b.status === "cancelled" && styles.badgeMuted]}>
                      <Text style={styles.badgeText}>
                        {b.status === "pending" ? "Payment pending" : b.status}
                      </Text>
                    </View>
                    {b.slot?.dance_style_details?.name ? (
                      <View style={[styles.badge, styles.badgeAlt]}>
                        <Text style={[styles.badgeText, styles.badgeAltText]}>
                          {b.slot.dance_style_details.name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{renderDateLabel(b)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{renderTimeLabel(b)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>
                    {b.slot?.price || b.price ? `$${b.slot?.price ?? b.price}` : "TBD"}
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <View>
                  <Text style={styles.trainerLabel}>Instructor</Text>
                  <Text style={styles.trainerValue}>{renderTrainerLabel(b)}</Text>
                </View>
                <Pressable
                  onPress={() => handleCancel(b.uuid)}
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    pressed && { opacity: 0.85 },
                    workingId === b.uuid && { opacity: 0.6 },
                  ]}
                  disabled={workingId === b.uuid}
                >
                  {workingId === b.uuid ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.cancelText}>Cancel</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    padding: 24,
  },
  header: {
    marginBottom: 20,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
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
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 16,
    marginBottom: 16,
  },
  mediaRow: {
    flexDirection: "row",
    gap: 16,
  },
  imageWrap: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  imagePlaceholderText: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
  },
  meta: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  metaText: {
    fontSize: 14,
    color: "#64748b",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
  },
  badgeMuted: {
    backgroundColor: "#e2e8f0",
  },
  badgeAlt: {
    backgroundColor: "#fef3c7",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    textTransform: "capitalize",
  },
  badgeAltText: {
    color: "#92400e",
    textTransform: "none",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  trainerLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  trainerValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cancelText: { color: "white", fontWeight: "700" },
});
