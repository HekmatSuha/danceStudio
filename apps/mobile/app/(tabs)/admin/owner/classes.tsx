import React, { useEffect, useMemo, useState } from "react";
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
import { router } from "expo-router";
import { supabase } from "../../../../src/lib/supabase";
import { fetchMyStudios } from "../../../../src/services/studios";
import { getStoredRole } from "../../../../src/services/auth";

type SlotRow = {
  uuid: string;
  title: string;
  start_time: string;
  end_time: string;
  price?: number | null;
  max_participants?: number | null;
  studio_id?: string | null;
};

export default function OwnerClassesScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [studios, setStudios] = useState<{ uuid: string; name: string }[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    studioId: "",
    startTime: "",
    endTime: "",
    price: "",
    maxParticipants: "",
  });

  const load = async () => {
    setLoading(true);
    const storedRole = await getStoredRole();
    setRole(storedRole);
    try {
      const data = await fetchMyStudios();
      const studiosList = data.map((studio) => ({ uuid: studio.uuid, name: studio.name }));
      setStudios(studiosList);
      if (studiosList.length > 0 && !form.studioId) {
        setForm((prev) => ({ ...prev, studioId: studiosList[0].uuid }));
      }
      const studioIds = studiosList.map((studio) => studio.uuid);
      if (studioIds.length === 0) {
        setSlots([]);
        return;
      }
      const { data: slotData, error } = await supabase
        .from("slots")
        .select("uuid, title, start_time, end_time, price, max_participants, studio_id")
        .in("studio_id", studioIds)
        .order("start_time", { ascending: true });
      if (error) throw error;
      setSlots((slotData as SlotRow[]) ?? []);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const needle = search.trim().toLowerCase();
    return slots.filter((slot) => {
      const matchesSearch =
        !needle || slot.title?.toLowerCase().includes(needle);
      const date = new Date(slot.start_time).getTime();
      const matchesFilter =
        filter === "all" ||
        (filter === "upcoming" && date > now) ||
        (filter === "past" && date <= now);
      return matchesSearch && matchesFilter;
    });
  }, [slots, search, filter]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.studioId || !form.startTime || !form.endTime) {
      Alert.alert("Missing fields", "Title, studio, start, and end times are required.");
      return;
    }
    const price = form.price ? Number(form.price) : null;
    const maxParticipants = form.maxParticipants ? Number(form.maxParticipants) : 20;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("slots")
        .insert({
          title: form.title.trim(),
          studio_id: form.studioId,
          start_time: form.startTime,
          end_time: form.endTime,
          price: Number.isFinite(price) ? price : null,
          max_participants: Number.isFinite(maxParticipants) ? maxParticipants : 20,
        });
      if (error) throw error;
      setShowForm(false);
      setForm({
        title: "",
        studioId: form.studioId,
        startTime: "",
        endTime: "",
        price: "",
        maxParticipants: "",
      });
      await load();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to create class.");
    } finally {
      setSubmitting(false);
    }
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
          <Text style={styles.title}>Classes</Text>
          <Pressable style={styles.primaryBtn} onPress={() => setShowForm((prev) => !prev)}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.primaryBtnText}>{showForm ? "Close" : "Add Class"}</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {(["upcoming", "past", "all"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.chip, filter === value && styles.chipActive]}
              onPress={() => setFilter(value)}
            >
              <Text style={[styles.chipText, filter === value && styles.chipTextActive]}>{value}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search classes..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create class</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Studio ID</Text>
              <TextInput value={form.studioId} onChangeText={(t) => setForm({ ...form, studioId: t })} style={styles.input} />
              <Text style={styles.helper}>Use the studio UUID from your list.</Text>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Start (ISO)</Text>
                <TextInput value={form.startTime} onChangeText={(t) => setForm({ ...form, startTime: t })} style={styles.input} placeholder="2026-01-20T18:00:00Z" />
              </View>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>End (ISO)</Text>
                <TextInput value={form.endTime} onChangeText={(t) => setForm({ ...form, endTime: t })} style={styles.input} placeholder="2026-01-20T19:00:00Z" />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Price</Text>
                <TextInput value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} style={styles.input} keyboardType="numeric" />
              </View>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Max participants</Text>
                <TextInput value={form.maxParticipants} onChangeText={(t) => setForm({ ...form, maxParticipants: t })} style={styles.input} keyboardType="numeric" />
              </View>
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

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.subtle}>No classes found.</Text>
          </View>
        ) : (
          filtered.map((slot) => (
            <View key={slot.uuid} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{slot.title}</Text>
                <Pressable onPress={() => router.push(`/instructor-roster/${slot.uuid}`)}>
                  <Text style={styles.linkText}>Roster</Text>
                </Pressable>
              </View>
              <Text style={styles.cardSub}>
                {new Date(slot.start_time).toLocaleString()} - {new Date(slot.end_time).toLocaleTimeString()}
              </Text>
              <Text style={styles.cardMeta}>
                Price: {slot.price ?? 0} • Capacity: {slot.max_participants ?? 0}
              </Text>
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
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  chipText: { fontSize: 12, color: "#64748b", textTransform: "capitalize" },
  chipTextActive: { color: "white", fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: "#0f172a" },
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
  field: { gap: 6 },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldFlex: { flex: 1, gap: 6 },
  label: { fontSize: 12, color: "#64748b" },
  helper: { fontSize: 10, color: "#94a3b8" },
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
  cardMeta: { fontSize: 12, color: "#94a3b8" },
  linkText: { fontSize: 12, color: "#2563eb", fontWeight: "600" },
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
