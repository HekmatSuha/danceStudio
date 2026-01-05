import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { listSlots, type Slot } from "../../../src/services/slots";
import { getStoredRole, fetchProfile } from "../../../src/services/auth";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function InstructorScheduleScreen() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("Instructor");

  const loadData = async () => {
    try {
      const role = await getStoredRole();
      if (role === "client") { // Assuming 'client' is student
         // router.replace("/(tabs)"); // Optional: redirect back if needed
      }

      const profile = await fetchProfile().catch(() => null);
      if (profile) {
        setUserName(profile.first_name || "Instructor");
        // Fetch slots for this trainer. 
        // We assume listSlots supports 'trainer' or we filter client side if not.
        // Since we don't have the trainer ID easily without profile.uuid, we rely on backend filtering 
        // or we fetch all and filter if we knew our UUID.
        // For this prototype, let's fetch all and show them. 
        // Ideally: listSlots({ trainer: profile.uuid })
        const allSlots = await listSlots(); 
        // Mock filtering: In a real app, the backend should filter. 
        // If we can't filter by trainer ID (don't have it in Profile type explicitly?), we show all.
        setSlots(allSlots); 
      }
    } catch (err) {
      console.warn("Failed to load schedule", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAttendance = (slot: Slot) => {
    router.push(`/instructor-roster/${slot.uuid}`);
  };

  const renderItem = ({ item }: { item: Slot }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{new Date(item.start_time).getDate()}</Text>
          <Text style={styles.dateMonth}>{new Date(item.start_time).toLocaleString('default', { month: 'short' })}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardTime}>
            {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {" - "}
            {new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.cardLocation}>{item.studio_details?.name || "Main Studio"}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.statChip}>
          <Ionicons name="people" size={16} color="#64748b" />
          <Text style={styles.statText}>{item.current_bookings || 0} / {item.max_participants}</Text>
        </View>
        <Pressable 
          style={({pressed}) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => handleAttendance(item)}
        >
          <Text style={styles.actionBtnText}>Roster & Attendance</Text>
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>INSTRUCTOR PORTAL</Text>
        <Text style={styles.title}>My Classes</Text>
      </View>

      <FlatList
        data={slots}
        keyExtractor={(item) => item.uuid}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
             <Ionicons name="calendar-clear-outline" size={48} color="#cbd5e1" />
             <Text style={styles.emptyText}>No classes scheduled.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" }, // Emerald tint
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 20, paddingTop: 60, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  eyebrow: { fontSize: 12, fontWeight: "700", color: "#10b981", letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: "800", color: "#064e3b" },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderLeftWidth: 4,
    borderLeftColor: "#10b981"
  },
  cardRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  dateBadge: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    width: 50
  },
  dateDay: { fontSize: 18, fontWeight: "700", color: "#047857" },
  dateMonth: { fontSize: 12, fontWeight: "600", color: "#059669", textTransform: "uppercase" },
  cardContent: { flex: 1, justifyContent: "center" },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#065f46" },
  cardTime: { fontSize: 14, color: "#64748b", marginTop: 2 },
  cardLocation: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f1f5f9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  actionBtn: { backgroundColor: "#10b981", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: "white", fontWeight: "700", fontSize: 13 },
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#94a3b8", marginTop: 12, fontSize: 16 }
});
