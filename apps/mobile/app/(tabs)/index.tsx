import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Alert
} from "react-native";
import { listSlots, type Slot } from "../../src/services/slots";
import { listBookings, createBooking, type Booking } from "../../src/services/bookings";
import { fetchProfile, getStoredRole } from "../../src/services/auth";
import { router } from "expo-router";
import { getStoredTokens } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/theme";

export default function StudentDashboard() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [userName, setUserName] = useState("Dancer");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingInProcess, setBookingInProcess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const role = await getStoredRole();
      if (role === "owner") {
        router.replace("/(tabs)/owner-dashboard");
        return;
      }
      if (role === "instructor") {
        router.replace("/(tabs)/schedule");
        return;
      }

      const [slotsData, bookingsData, profileData] = await Promise.all([
        listSlots({ available_only: true }),
        listBookings(),
        fetchProfile().catch(() => null)
      ]);

      setSlots(slotsData);
      setMyBookings(bookingsData);
      if (profileData?.first_name) {
        setUserName(profileData.first_name);
      }
    } catch (err) {
      console.warn("Failed to load dashboard data", err);
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

  const nextClass = useMemo(() => {
    if (!myBookings.length) return null;
    const now = Date.now();
    // Assuming booking has a date field or we need to find the slot. 
    // Since Booking type is limited, we might not have the date directly if backend doesn't populate it.
    // For now, let's just take the first one or try to match with slots if possible, 
    // but slots list only contains *available* future slots usually.
    // We will rely on booking_date if present.
    const upcoming = myBookings
      .filter(b => b.booking_date && new Date(b.booking_date).getTime() > now)
      .sort((a, b) => new Date(a.booking_date!).getTime() - new Date(b.booking_date!).getTime());
    
    return upcoming[0] || null;
  }, [myBookings]);

  const handleBook = async (slot: Slot) => {
    const tokens = await getStoredTokens();
    if (!tokens) {
      router.replace("/(auth)/login");
      return;
    }
    setBookingInProcess(slot.uuid);
    try {
      await createBooking(slot.uuid);
      Alert.alert("Success", "Class booked successfully!");
      onRefresh();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to book class");
    } finally {
      setBookingInProcess(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const renderClassCard = ({ item }: { item: Slot }) => (
    <Pressable 
      style={({pressed}) => [styles.classCard, pressed && { opacity: 0.95 }]}
      onPress={() => router.push(`/class-details/${item.uuid}`)}
    >
      <View style={styles.classCardHeader}>
        <Text style={styles.classTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.classPrice}>${item.price}</Text>
      </View>
      <Text style={styles.classTime}>
        {new Date(item.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      </Text>
      <Text style={styles.classTime}>
        {new Date(item.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <View style={styles.classFooter}>
        <Text style={styles.studioName} numberOfLines={1}>{item.studio_details?.name || "Studio"}</Text>
        <View style={styles.bookBtn}>
            <Text style={styles.bookBtnText}>View</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{userName}</Text>
          </View>
          <Pressable style={styles.profileBtn} onPress={() => router.push("/(tabs)/profile")}>
             <Ionicons name="person-circle-outline" size={40} color="#64748b" />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{myBookings.length}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>-</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* Next Class */}
        <Text style={styles.sectionTitle}>Your Next Class</Text>
        {nextClass ? (
          <View style={styles.nextClassCard}>
             <View style={styles.nextClassIcon}>
               <Ionicons name="calendar" size={24} color="#8b5cf6" />
             </View>
             <View style={{ flex: 1 }}>
                <Text style={styles.nextClassLabel}>Upcoming</Text>
                <Text style={styles.nextClassDate}>
                  {new Date(nextClass.booking_date!).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.nextClassStatus}>Confirmed</Text>
             </View>
          </View>
        ) : (
           <View style={styles.emptyState}>
             <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
             <Text style={styles.emptyStateText}>No upcoming classes</Text>
             <Text style={styles.emptyStateSub}>Book your next session below!</Text>
           </View>
        )}

        {/* Available Classes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Classes</Text>
          <Pressable onPress={() => router.push("/(tabs)/bookings")}>
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={slots}
          keyExtractor={item => item.uuid}
          renderItem={renderClassCard}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}
          ListEmptyComponent={<Text style={{ padding: 20, color: '#64748b' }}>No classes available</Text>}
        />

        {/* Progress / History Placeholder */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Recent Progress</Text>
        </View>
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Ionicons name="trophy-outline" size={20} color="#eab308" />
            <Text style={styles.progressText}>You're doing great! Keep it up.</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '30%' }]} />
          </View>
          <Text style={styles.progressSub}>3/10 classes to next level</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 14, color: "#64748b", fontWeight: "600", letterSpacing: 0.5 },
  username: { fontSize: 26, color: "#0f172a", fontWeight: "800" },
  profileBtn: { padding: 4 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    justifyContent: "space-around",
    alignItems: "center"
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  statDivider: { width: 1, height: 24, backgroundColor: "#f1f5f9" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 },
  seeAllText: { color: "#8b5cf6", fontWeight: "600" },
  nextClassCard: {
    backgroundColor: "#8b5cf6",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  nextClassIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  nextClassLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  nextClassDate: { color: "white", fontSize: 16, fontWeight: "700", marginTop: 2 },
  nextClassStatus: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  emptyState: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed"
  },
  emptyStateText: { color: "#0f172a", fontWeight: "600", fontSize: 16, marginTop: 12 },
  emptyStateSub: { color: "#64748b", fontSize: 14, marginTop: 4 },
  classCard: {
    width: 240,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#f1f5f9"
  },
  classCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  classTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", flex: 1, marginRight: 8 },
  classPrice: { fontSize: 16, fontWeight: "700", color: "#8b5cf6" },
  classTime: { color: "#64748b", fontSize: 13, marginBottom: 2 },
  classFooter: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  studioName: { fontSize: 12, color: "#94a3b8", flex: 1, marginRight: 8 },
  bookBtn: { backgroundColor: "#0f172a", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bookBtnText: { color: "white", fontSize: 12, fontWeight: "700" },
  progressCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  progressText: { fontSize: 14, color: "#0f172a", fontWeight: "600" },
  progressBarBg: { height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  progressBarFill: { height: "100%", backgroundColor: "#eab308" },
  progressSub: { fontSize: 12, color: "#64748b" }
});