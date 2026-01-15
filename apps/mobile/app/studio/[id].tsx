"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { getStudio } from "../../src/services/studios";
import { listSlots, type Slot } from "../../src/services/slots";

export default function StudioClassesScreen() {
  const params = useLocalSearchParams();
  const studioId = typeof params?.id === "string" ? params.id : "";
  const initialQuery = typeof params?.q === "string" ? params.q : "";
  const [studioName, setStudioName] = useState("Studio");
  const [studioCity, setStudioCity] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!studioId) {
        setLoading(false);
        return;
      }
      try {
        const [studio, studioSlots] = await Promise.all([
          getStudio(studioId),
          listSlots({ studio: studioId }),
        ]);
        if (!mounted) return;
        setStudioName(studio?.name || "Studio");
        setStudioCity(studio?.city || "");
        setSlots(studioSlots);
      } catch (err) {
        console.warn("Failed to load studio classes", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [studioId]);

  const formatPrice = (value?: string | number | null) => {
    if (value == null) return "Price on request";
    const numeric = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(numeric)) return `${value}`;
    return `${numeric.toLocaleString("ru-RU")} ₸`;
  };

  const filteredSlots = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return slots;
    return slots.filter((slot) => {
      const studioName = slot.studio_details?.name || "";
      const studioAddress = slot.studio_details?.address || "";
      const styleName = slot.dance_style_details?.name || "";
      const description = slot.description || "";
      const trainerFirst = slot.trainer_details?.trainer_details?.first_name || "";
      const trainerLast = slot.trainer_details?.trainer_details?.last_name || "";
      const trainerName = `${trainerFirst} ${trainerLast}`.trim();
      return (
        slot.title.toLowerCase().includes(needle) ||
        studioName.toLowerCase().includes(needle) ||
        studioAddress.toLowerCase().includes(needle) ||
        styleName.toLowerCase().includes(needle) ||
        description.toLowerCase().includes(needle) ||
        trainerFirst.toLowerCase().includes(needle) ||
        trainerLast.toLowerCase().includes(needle) ||
        trainerName.toLowerCase().includes(needle)
      );
    });
  }, [slots, query]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <View>
          <Text style={styles.title}>{studioName}</Text>
          {studioCity ? <Text style={styles.subtitle}>{studioCity}</Text> : null}
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            placeholder="Search classes, styles, or instructors"
            placeholderTextColor="#9ca3af"
            style={styles.searchText}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filteredSlots.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No classes found.</Text>
          </View>
        ) : (
          filteredSlots.map((slot) => {
            const trainerFirst = slot.trainer_details?.trainer_details?.first_name || "";
            const trainerLast = slot.trainer_details?.trainer_details?.last_name || "";
            const trainerName = `${trainerFirst} ${trainerLast}`.trim() || "Instructor";
            const styleName = slot.dance_style_details?.name || "Class";
            const start = new Date(slot.start_time);
            const end = new Date(slot.end_time);
            const timeLabel = `${start.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })} · ${start.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })} - ${end.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}`;
            return (
              <Pressable
                key={slot.uuid}
                style={styles.card}
                onPress={() => router.push(`/class-details/${slot.uuid}?studio=${studioId}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{slot.title}</Text>
                  <Text style={styles.cardBadge}>{styleName}</Text>
                </View>
                <Text style={styles.cardSubtitle}>With {trainerName}</Text>
                <Text style={styles.cardMeta}>{timeLabel}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>{formatPrice(slot.price)}</Text>
                  <Text style={styles.cardAction}>View details</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b" },
  searchRow: { marginTop: 12, paddingHorizontal: 16 },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  searchText: { flex: 1, fontSize: 14, color: "#111827" },
  list: { padding: 16, gap: 12 },
  empty: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyText: { color: "#64748b", fontSize: 14 },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", flex: 1 },
  cardBadge: {
    fontSize: 12,
    color: "#7c3aed",
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  cardSubtitle: { marginTop: 6, color: "#64748b", fontSize: 13 },
  cardMeta: { marginTop: 6, color: "#94a3b8", fontSize: 12 },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardAction: { fontSize: 12, fontWeight: "600", color: "#7c3aed" },
});
