import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../../src/lib/supabase";
import { fetchMyStudios } from "../../../../src/services/studios";
import { getStoredRole } from "../../../../src/services/auth";

type RoomRow = {
  id: string;
  name: string;
  capacity: number;
  price_per_hour?: number | null;
  currency?: string | null;
};

export default function OwnerRoomsScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [studios, setStudios] = useState<{ uuid: string; name: string }[]>([]);
  const [studioId, setStudioId] = useState("");
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoomRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    capacity: "",
    price: "",
    currency: "KZT",
  });

  const load = async (selectedStudio?: string) => {
    setLoading(true);
    const storedRole = await getStoredRole();
    setRole(storedRole);
    try {
      const data = await fetchMyStudios();
      const list = data.map((s) => ({ uuid: s.uuid, name: s.name }));
      setStudios(list);
      const nextStudioId = selectedStudio || list[0]?.uuid || "";
      setStudioId(nextStudioId);
      if (!nextStudioId) {
        setRooms([]);
        return;
      }
      const { data: roomData, error } = await supabase
        .from("rooms")
        .select("id, name, capacity, price_per_hour, currency")
        .eq("studio_id", nextStudioId)
        .order("name");
      if (error) throw error;
      setRooms((roomData as RoomRow[]) ?? []);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async () => {
    if (!studioId) return;
    if (!form.name.trim() || !form.capacity) {
      Alert.alert("Missing fields", "Room name and capacity are required.");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("rooms")
          .update({
            name: form.name.trim(),
            capacity: Number(form.capacity),
            price_per_hour: form.price ? Number(form.price) : null,
            currency: form.currency || "KZT",
          })
          .eq("id", editing.id);
        if (error) throw error;
        setEditing(null);
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert({
            studio_id: studioId,
            name: form.name.trim(),
            capacity: Number(form.capacity),
            price_per_hour: form.price ? Number(form.price) : null,
            currency: form.currency || "KZT",
          });
        if (error) throw error;
      }
      setShowForm(false);
      setForm({ name: "", capacity: "", price: "", currency: "KZT" });
      await load(studioId);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save room.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (room: RoomRow) => {
    Alert.alert("Delete room?", `Delete "${room.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("rooms").delete().eq("id", room.id);
          if (error) {
            Alert.alert("Error", error.message || "Failed to delete room.");
            return;
          }
          await load(studioId);
        },
      },
    ]);
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
        <View style={styles.header}>
          <Text style={styles.title}>Rooms</Text>
          <Pressable style={styles.primaryBtn} onPress={() => {
            setEditing(null);
            setShowForm((prev) => !prev);
          }}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.primaryBtnText}>{showForm ? "Close" : "Add Room"}</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Studio ID</Text>
          <TextInput value={studioId} onChangeText={(t) => setStudioId(t)} style={styles.input} />
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editing ? "Edit Room" : "Create Room"}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} style={styles.input} />
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Capacity</Text>
                <TextInput value={form.capacity} onChangeText={(t) => setForm({ ...form, capacity: t })} style={styles.input} keyboardType="numeric" />
              </View>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Price/Hour</Text>
                <TextInput value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} style={styles.input} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Currency</Text>
              <TextInput value={form.currency} onChangeText={(t) => setForm({ ...form, currency: t })} style={styles.input} />
            </View>
            <View style={styles.formActions}>
              <Pressable style={[styles.secondaryBtn, submitting && styles.disabledBtn]} onPress={() => setShowForm(false)} disabled={submitting}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, submitting && styles.disabledBtn]} onPress={handleSubmit} disabled={submitting}>
                <Text style={styles.primaryBtnText}>{submitting ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {rooms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.subtle}>No rooms found.</Text>
          </View>
        ) : (
          rooms.map((room) => (
            <View key={room.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{room.name}</Text>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => {
                      setEditing(room);
                      setForm({
                        name: room.name,
                        capacity: room.capacity.toString(),
                        price: room.price_per_hour?.toString() || "",
                        currency: room.currency || "KZT",
                      });
                      setShowForm(true);
                    }}
                  >
                    <Ionicons name="pencil" size={16} color="#2563eb" />
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={() => handleDelete(room)}>
                    <Ionicons name="trash" size={16} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.cardSub}>Capacity: {room.capacity}</Text>
              {room.price_per_hour ? (
                <Text style={styles.cardSub}>
                  {room.currency || "KZT"} {room.price_per_hour}/hour
                </Text>
              ) : null}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  primaryBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "700", fontSize: 12 },
  formCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    gap: 12,
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  field: { gap: 6, marginBottom: 12 },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldFlex: { flex: 1, gap: 6 },
  label: { fontSize: 12, color: "#64748b" },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#0f172a",
  },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
  secondaryBtnText: { color: "#0f172a", fontWeight: "700", fontSize: 12 },
  disabledBtn: { opacity: 0.6 },
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
  cardSub: { fontSize: 12, color: "#64748b" },
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
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
