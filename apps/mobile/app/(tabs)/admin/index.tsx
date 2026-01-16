import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getStoredRole, type MobileUserRole } from "../../../src/services/auth";
import { listStudios } from "../../../src/services/studios";
import { listSlots } from "../../../src/services/slots";

type AdminItem = {
  id:
    | "classes"
    | "bookings"
    | "studios"
    | "people"
    | "finance"
    | "studios_admin"
    | "users_admin"
    | "status"
    | "owner_overview"
    | "owner_classes"
    | "owner_rooms"
    | "owner_instructors"
    | "owner_students"
    | "owner_requests"
    | "owner_payments"
    | "owner_studios";
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const STAFF_ITEMS: AdminItem[] = [
  {
    id: "owner_overview",
    title: "Overview",
    description: "Stats across studios and classes.",
    icon: "speedometer-outline",
    color: "#0f172a",
  },
  {
    id: "owner_classes",
    title: "Classes",
    description: "Manage classes and roster.",
    icon: "calendar-outline",
    color: "#1d4ed8",
  },
  {
    id: "owner_rooms",
    title: "Rooms",
    description: "Manage studio rooms.",
    icon: "grid-outline",
    color: "#0f766e",
  },
  {
    id: "owner_instructors",
    title: "Instructors",
    description: "Manage teaching staff.",
    icon: "people-outline",
    color: "#7c3aed",
  },
  {
    id: "owner_students",
    title: "Students",
    description: "Manage student accounts.",
    icon: "school-outline",
    color: "#b45309",
  },
  {
    id: "owner_requests",
    title: "Requests",
    description: "Confirm bookings and rentals.",
    icon: "shield-checkmark-outline",
    color: "#0ea5e9",
  },
  {
    id: "owner_payments",
    title: "Payments",
    description: "Revenue summary.",
    icon: "wallet-outline",
    color: "#9333ea",
  },
  {
    id: "owner_studios",
    title: "Studios",
    description: "Manage studio locations.",
    icon: "business-outline",
    color: "#0f172a",
  },
  {
    id: "bookings",
    title: "Bookings",
    description: "Review reservations.",
    icon: "ticket-outline",
    color: "#1d4ed8",
  },
];

const SUPER_ADMIN_ITEMS: AdminItem[] = [
  {
    id: "studios_admin",
    title: "Studios",
    description: "Create, edit, and monitor studios.",
    icon: "business-outline",
    color: "#0f766e",
  },
  {
    id: "users_admin",
    title: "Users",
    description: "View and manage all user accounts.",
    icon: "people-outline",
    color: "#2563eb",
  },
  {
    id: "status",
    title: "System Status",
    description: "All systems operational.",
    icon: "shield-checkmark-outline",
    color: "#7c3aed",
  },
];

export default function AdminScreen() {
  const [role, setRole] = useState<MobileUserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultStudioId, setDefaultStudioId] = useState<string | null>(null);
  const [defaultSlotId, setDefaultSlotId] = useState<string | null>(null);
  const [targetLoading, setTargetLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      try {
        const stored = await getStoredRole();
        if (mounted) setRole(stored);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadTargets = async () => {
      try {
        const [studios, slots] = await Promise.all([listStudios(), listSlots()]);
        if (!mounted) return;
        setDefaultStudioId(studios[0]?.uuid ?? null);
        setDefaultSlotId(slots[0]?.uuid ?? null);
      } catch {
        if (!mounted) return;
        setDefaultStudioId(null);
        setDefaultSlotId(null);
      }
    };
    loadTargets();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && role && role === "student") {
      router.replace("/(tabs)");
    }
  }, [loading, role]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!role || role === "student") {
    return (
      <View style={styles.center}>
        <Text style={styles.subtle}>Access restricted.</Text>
      </View>
    );
  }

  const roleLabel =
    role === "super_admin" ? "Super Admin" : role === "owner" ? "Studio Owner" : "Instructor";
  const items = role === "super_admin" ? SUPER_ADMIN_ITEMS : STAFF_ITEMS;

  const handleItemPress = async (id: AdminItem["id"]) => {
    setTargetLoading(true);
    try {
      if (id === "bookings") {
        router.push("/(tabs)/bookings");
        return;
      }
      if (id === "studios_admin") {
        router.push("/(tabs)/admin/studios");
        return;
      }
      if (id === "users_admin") {
        router.push("/(tabs)/admin/users");
        return;
      }
      if (id === "classes" || id === "studios") {
        if (!defaultStudioId) {
          Alert.alert("No studio found", "Create a studio in the admin dashboard first.");
          return;
        }
        router.push(`/studio/${defaultStudioId}`);
        return;
      }
      if (id === "people") {
        if (!defaultSlotId) {
          Alert.alert("No classes yet", "Create a class to view roster details.");
          return;
        }
        router.push(`/instructor-roster/${defaultSlotId}`);
        return;
      }
      if (id === "status") {
        Alert.alert("System Status", "All systems operational. Database connected.");
        return;
      }
      if (id === "owner_overview") {
        router.push("/(tabs)/admin/owner/overview");
        return;
      }
      if (id === "owner_classes") {
        router.push("/(tabs)/admin/owner/classes");
        return;
      }
      if (id === "owner_rooms") {
        router.push("/(tabs)/admin/owner/rooms");
        return;
      }
      if (id === "owner_instructors") {
        router.push("/(tabs)/admin/owner/instructors");
        return;
      }
      if (id === "owner_students") {
        router.push("/(tabs)/admin/owner/students");
        return;
      }
      if (id === "owner_requests") {
        router.push("/(tabs)/admin/owner/requests");
        return;
      }
      if (id === "owner_payments") {
        router.push("/(tabs)/admin/owner/payments");
        return;
      }
      if (id === "owner_studios") {
        router.push("/(tabs)/admin/owner/studios");
        return;
      }
      Alert.alert("Coming soon", "This tool is coming to mobile soon.");
    } finally {
      setTargetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="briefcase-outline" size={18} color="white" />
            </View>
            <Text style={styles.title}>Admin Hub</Text>
          </View>
          <Text style={styles.subtitle}>{roleLabel} tools</Text>
        </View>

        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.card,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => handleItemPress(item.id)}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={20} color="white" />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </Pressable>
          ))}
        </View>
        {targetLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#8b5cf6" />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  page: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
  },
  loadingRow: {
    marginTop: 16,
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subtle: {
    color: "#64748b",
  },
});
