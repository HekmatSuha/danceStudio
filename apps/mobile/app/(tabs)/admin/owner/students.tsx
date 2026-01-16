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

type StudentRow = {
  uuid: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  is_active?: boolean | null;
};

export default function OwnerStudentsScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const storedRole = await getStoredRole();
    setRole(storedRole);
    try {
      const studios = await fetchMyStudios();
      const studioIds = studios.map((s) => s.uuid);
      if (studioIds.length === 0) {
        setStudents([]);
        return;
      }

      const { data: slotRows, error: slotError } = await supabase
        .from("slots")
        .select("uuid")
        .in("studio_id", studioIds);
      if (slotError) throw slotError;

      const slotIds = (slotRows as { uuid: string }[] | null | undefined)?.map((row) => row.uuid) ?? [];
      if (slotIds.length === 0) {
        setStudents([]);
        return;
      }

      const { data: bookingRows, error } = await supabase
        .from("bookings")
        .select("user:profiles(uuid, first_name, last_name, email, is_active)")
        .in("appointment_slot", slotIds);
      if (error) throw error;

      const unique = new Map<string, StudentRow>();
      (bookingRows as { user?: StudentRow | null }[] | null | undefined)?.forEach((row) => {
        if (row.user?.uuid) unique.set(row.user.uuid, row.user);
      });
      setStudents(Array.from(unique.values()));
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((s) => {
      return (
        s.email?.toLowerCase().includes(needle) ||
        s.first_name?.toLowerCase().includes(needle) ||
        s.last_name?.toLowerCase().includes(needle)
      );
    });
  }, [students, search]);

  const toggleActive = async (student: StudentRow) => {
    const nextActive = !(student.is_active ?? true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: nextActive })
      .eq("id", student.uuid);
    if (error) {
      Alert.alert("Error", error.message || "Failed to update student.");
      return;
    }
    setStudents((prev) =>
      prev.map((item) =>
        item.uuid === student.uuid ? { ...item, is_active: nextActive } : item
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
        <Text style={styles.title}>Students</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search students..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.subtle}>No students found.</Text>
          </View>
        ) : (
          filtered.map((student) => {
            const initials = `${student.first_name?.[0] || ""}${student.last_name?.[0] || ""}`.toUpperCase();
            const isActive = student.is_active ?? true;
            return (
              <View key={student.uuid} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials || "S"}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{student.first_name} {student.last_name}</Text>
                    <Text style={styles.cardSub}>{student.email}</Text>
                  </View>
                  <Pressable style={styles.iconBtn} onPress={() => toggleActive(student)}>
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
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
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
