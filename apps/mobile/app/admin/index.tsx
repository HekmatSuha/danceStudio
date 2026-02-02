import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getCurrentRole, type MobileUserRole } from "../../src/services/auth";
import { supabase } from "../../src/lib/supabase";

export default function AdminDashboardScreen() {
  const [role, setRole] = useState<MobileUserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const webAdminBase = useMemo(() => process.env.EXPO_PUBLIC_WEB_ADMIN_URL || "", []);
  const webAdminOrigin = useMemo(() => {
    const raw = webAdminBase.trim();
    if (!raw) return "";
    try {
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(normalized).origin;
    } catch {
      return raw.replace(/\/+$/, "");
    }
  }, [webAdminBase]);

  useEffect(() => {
    let active = true;
    const loadRole = async () => {
      try {
        const currentRole = await getCurrentRole();
        if (active) setRole(currentRole);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadRole();
    return () => {
      active = false;
    };
  }, []);

  const isAdmin = role === "owner" || role === "instructor" || role === "super_admin";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="lock-closed-outline" size={24} color="#ef4444" />
          <Text style={styles.title}>Admin access required</Text>
          <Text style={styles.subtle}>
            Your account does not have permission to view the admin dashboard.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace("/(tabs)/profile")}>
            <Text style={styles.primaryButtonText}>Back to Profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isSuperAdmin = role === "super_admin";
  const openWebAdmin = async (path: string) => {
    if (!webAdminOrigin) {
      Alert.alert(
        "Web dashboard not configured",
        "Set EXPO_PUBLIC_WEB_ADMIN_URL to open the web admin dashboard."
      );
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      Alert.alert("Not signed in", "Please sign in again and retry.");
      return;
    }
    const access = encodeURIComponent(data.session.access_token);
    const refresh = encodeURIComponent(data.session.refresh_token);
    const redirectPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${webAdminOrigin}${redirectPath}?access=${access}&refresh=${refresh}`;
    const encoded = encodeURIComponent(url);
    router.push(`/admin/web-dashboard?url=${encoded}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>
              {isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
            </Text>
            <Text style={styles.subtle}>Signed in as {role?.replace("_", " ")}</Text>
          </View>
          <Pressable style={styles.outlineButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#0f172a" />
            <Text style={styles.outlineButtonText}>Back</Text>
          </Pressable>
        </View>

        {isSuperAdmin ? (
          <>
            <Pressable
              style={styles.card}
              onPress={() => openWebAdmin("/dashboard/super-admin")}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, styles.iconBadgeBlue]}>
                  <Ionicons name="business-outline" size={20} color="#2563eb" />
                </View>
                <Ionicons name="open-outline" size={18} color="#94a3b8" />
              </View>
              <Text style={styles.cardTitle}>Manage Studios</Text>
              <Text style={styles.subtle}>
                Create, edit, and monitor all dance studios on the platform.
              </Text>
            </Pressable>

            <Pressable
              style={styles.card}
              onPress={() => openWebAdmin("/dashboard/super-admin")}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, styles.iconBadgeGreen]}>
                  <Ionicons name="people-outline" size={20} color="#16a34a" />
                </View>
                <Ionicons name="open-outline" size={18} color="#94a3b8" />
              </View>
              <Text style={styles.cardTitle}>Manage Users</Text>
              <Text style={styles.subtle}>
                View and manage owner, instructor, and student accounts.
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Web Dashboard</Text>
            <Text style={styles.subtle}>
              Open the web dashboard for advanced admin tools.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => openWebAdmin("/dashboard")}
            >
              <Text style={styles.primaryButtonText}>Open Web Dashboard</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtle: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeBlue: {
    backgroundColor: "#dbeafe",
  },
  iconBadgeGreen: {
    backgroundColor: "#dcfce7",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  outlineButtonText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 12,
  },
});
