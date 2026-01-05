import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Switch,
  ActivityIndicator,
  Alert
} from "react-native";
import { listStudios, type Studio } from "../../src/services/studios";
import { listSlots, type Slot } from "../../src/services/slots";
import { listBookings, type Booking } from "../../src/services/bookings";
import { Fonts } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

type Range = "week" | "month";

const APPROVALS = [
  {
    id: "approve-1",
    name: "Renee Diaz",
    role: "Instructor",
    request: "Access to Studio A calendar",
  },
  {
    id: "approve-2",
    name: "Caleb Royce",
    role: "Front desk",
    request: "POS refund permissions",
  },
];

const PAYOUTS = [
  { id: "payout-1", label: "Stripe payout", amount: "$4,120", status: "Arrives Thu" },
  { id: "payout-2", label: "Apple Pay", amount: "$1,860", status: "Arrives Fri" },
];

export default function OwnerDashboardScreen() {
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<Range>("week");
  const [studioOpen, setStudioOpen] = useState(true);
  const [approvals, setApprovals] = useState(APPROVALS);
  
  const [studios, setStudios] = useState<Studio[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isWide = width >= 920;

  const loadData = async () => {
    try {
      const [studiosData, slotsData, bookingsData] = await Promise.all([
        listStudios(),
        listSlots(),
        listBookings(),
      ]);
      setStudios(studiosData);
      setSlots(slotsData);
      setBookings(bookingsData);
    } catch (err) {
      console.warn("Failed to load owner data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    // Derived stats
    const revenue = bookings.reduce((sum, b) => sum + (parseFloat(b.price || "20") || 20), 0);
    const revenueFormatted = `$${revenue.toLocaleString()}`;
    
    // Calculate occupancy
    const totalCapacity = slots.reduce((sum, s) => sum + (s.max_participants || 0), 0);
    const totalBooked = slots.reduce((sum, s) => sum + (s.current_bookings || 0), 0);
    const fillRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

    return [
      { label: "Est. Revenue", value: revenueFormatted, change: "from bookings" },
      { label: "Class fill", value: `${fillRate}%`, change: "avg occupancy" },
      { label: "Active Classes", value: `${slots.length}`, change: "scheduled" },
      { label: "Studios", value: `${studios.length}`, change: "active locations" },
    ];
  }, [bookings, slots, studios]);

  const upcomingClasses = useMemo(() => {
    const now = Date.now();
    return slots
      .filter(s => new Date(s.start_time).getTime() > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 3);
  }, [slots]);

  const handleApproval = (id: string) => {
    setApprovals((current) => current.filter((item) => item.id !== id));
    Alert.alert("Processed", "Request handled.");
  };

  if (loading) {
    return (
      <View style={styles.center}>
         <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroEyebrow}>Owner dashboard</Text>
          <Text style={styles.heroTitle}>DanceCRM Studio Control</Text>
          <Text style={styles.heroSubtitle}>
            Track revenue, staffing, and live classes across your locations.
          </Text>
        </View>
        <View style={styles.heroActions}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, studioOpen && styles.statusDotLive]} />
            <Text style={styles.statusText}>{studioOpen ? "Studio open" : "Closed"}</Text>
          </View>
          <Switch
            value={studioOpen}
            onValueChange={setStudioOpen}
            thumbColor={studioOpen ? "#0f172a" : "#cbd5f5"}
            trackColor={{ false: "#e2e8f0", true: "#fbbf24" }}
          />
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.segment}>
          {(["week", "month"] as Range[]).map((value) => (
            <Pressable
              key={value}
              onPress={() => setRange(value)}
              style={[styles.segmentButton, range === value && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, range === value && styles.segmentTextActive]}>
                {value === "week" ? "This week" : "This month"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.grid, isWide && styles.gridWide]}>
        {stats.map((card) => (
          <View key={card.label} style={[styles.card, isWide && styles.cardHalf]}>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardValue}>{card.value}</Text>
            <Text style={styles.cardChange}>{card.change}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.grid, isWide && styles.gridWide]}>
        <View style={[styles.card, styles.cardLarge, isWide && styles.cardHalf]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upcoming classes</Text>
            <Pressable style={styles.textButton}>
              <Text style={styles.textButtonLabel}>View all</Text>
            </Pressable>
          </View>
          {upcomingClasses.length === 0 ? (
             <Text style={styles.emptyText}>No upcoming classes scheduled.</Text>
          ) : (
             upcomingClasses.map((item) => (
              <View key={item.uuid} style={styles.listRow}>
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.listSubtle}>
                    {new Date(item.start_time).toLocaleString(undefined, {weekday:'short', hour:'2-digit', minute:'2-digit'})} · {item.studio_details?.name || "Studio"}
                  </Text>
                  <Text style={styles.listSubtle}>
                     {/* Check slot trainer details if available, else generic */}
                     Trainer: {item.trainer_details?.trainer_details?.first_name || "Assigned"}
                  </Text>
                </View>
                <View style={styles.listMeta}>
                  <Text style={styles.capacity}>{(item.current_bookings || 0)} / {item.max_participants}</Text>
                  <Pressable style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Manage</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, styles.cardLarge, isWide && styles.cardHalf]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Payouts</Text>
            <Pressable style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Export</Text>
            </Pressable>
          </View>
          {PAYOUTS.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>{item.label}</Text>
                <Text style={styles.listSubtle}>Processed</Text>
              </View>
              <View style={styles.listMeta}>
                <Text style={styles.listAmount}>{item.amount}</Text>
                <Text style={styles.listStatus}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.grid, isWide && styles.gridWide]}>
        <View style={[styles.card, styles.cardLarge, isWide && styles.cardHalf]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Access approvals</Text>
            <Text style={styles.cardHint}>{approvals.length} pending</Text>
          </View>
          {approvals.length === 0 ? (
            <Text style={styles.emptyText}>All caught up. No approvals waiting.</Text>
          ) : (
            approvals.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listSubtle}>
                    {item.role} · {item.request}
                  </Text>
                </View>
                <View style={styles.actionGroup}>
                  <Pressable
                    onPress={() => handleApproval(item.id)}
                    style={[styles.secondaryButton, styles.rejectButton]}
                  >
                    <Text style={[styles.secondaryButtonText, styles.rejectText]}>Decline</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleApproval(item.id)}
                    style={[styles.primaryButton, styles.approveButton]}
                  >
                    <Text style={styles.primaryButtonText}>Approve</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, styles.cardLarge, isWide && styles.cardHalf]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quick actions</Text>
          </View>
          <View style={styles.quickActions}>
            {[
              { id: "action-1", label: "Publish class" },
              { id: "action-2", label: "Send update" },
              { id: "action-3", label: "New membership" },
              { id: "action-4", label: "Add staff" },
            ].map((action) => (
              <Pressable key={action.id} style={styles.quickButton} onPress={() => Alert.alert(action.label, "Feature coming soon.")}>
                <Text style={styles.quickButtonText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Focus today</Text>
            <Text style={styles.noticeText}>
              Two instructors are under 60% utilization. Consider promoting their sessions.
            </Text>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Generate promo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8fafc" },
  pageContent: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  heroEyebrow: {
    color: "#fbbf24",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  heroTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 6,
    fontFamily: Fonts.rounded,
  },
  heroSubtitle: { color: "#cbd5f5", marginTop: 6, maxWidth: 360 },
  heroActions: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#94a3b8",
    marginRight: 8,
  },
  statusDotLive: { backgroundColor: "#22c55e" },
  statusText: { color: "white", fontSize: 12 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    padding: 4,
    borderRadius: 999,
  },
  segmentButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  segmentActive: { backgroundColor: "white" },
  segmentText: { color: "#64748b", fontWeight: "600" },
  segmentTextActive: { color: "#0f172a" },
  grid: { gap: 16, marginBottom: 16 },
  gridWide: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHalf: { width: "48%" },
  cardLarge: { minHeight: 220 },
  cardLabel: { color: "#64748b", fontSize: 12, textTransform: "uppercase" },
  cardValue: { fontSize: 24, fontWeight: "700", color: "#0f172a", marginTop: 6 },
  cardChange: { marginTop: 6, fontSize: 12, fontWeight: "600", color: "#16a34a" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  cardHint: { color: "#64748b", fontWeight: "600" },
  textButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  textButtonLabel: { color: "#0f172a", fontWeight: "600", fontSize: 12 },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  listInfo: { flex: 1, paddingRight: 8 },
  listTitle: { fontWeight: "700", color: "#0f172a" },
  listSubtle: { color: "#64748b", marginTop: 2, fontSize: 13 },
  listMeta: { alignItems: "flex-end", gap: 4 },
  listAmount: { fontWeight: "700", color: "#0f172a" },
  listStatus: { color: "#64748b", fontSize: 12 },
  capacity: { fontWeight: "700", color: "#0f172a" },
  actionGroup: { flexDirection: "row", gap: 8 },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryButtonText: { color: "#0f172a", fontWeight: "600", fontSize: 12 },
  primaryButton: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryButtonText: { color: "white", fontWeight: "700", fontSize: 12 },
  approveButton: { backgroundColor: "#16a34a" },
  rejectButton: { backgroundColor: "#fee2e2" },
  rejectText: { color: "#dc2626" },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickButton: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickButtonText: { fontWeight: "600", color: "#0f172a" },
  noticeCard: {
    marginTop: 16,
    backgroundColor: "#fef3c7",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  noticeTitle: { fontWeight: "700", color: "#92400e" },
  noticeText: { color: "#92400e" },
  emptyText: { color: "#64748b", paddingVertical: 8 },
});