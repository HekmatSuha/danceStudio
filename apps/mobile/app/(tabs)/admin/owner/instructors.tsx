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
import { supabase } from "../../../../src/lib/supabase";
import { fetchMyStudios } from "../../../../src/services/studios";
import { getStoredRole } from "../../../../src/services/auth";

type InstructorRow = {
  id: string;
  user_id: string;
  role: string;
  user: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; is_active?: boolean | null };
};

export default function OwnerInstructorsScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const storedRole = await getStoredRole();
    setRole(storedRole);
    try {
      const studios = await fetchMyStudios();
      const studioIds = studios.map((s) => s.uuid);
      if (studioIds.length === 0) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("tenant_staff")
        .select("id, user_id, role, user:profiles(id, first_name, last_name, email, is_active)")
        .in("studio_id", studioIds);
      if (error) throw error;
      setRows((data as InstructorRow[]) ?? []);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load instructors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const name = `${row.user?.first_name || ""} ${row.user?.last_name || ""}`.toLowerCase();
      return name.includes(needle) || row.user?.email?.toLowerCase().includes(needle);
    });
  }, [rows, search]);

  const toggleActive = async (row: InstructorRow) => {
    const nextActive = !(row.user?.is_active ?? true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: nextActive })
      .eq("id", row.user_id);
    if (error) {
      Alert.alert("Error", error.message || "Failed to update instructor.");
      return;
    }
    setRows((prev) =>
      prev.map((item) =>
        item.user_id === row.user_id ? { ...item, user: { ...item.user, is_active: nextActive } } : item
      )
    );
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
          <Text style={styles.title}>Instructors</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => Alert.alert("Invite instructors", "Please add instructors from the web admin for now.")}
          >
            <Ionicons name="person-add-outline" size={16} color="white" />
            <Text style={styles.primaryBtnText}>Invite</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search instructors..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.subtle}>No instructors found.</Text>
          </View>
        ) : (
          filtered.map((row) => {
            const initials = `${row.user?.first_name?.[0] || ""}${row.user?.last_name?.[0] || ""}`.toUpperCase();
            const isActive = row.user?.is_active ?? true;
            return (
              <View key={row.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials || "I"}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{row.user?.first_name} {row.user?.last_name}</Text>
                    <Text style={styles.cardSub}>{row.user?.email}</Text>
                  </View>
                  <Pressable style={styles.iconBtn} onPress={() => toggleActive(row)}>
                    <Ionicons name={isActive ? "close-circle-outline" : "checkmark-circle-outline"} size={18} color={isActive ? "#ef4444" : "#10b981"} />
                  </Pressable>
                </View>
                <View style={[styles.badge, !isActive && styles.badgeMuted]}>
                  <Text style={styles.badgeText}>{isActive ? "Active" : "Inactive"}</Text>
                </View>
              </View>
            );
          })
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
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
    gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", color: "#0f172a" },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 12, color: "#64748b" },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
  },
  badgeMuted: { backgroundColor: "#e2e8f0" },
  badgeText: { fontSize: 12, color: "#0f172a", textTransform: "capitalize" },
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
