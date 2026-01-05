import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { listSlots, type Slot } from "../../src/services/slots";
import { createBooking } from "../../src/services/bookings";
import { getStoredTokens } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";

export default function ClassDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const load = async () => {
      // In a real app we might have a specific getSlot(id) endpoint or filter list
      // Since API listSlots supports filtering but maybe not by ID directly in public docs? 
      // Actually /studios/slots/ supports filtering. 
      // But we can also just fetch all and find, or use the endpoint /studios/slots/{uuid}/ if available (from API docs it is).
      // Let's implement fetchSlot in service if not there, or just iterate for now if we didn't add it.
      // Checking services/slots.ts... only listSlots exists. 
      // I will assume for now we can iterate or I should add getSlot. 
      // Let's just list and find for safety or add getSlot. 
      // Actually API docs said `GET /slots/{uuid}/` exists.
      // I will implement a quick fetch logic here or update service later. 
      // For now, let's list all and find (inefficient but safe for prototype with few slots).
      try {
        const slots = await listSlots();
        const found = slots.find((s) => s.uuid === id);
        setSlot(found || null);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleBook = async () => {
    if (!slot) return;
    const tokens = await getStoredTokens();
    if (!tokens) {
      router.replace("/(auth)/login");
      return;
    }
    
    setBooking(true);
    try {
      await createBooking(slot.uuid);
      Alert.alert("Success", "You have successfully booked this class!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert("Booking Failed", err?.message || "Could not complete booking.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!slot) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Class not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const trainerName = slot.trainer_details?.trainer_details?.first_name 
    ? `${slot.trainer_details.trainer_details.first_name} ${slot.trainer_details.trainer_details.last_name || ""}` 
    : "TBA";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerImage}>
          <Ionicons name="musical-notes" size={64} color="white" style={{ opacity: 0.5 }} />
          <View style={styles.overlay} />
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{slot.title}</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color="#64748b" />
            <Text style={styles.subtitle}>{slot.studio_details?.name}, {slot.studio_details?.city}</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {new Date(slot.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {new Date(slot.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Price</Text>
              <Text style={styles.infoValue}>${slot.price}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Instructor</Text>
            <View style={styles.trainerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{trainerName[0]}</Text>
              </View>
              <View>
                <Text style={styles.trainerName}>{trainerName}</Text>
                <Text style={styles.trainerRole}>Professional Instructor</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>About this class</Text>
            <Text style={styles.description}>
              {slot.description || "Join us for an energetic session designed to improve your skills and fitness. Suitable for all levels."}
            </Text>
          </View>

           <View style={styles.section}>
            <Text style={styles.sectionHeader}>Style</Text>
            <View style={styles.tag}>
               <Text style={styles.tagText}>{slot.dance_style_details?.name || "General"}</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerPrice}>${slot.price}</Text>
          <Text style={styles.footerSub}>per person</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.bookButton,
            pressed && { opacity: 0.9 },
            booking && { opacity: 0.7 }
          ]}
          onPress={handleBook}
          disabled={booking}
        >
          {booking ? (
             <ActivityIndicator color="white" />
          ) : (
             <Text style={styles.bookButtonText}>Book Now</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingBottom: 100 },
  headerImage: {
    height: 200,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)"
  },
  detailsContainer: {
    padding: 24,
    marginTop: -20,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24 },
  subtitle: { fontSize: 16, color: "#64748b" },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24
  },
  infoItem: { alignItems: "center", flex: 1 },
  infoLabel: { fontSize: 12, color: "#64748b", marginBottom: 4, textTransform: "uppercase" },
  infoValue: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  section: { marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  description: { fontSize: 16, color: "#475569", lineHeight: 24 },
  trainerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#64748b" },
  trainerName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  trainerRole: { fontSize: 14, color: "#64748b" },
  tag: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#f3e8ff', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  tagText: { color: '#7c3aed', fontWeight: '600' },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 34,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  footerPrice: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  footerSub: { fontSize: 12, color: "#64748b" },
  bookButton: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bookButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  errorText: { fontSize: 18, color: "#64748b", marginBottom: 16 },
  backBtn: { padding: 12 },
  backBtnText: { color: "#8b5cf6", fontWeight: "600" }
});
