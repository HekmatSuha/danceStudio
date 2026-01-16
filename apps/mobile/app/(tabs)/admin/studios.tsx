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
import { supabase } from "../../../src/lib/supabase";
import { getStoredRole } from "../../../src/services/auth";

type StudioRow = {
  uuid: string;
  name: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
};

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function AdminStudiosScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [loading, setLoading] = useState(true);
  const [studios, setStudios] = useState<StudioRow[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<StudioRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    latitude: "",
    longitude: "",
    whatsapp: "",
  });

  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      const stored = await getStoredRole();
      if (!mounted) return;
      setRole(stored);
      setLoadingRole(false);
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, []);

  const loadStudios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("studios")
      .select("uuid, name, city, address, latitude, longitude, whatsapp")
      .order("name");
    if (error) {
      Alert.alert("Error", error.message || "Failed to load studios.");
    } else {
      setStudios((data as StudioRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStudios();
  }, []);

  const startCreate = () => {
    setForm({
      name: "",
      city: "",
      address: "",
      latitude: "",
      longitude: "",
      whatsapp: "",
    });
    setEditing(null);
    setShowCreate(true);
  };

  const startEdit = (studio: StudioRow) => {
    setForm({
      name: studio.name || "",
      city: studio.city || "",
      address: studio.address || "",
      latitude: studio.latitude?.toString() || "",
      longitude: studio.longitude?.toString() || "",
      whatsapp: studio.whatsapp || "",
    });
    setEditing(studio);
    setShowCreate(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.city.trim() || !form.address.trim()) {
      Alert.alert("Missing fields", "Name, city, and address are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        latitude: parseOptionalNumber(form.latitude),
        longitude: parseOptionalNumber(form.longitude),
        whatsapp: form.whatsapp.trim() || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("studios")
          .update(payload)
          .eq("uuid", editing.uuid);
        if (error) throw error;
        setEditing(null);
      } else {
        const { error } = await supabase.from("studios").insert(payload);
        if (error) throw error;
        setShowCreate(false);
      }

      await loadStudios();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save studio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (studio: StudioRow) => {
    Alert.alert("Delete studio?", `Delete "${studio.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("studios")
            .delete()
            .eq("uuid", studio.uuid);
          if (error) {
            Alert.alert(
              "Delete failed",
              error.message || "Unable to delete studio. Remove related data first."
            );
            return;
          }
          await loadStudios();
        },
      },
    ]);
  };

  if (loadingRole) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (role !== "super_admin") {
    return (
      <View style={styles.center}>
        <Text style={styles.subtle}>Access restricted.</Text>
      </View>
    );
  }

  const filtered = studios.filter((studio) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      studio.name?.toLowerCase().includes(needle) ||
      studio.city?.toLowerCase().includes(needle) ||
      studio.address?.toLowerCase().includes(needle)
    );
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Studios</Text>
          <Pressable style={styles.primaryBtn} onPress={startCreate}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.primaryBtnText}>New Studio</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search studios..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        {(showCreate || editing) ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editing ? "Edit Studio" : "Create Studio"}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Studio Name</Text>
              <TextInput value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} style={styles.input} />
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>City</Text>
                <TextInput value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} style={styles.input} />
              </View>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Address</Text>
                <TextInput value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} style={styles.input} />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput value={form.latitude} onChangeText={(t) => setForm({ ...form, latitude: t })} style={styles.input} keyboardType="numeric" />
              </View>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput value={form.longitude} onChangeText={(t) => setForm({ ...form, longitude: t })} style={styles.input} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>WhatsApp</Text>
              <TextInput value={form.whatsapp} onChangeText={(t) => setForm({ ...form, whatsapp: t })} style={styles.input} />
            </View>
            <View style={styles.formActions}>
              <Pressable
                style={[styles.secondaryBtn, submitting && styles.disabledBtn]}
                onPress={() => {
                  setEditing(null);
                  setShowCreate(false);
                }}
                disabled={submitting}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, submitting && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.primaryBtnText}>{submitting ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#8b5cf6" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.subtle}>No studios found.</Text>
          </View>
        ) : (
          filtered.map((studio) => (
            <View key={studio.uuid} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.cardTitle}>{studio.name}</Text>
                  <Text style={styles.cardSub}>
                    {studio.address || "Address"}{studio.city ? `, ${studio.city}` : ""}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => startEdit(studio)} style={styles.iconBtn}>
                    <Ionicons name="pencil" size={16} color="#2563eb" />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(studio)} style={styles.iconBtn}>
                    <Ionicons name="trash" size={16} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>ID: {studio.uuid}</Text>
              </View>
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
    marginBottom: 16,
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
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: { marginTop: 10 },
  metaText: { fontSize: 10, color: "#94a3b8" },
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
