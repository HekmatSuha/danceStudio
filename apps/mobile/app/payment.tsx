"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { fetchProfile } from "../src/services/auth";

type BookingRecord = {
  uuid: string;
  status?: string | null;
  appointment_slot?: string | null;
};

type SlotRecord = {
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price?: number | null;
  currency?: string | null;
  studio_id?: string | null;
};

type StudioRecord = {
  name?: string | null;
  whatsapp?: string | null;
};

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const bookingId = typeof params?.bookingId === "string" ? params.bookingId : "";
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [slot, setSlot] = useState<SlotRecord | null>(null);
  const [studio, setStudio] = useState<StudioRecord | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      try {
        const profile = await fetchProfile().catch(() => null);
        if (profile) {
          const name = `${profile.first_name} ${profile.last_name}`.trim();
          if (mounted) {
            setProfileName(name);
            setProfileEmail(profile.email || "");
            setProfilePhone(profile.phone_number || "");
          }
        }

        const { data: bookingRow, error: bookingError } = await supabase
          .from("bookings")
          .select("uuid, status, appointment_slot")
          .eq("uuid", bookingId)
          .maybeSingle();
        if (bookingError) throw bookingError;
        if (!mounted) return;
        setBooking(bookingRow as BookingRecord);

        const slotId = bookingRow?.appointment_slot;
        if (slotId) {
          const { data: slotRow, error: slotError } = await supabase
            .from("slots")
            .select("title, start_time, end_time, price, currency, studio_id")
            .eq("uuid", slotId)
            .maybeSingle();
          if (slotError) throw slotError;
          if (!mounted) return;
          setSlot(slotRow as SlotRecord);

          if (slotRow?.studio_id) {
            const { data: studioRow, error: studioError } = await supabase
              .from("studios")
              .select("name, whatsapp")
              .eq("uuid", slotRow.studio_id)
              .maybeSingle();
            if (studioError) throw studioError;
            if (!mounted) return;
            setStudio(studioRow as StudioRecord);
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Unable to load payment details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [bookingId]);

  const dateLabel = useMemo(() => {
    if (!slot?.start_time) return "";
    const start = new Date(slot.start_time);
    const end = slot.end_time ? new Date(slot.end_time) : null;
    const date = start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const time = end
      ? `${start.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })} - ${end.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}`
      : start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${date} - ${time}`;
  }, [slot?.start_time, slot?.end_time]);

  const priceLabel = useMemo(() => {
    const currency = slot?.currency || "KZT";
    const amount = slot?.price ?? 0;
    return `${currency} ${amount}`;
  }, [slot?.currency, slot?.price]);

  const whatsappNumber = useMemo(() => {
    const raw = studio?.whatsapp || "";
    return raw.replace(/[^\d]/g, "");
  }, [studio?.whatsapp]);

  const message = useMemo(() => {
    const studioName = studio?.name || "Studio";
    const classTitle = slot?.title || "Dance class";
    const parts = [
      `Hi ${studioName},`,
      `I'd like to confirm payment for "${classTitle}".`,
      dateLabel ? `Date/time: ${dateLabel}.` : null,
      priceLabel ? `Price: ${priceLabel}.` : null,
      bookingId ? `Booking ID: ${bookingId}.` : null,
      profileName ? `Name: ${profileName}.` : null,
      profileEmail ? `Email: ${profileEmail}.` : null,
      profilePhone ? `Phone: ${profilePhone}.` : null,
    ].filter(Boolean);
    return parts.join(" ");
  }, [studio?.name, slot?.title, dateLabel, priceLabel, bookingId, profileName, profileEmail, profilePhone]);

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : "";

  const openWhatsapp = async () => {
    if (!whatsappUrl) {
      Alert.alert("Missing WhatsApp", "Studio WhatsApp number is missing.");
      return;
    }
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (!canOpen) {
      Alert.alert("Unable to open WhatsApp", "Please open WhatsApp manually.");
      return;
    }
    Linking.openURL(whatsappUrl);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.subtitle}>Send payment confirmation via WhatsApp.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{slot?.title || "Dance class"}</Text>
          <Text style={styles.cardText}>{studio?.name || "Studio"}</Text>
          {dateLabel ? <Text style={styles.cardText}>{dateLabel}</Text> : null}
          <Text style={styles.cardPrice}>{priceLabel}</Text>
          {booking?.status ? (
            <Text style={styles.cardStatus}>Status: {booking.status}</Text>
          ) : null}
        </View>

        <Pressable style={styles.whatsappBtn} onPress={openWhatsapp}>
          <Ionicons name="logo-whatsapp" size={18} color="white" />
          <Text style={styles.whatsappText}>Pay via WhatsApp</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.replace("/(tabs)/bookings")}
        >
          <Text style={styles.secondaryText}>Back to my bookings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b" },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardText: { fontSize: 13, color: "#64748b" },
  cardPrice: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 4 },
  cardStatus: { fontSize: 12, color: "#94a3b8" },
  whatsappBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  whatsappText: { color: "white", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#334155", fontWeight: "600" },
  errorText: { color: "#64748b", marginBottom: 16, textAlign: "center" },
  backBtn: { padding: 12 },
  backBtnText: { color: "#8b5cf6", fontWeight: "600" },
});
