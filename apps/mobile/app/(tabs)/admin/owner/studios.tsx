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
import { router } from "expo-router";
import { createStudio, fetchMyStudios, type Studio } from "../../../../src/services/studios";
import { getStoredRole } from "../../../../src/services/auth";

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function OwnerStudiosScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    latitude: "",
    longitude: "",
    whatsapp: "",
  });

  const load = async () => {
    setLoading(true);
    const storedRole = await getStoredRole();
    setRole(storedRole);
    try {
      const data = await fetchMyStudios();
      setStudios(data);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load studios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.city.trim() || !form.address.trim()) {
      Alert.alert("Missing fields", "Name, city, and address are required.");
      return;
    }
    setSubmitting(true);
    try {
      await createStudio({
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        latitude: parseOptionalNumber(form.latitude),
        longitude: parseOptionalNumber(form.longitude),
        whatsapp: form.whatsapp.trim() || null,
      });
      setShowForm(false);
      setForm({
        name: "",
        city: "",
        address: "",
        latitude: "",
        longitude: "",
        whatsapp: "",
      });
      await load();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to create studio.");
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

  const canCreate = role === "owner" || role === "super_admin";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Studios</Text>
          {canCreate && (
            <Pressable style={styles.primaryBtn} onPress={() => setShowForm((prev) => !prev)}>
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.primaryBtnText}>{showForm ? "Close" : "Add Studio"}</Text>
            </Pressable>
          )}
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Studio</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
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
              <Pressable style={[styles.secondaryBtn, submitting && styles.disabledBtn]} onPress={() => setShowForm(false)} disabled={submitting}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, submitting && styles.disabledBtn]} onPress={handleSubmit} disabled={submitting}>
                <Text style={styles.primaryBtnText}>{submitting ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {studios.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.subtle}>No studios yet.</Text>
          </View>
        ) : (
          studios.map((studio) => (
            <Pressable
              key={studio.uuid}
              style={styles.card}
              onPress={() => router.push(`/studio/${studio.uuid}`)}
            >
              <View style={styles.cardTop}>
                <Ionicons name="business-outline" size={18} color="#0f172a" />
                <Text style={styles.cardTitle}>{studio.name}</Text>
              </View>
              <Text style={styles.cardSub}>
                {studio.address || "Address"}{studio.city ? `, ${studio.city}` : ""}
              </Text>
            </Pressable>
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
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardSub: { marginTop: 6, color: "#64748b", fontSize: 12 },
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
