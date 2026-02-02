import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getCurrentRole, type MobileUserRole } from '../../../src/services/auth';

export default function AdminLayout() {
  const [role, setRole] = useState<MobileUserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadRole = async () => {
      try {
        const current = await getCurrentRole();
        if (!active) return;
        setRole(current);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadRole();
    return () => {
      active = false;
    };
  }, []);

  const isAdmin = role === 'owner' || role === 'instructor' || role === 'super_admin';
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/(tabs)');
    }
  }, [loading, isAdmin]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
