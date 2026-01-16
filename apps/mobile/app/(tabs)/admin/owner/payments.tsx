import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../src/lib/supabase";
import { fetchMyStudios } from "../../../../src/services/studios";
import { getStoredRole } from "../../../../src/services/auth";

type SlotRow = {
  uuid: string;
  title: string;
  start_time: string;
  price?: number | null;
  currency?: string | null;
};

type BookingRow = {
  appointment_slot: string;
  status?: string | null;
};

export default function OwnerPaymentsScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const storedRole = await getStoredRole();
      if (!mounted) return;
      setRole(storedRole);
      try {
        const studios = await fetchMyStudios();
        const studioIds = studios.map((s) => s.uuid);
        if (studioIds.length === 0) {
          setSlots([]);
          setBookings([]);
          return;
        }
        const { data: slotData } = await supabase
          .from("slots")
          .select("uuid, title, start_time, price, currency")
          .in("studio_id", studioIds);
        const slotRows = (slotData as SlotRow[] | null | undefined) ?? [];
        setSlots(slotRows);
        const slotIds = slotRows.map((s) => s.uuid);
        if (slotIds.length === 0) {
          setBookings([]);
          return;
        }
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("appointment_slot, status")
          .in("appointment_slot", slotIds);
        setBookings((bookingData as BookingRow[] | null | undefined) ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    const filteredSlots = slots.filter((slot) => {
      const start = new Date(slot.start_time).getTime();
      if (from && start < from) return false;
      if (to && start > to) return false;
      return true;
    });

    const rows = filteredSlots.map((slot) => {
      const slotBookings = bookings.filter((b) => b.appointment_slot === slot.uuid);
      const cancelled = slotBookings.filter((b) => b.status === "cancelled").length;
      const confirmed = slotBookings.length - cancelled;
      const revenue = confirmed * (slot.price ?? 0);
      return {
        id: slot.uuid,
        title: slot.title,
        date: new Date(slot.start_time).toLocaleDateString(),
        currency: slot.currency || "KZT",
        confirmed,
        cancelled,
        revenue,
      };
    });

    const totals = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.currency] = (acc[row.currency] || 0) + row.revenue;
      return acc;
    }, {});
    return { rows, totals };
  }, [slots, bookings, fromDate, toDate]);

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
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>Revenue summary by class.</Text>

        <View style={styles.filters}>
          <View style={styles.filterField}>
            <Text style={styles.label}>From (YYYY-MM-DD)</Text>
            <TextInput value={fromDate} onChangeText={setFromDate} style={styles.input} placeholder="2026-01-01" />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.label}>To (YYYY-MM-DD)</Text>
            <TextInput value={toDate} onChangeText={setToDate} style={styles.input} placeholder="2026-01-31" />
          </View>
        </View>

        {summary.rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.subtle}>No classes in this range.</Text>
          </View>
        ) : (
          summary.rows.map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.cardTitle}>{row.title}</Text>
              <Text style={styles.cardSub}>{row.date}</Text>
              <Text style={styles.cardMeta}>
                Confirmed: {row.confirmed} • Cancelled: {row.cancelled}
              </Text>
              <Text style={styles.cardRevenue}>
                {row.currency} {row.revenue.toLocaleString()}
              </Text>
            </View>
          ))
        )}

        {Object.keys(summary.totals).length > 0 ? (
          <View style={styles.totalWrap}>
            {Object.entries(summary.totals).map(([currency, total]) => (
              <Text key={currency} style={styles.totalText}>
                Total {currency}: {total.toLocaleString()}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  page: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#64748b", marginTop: 4, marginBottom: 16 },
  filters: { gap: 12, marginBottom: 16 },
  filterField: { gap: 6 },
  label: { fontSize: 12, color: "#64748b" },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#0f172a",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 12, color: "#64748b" },
  cardMeta: { fontSize: 12, color: "#94a3b8" },
  cardRevenue: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  totalWrap: { marginTop: 12, gap: 6 },
  totalText: { fontSize: 12, color: "#0f172a", fontWeight: "700" },
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
