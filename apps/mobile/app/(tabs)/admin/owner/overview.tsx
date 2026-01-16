import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../../../src/lib/supabase";
import { fetchMyStudios } from "../../../../src/services/studios";
import { getStoredRole } from "../../../../src/services/auth";

type SlotRow = {
  uuid: string;
  start_time: string;
  price?: number | null;
  currency?: string | null;
  max_participants?: number | null;
};

type BookingRow = {
  uuid: string;
  appointment_slot: string;
  status?: string | null;
};

export default function OwnerOverviewScreen() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [studioCount, setStudioCount] = useState(0);
  const [slotCount, setSlotCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [occupancy, setOccupancy] = useState(0);
  const [revenueLabel, setRevenueLabel] = useState("0");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const storedRole = await getStoredRole();
      if (!mounted) return;
      setRole(storedRole);
      try {
        const studios = await fetchMyStudios();
        const studioIds = studios.map((s) => s.uuid);
        setStudioCount(studioIds.length);
        if (studioIds.length === 0) {
          setLoading(false);
          return;
        }

        const { data: slotsData } = await supabase
          .from("slots")
          .select("uuid, start_time, price, currency, max_participants")
          .in("studio_id", studioIds);
        const slots = (slotsData as SlotRow[] | null | undefined) ?? [];
        const slotIds = slots.map((s) => s.uuid);
        setSlotCount(slots.length);

        let bookings: BookingRow[] = [];
        if (slotIds.length > 0) {
          const { data: bookingsData } = await supabase
            .from("bookings")
            .select("uuid, appointment_slot, status")
            .in("appointment_slot", slotIds);
          bookings = (bookingsData as BookingRow[] | null | undefined) ?? [];
        }

        const now = Date.now();
        const upcoming = slots.filter((s) => new Date(s.start_time).getTime() > now).length;
        const totalCapacity = slots.reduce(
          (sum, s) => sum + (s.max_participants ?? 0),
          0
        );
        const confirmedBookings = bookings.filter((b) => b.status !== "cancelled");
        const occupancyValue =
          totalCapacity > 0 ? Math.round((confirmedBookings.length / totalCapacity) * 100) : 0;
        const revenue = confirmedBookings.reduce((sum, booking) => {
          const slot = slots.find((s) => s.uuid === booking.appointment_slot);
          return sum + (slot?.price ?? 0);
        }, 0);

        setUpcomingCount(upcoming);
        setBookingCount(bookings.length);
        setOccupancy(occupancyValue);
        setRevenueLabel(revenue.toLocaleString());
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

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

  const cards = useMemo(
    () => [
      { label: "Studios", value: `${studioCount}`, icon: "business-outline" as const },
      { label: "Bookings", value: `${bookingCount}`, icon: "ticket-outline" as const },
      { label: "Upcoming", value: `${upcomingCount}`, icon: "calendar-outline" as const },
      { label: "Occupancy", value: `${occupancy}%`, icon: "stats-chart-outline" as const },
      { label: "Revenue", value: revenueLabel, icon: "wallet-outline" as const },
    ],
    [studioCount, bookingCount, upcomingCount, occupancy, revenueLabel]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>Owner Dashboard</Text>
        <Text style={styles.subtitle}>Your studio performance at a glance.</Text>

        <View style={styles.cardGrid}>
          {cards.map((card) => (
            <View key={card.label} style={styles.statCard}>
              <Ionicons name={card.icon} size={18} color="#0f172a" />
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={styles.statValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actions}>
          {[
            { label: "Classes", icon: "calendar-outline", route: "/(tabs)/admin/owner/classes" },
            { label: "Requests", icon: "shield-checkmark-outline", route: "/(tabs)/admin/owner/requests" },
            { label: "Payments", icon: "wallet-outline", route: "/(tabs)/admin/owner/payments" },
          ].map((item) => (
            <Pressable
              key={item.label}
              style={styles.actionCard}
              onPress={() => router.push(item.route)}
            >
              <Ionicons name={item.icon as any} size={20} color="#0f172a" />
              <Text style={styles.actionText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  page: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#64748b", marginTop: 6 },
  cardGrid: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  statLabel: { fontSize: 12, color: "#64748b" },
  statValue: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  sectionTitle: { marginTop: 24, fontSize: 16, fontWeight: "700", color: "#0f172a" },
  actions: { marginTop: 12, flexDirection: "row", gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    gap: 6,
  },
  actionText: { fontSize: 12, fontWeight: "600", color: "#0f172a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  subtle: { color: "#94a3b8" },
});
