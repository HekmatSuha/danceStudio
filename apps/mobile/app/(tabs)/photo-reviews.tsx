import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { listReviews, type Review } from "../../src/services/reviews";
import { listStudios, type Studio } from "../../src/services/studios";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1609602961949-eddbb90383cc?auto=format&fit=crop&w=900&q=80",
];

export default function PhotoReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [reviewsData, studiosData] = await Promise.all([
          listReviews(),
          listStudios(),
        ]);
        if (!mounted) return;
        setReviews(reviewsData);
        setStudios(studiosData);
      } catch (err) {
        console.warn("Failed to load reviews", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const studioNameById = useMemo(() => {
    return studios.reduce<Record<string, string>>((acc, studio) => {
      acc[studio.uuid] = studio.name;
      return acc;
    }, {});
  }, [studios]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.uuid}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Photo reviews</Text>
            <Text style={styles.subtitle}>Real experiences from dancers</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share a review.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const imageUrl = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
          const studioName = studioNameById[item.studio] || "Studio";
          return (
            <View style={styles.card}>
              <Image source={{ uri: imageUrl }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{studioName}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                </View>
                <Text style={styles.cardAuthor}>{item.author_name}</Text>
                <Text style={styles.cardComment} numberOfLines={3}>
                  {item.comment}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardImage: {
    width: "100%",
    height: 180,
  },
  cardBody: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  cardAuthor: {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  cardComment: {
    marginTop: 8,
    fontSize: 14,
    color: "#111827",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748b",
  },
});
