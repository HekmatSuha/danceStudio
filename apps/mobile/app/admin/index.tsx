import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getCurrentRole, type MobileUserRole } from "../../src/services/auth";

export default function AdminDashboardScreen() {
  const [role, setRole] = useState<MobileUserRole | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtle}>Signed in as {role?.replace("_", " ")}</Text>
          </View>
          <Pressable style={styles.outlineButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#0f172a" />
            <Text style={styles.outlineButtonText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <Text style={styles.subtle}>
            Add your admin tools here (classes, instructors, studios, reports).
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming Soon</Text>
          <Text style={styles.subtle}>
            This mobile admin dashboard is ready for your next set of features.
          </Text>
        </View>
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
