import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { listBookings, cancelBooking, type Booking } from "../../../src/services/bookings";
import { router } from "expo-router";
import { getStoredTokens } from "../../../src/lib/api";

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const tokens = await getStoredTokens();
      if (!tokens) {
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
        <Text style={styles.title}>My Bookings</Text>
        {bookings.length === 0 ? (
          <Text style={styles.subtle}>No bookings yet.</Text>
        ) : (
          bookings.map((b) => (
            <View key={b.uuid} style={styles.card}>
              <Text style={styles.cardTitle}>{b.appointment_slot}</Text>
              <Text style={styles.subtle}>Status: {b.status}</Text>
              <Text style={styles.subtle}>
                Booked at:{" "}
                {b.booking_date
                  ? new Date(b.booking_date).toLocaleString()
                  : "—"}
              </Text>
              <View style={styles.row}>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
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
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
  },
  row: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  cancelBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cancelText: { color: "white", fontWeight: "700" },
});
