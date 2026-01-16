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

type ProfileRow = {
  id?: string | null;
  uuid?: string | null;
  username?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  created_at?: string | null;
};

export default function AdminUsersScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", role: "student" });

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

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      Alert.alert("Error", error.message || "Failed to load users.");
    } else {
      setUsers((data as ProfileRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const startEdit = (user: ProfileRow) => {
    setEditing(user);
    setForm({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      role: user.role || "student",
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert("Missing fields", "First and last name are required.");
      return;
    }

    const userId = editing.id || editing.uuid;
    if (!userId) return;

    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        role: form.role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      Alert.alert("Error", error.message || "Failed to update user.");
    } else {
      setUsers((prev) =>
        prev.map((u) => ((u.id || u.uuid) === userId ? { ...u, ...form } : u))
      );
      setEditing(null);
    }
    setSubmitting(false);
  };

  const handleDelete = async (user: ProfileRow) => {
    const userId = user.id || user.uuid;
    if (!userId) return;
    if (user.role === "super_admin") {
      Alert.alert("Not allowed", "Super admins cannot be deleted.");
      return;
    }

    Alert.alert("Delete user?", `Delete ${user.first_name} ${user.last_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("profiles").delete().eq("id", userId);
          if (error) {
            Alert.alert("Delete failed", error.message || "Unable to delete user.");
            return;
          }
          setUsers((prev) => prev.filter((u) => (u.id || u.uuid) !== userId));
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

  const filtered = users.filter((user) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      user.email?.toLowerCase().includes(needle) ||
      user.first_name?.toLowerCase().includes(needle) ||
      user.last_name?.toLowerCase().includes(needle) ||
      user.role?.toLowerCase().includes(needle)
    );
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>System Users</Text>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        {editing ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Edit User</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>First Name</Text>
                <TextInput value={form.firstName} onChangeText={(t) => setForm({ ...form, firstName: t })} style={styles.input} />
              </View>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput value={form.lastName} onChangeText={(t) => setForm({ ...form, lastName: t })} style={styles.input} />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleRow}>
                {["student", "instructor", "owner"].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setForm({ ...form, role: r })}
                    style={[styles.roleChip, form.role === r && styles.roleChipActive]}
                  >
                    <Text style={[styles.roleText, form.role === r && styles.roleTextActive]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.formActions}>
              <Pressable
                style={[styles.secondaryBtn, submitting && styles.disabledBtn]}
                onPress={() => setEditing(null)}
                disabled={submitting}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, submitting && styles.disabledBtn]}
                onPress={handleSave}
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
            <Text style={styles.subtle}>No users found.</Text>
          </View>
        ) : (
          filtered.map((user) => {
            const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();
            return (
              <View key={user.id || user.uuid} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials || "U"}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{user.first_name} {user.last_name}</Text>
                    <Text style={styles.cardSub}>{user.email || user.username}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable onPress={() => startEdit(user)} style={styles.iconBtn}>
                      <Ionicons name="pencil" size={16} color="#2563eb" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(user)} style={styles.iconBtn}>
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{user.role || "student"}</Text>
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
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
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
  roleRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  roleChipActive: { backgroundColor: "#0f172a" },
  roleText: { fontSize: 12, color: "#64748b", textTransform: "capitalize" },
  roleTextActive: { color: "white", fontWeight: "700" },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  primaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0f172a",
  },
  primaryBtnText: { color: "white", fontWeight: "700", fontSize: 12 },
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
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  roleBadgeText: { fontSize: 12, color: "#0f172a", textTransform: "capitalize" },
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
