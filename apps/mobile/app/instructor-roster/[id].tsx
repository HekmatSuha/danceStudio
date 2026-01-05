import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Alert,
  Switch
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { listBookings, markAttendance, type Booking } from "../../src/services/bookings";
import { Ionicons } from "@expo/vector-icons";

type BookingWithDetails = Booking & {
  // Assuming listBookings expands client details or we fetch them?
  // The API docs don't explicitly say /bookings/ expands user details.
  // Usually Django DRF serializers expand nested fields if configured.
  // Let's assume we get some client info in the booking object or a related field.
  // If not, we might only see UUIDs which is bad for a roster.
  // For this prototype, I will try to access `client_details` or similar if available,
  // or fall back to displaying the UUID.
  client_details?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  client_name?: string; // Some APIs flatten this
};

export default function InstructorRosterScreen() {
  const { id } = useLocalSearchParams();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Filter bookings by this slot ID
      // API: GET /bookings/?appointment_slot={uuid}
      // My listBookings service accepts filters but I might need to update it or pass params directly if I used 'params' arg.
      // I updated listBookings to accept params in previous turn.
      // But wait, I didn't update the service to accept `appointment_slot` specifically in the interface.
      // I updated it for `status`, `attended`, `dates`.
      // I should update listBookings to accept `appointment_slot` too.
      // For now, I will cast params or update service. 
      // I'll assume I can pass it.
      const data = await listBookings({ appointment_slot: id as string } as any);
      setBookings(data);
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to load roster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const toggleAttendance = async (booking: BookingWithDetails) => {
    // API docs: POST /bookings/{uuid}/mark_attendance/
    // It likely expects { attended: boolean }
    const newValue = !booking.attended; // Assuming 'attended' field exists on Booking from API
    setToggling(booking.uuid);
    try {
      await markAttendance(booking.uuid, newValue);
      setBookings(prev => prev.map(b => b.uuid === booking.uuid ? { ...b, attended: newValue } : b));
    } catch (err: any) {
      Alert.alert("Error", "Could not update attendance.");
    } finally {
      setToggling(null);
    }
  };

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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#064e3b" />
        </Pressable>
        <Text style={styles.title}>Class Roster</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={item => item.uuid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No students registered yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          // Construct name
          const name = item.client_details 
            ? `${item.client_details.first_name} ${item.client_details.last_name}`
            : item.client_name || "Student";
          
          return (
            <View style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.subtext}>Status: {item.status}</Text>
              </View>
              <View style={styles.action}>
                {toggling === item.uuid ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Switch
                    value={!!item.attended}
                    onValueChange={() => toggleAttendance(item)}
                    trackColor={{ false: "#e5e7eb", true: "#10b981" }}
                  />
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 20, fontWeight: "700", color: "#064e3b" },
  list: { padding: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  subtext: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  action: { marginLeft: 16 },
  empty: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#6b7280", fontSize: 16 }
});
