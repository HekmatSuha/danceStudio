import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../../src/lib/supabase";
import { fetchMyStudios } from "../../../../src/services/studios";
import { getStoredRole } from "../../../../src/services/auth";

type PendingBooking = {
  uuid: string;
  status?: string | null;
  appointment_slot: string;
  slot?: { title?: string | null; start_time?: string | null; price?: number | null; currency?: string | null };
  user?: { first_name?: string | null; last_name?: string | null; email?: string | null };
};

export default function OwnerRequestsScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PendingBooking[]>([]);

  const load = async () => {
    setLoading(true);
    const storedRole = await getStoredRole();
    setRole(storedRole);
    try {
      const studios = await fetchMyStudios();
      const studioIds = studios.map((s) => s.uuid);
      if (studioIds.length === 0) {
        setRequests([]);
        return;
      }
      const { data: slotRows } = await supabase
        .from("slots")
        .select("uuid")
        .in("studio_id", studioIds);
      const slotIds = (slotRows as { uuid: string }[] | null | undefined)?.map((row) => row.uuid) ?? [];
      if (slotIds.length === 0) {
        setRequests([]);
        return;
      }
      const { data, error } = await supabase
        .from("bookings")
        .select("uuid, status, appointment_slot, slot:slots(title, start_time, price, currency), user:profiles(first_name, last_name, email)")
        .in("appointment_slot", slotIds)
        .eq("status", "pending");
      if (error) throw error;
      setRequests((data as PendingBooking[]) ?? []);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (bookingId: string, status: "confirmed" | "cancelled") => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("uuid", bookingId);
    if (error) {
      Alert.alert("Error", error.message || "Failed to update booking.");
      return;
    }
    setRequests((prev) => prev.filter((b) => b.uuid !== bookingId));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (role !== "owner" && role !== "instructor" && role !== "super_admin") {
    return (
      <View style={styles.center}>
        <Text style={styles.subtle}>Access restricted.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>Requests</Text>
        <Text style={styles.subtitle}>Confirm booking payments.</Text>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.subtle}>No pending requests.</Text>
          </View>
        ) : (
          requests.map((booking) => (
            <View key={booking.uuid} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{booking.slot?.title || "Class"}</Text>
                <Text style={styles.cardPrice}>
                  {booking.slot?.currency || "KZT"} {booking.slot?.price ?? 0}
                </Text>
              </View>
              <Text style={styles.cardSub}>
                {booking.slot?.start_time ? new Date(booking.slot.start_time).toLocaleString() : "Schedule pending"}
              </Text>
              <Text style={styles.cardSub}>
                {booking.user?.first_name} {booking.user?.last_name} • {booking.user?.email}
              </Text>
              <View style={styles.actions}>
                <Pressable style={styles.rejectBtn} onPress={() => updateStatus(booking.uuid, "cancelled")}>
                  <Ionicons name="close-circle-outline" size={16} color="white" />
                  <Text style={styles.actionText}>Reject</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={() => updateStatus(booking.uuid, "confirmed")}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                  <Text style={styles.actionText}>Confirm</Text>
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
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  page: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#64748b", marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
    gap: 6,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardPrice: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 12, color: "#64748b" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  rejectBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  actionText: { color: "white", fontWeight: "700", fontSize: 12 },
  emptyCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  subtle: { color: "#94a3b8" },
});
