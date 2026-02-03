import { Tabs as ExpoTabs, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCurrentRole, type MobileUserRole } from '../../src/services/auth';
import { markAutoOpenedAdmin, shouldAutoOpenAdmin } from '../../src/services/admin-bridge';
import { useFocusEffect } from '@react-navigation/native';
import { TabSwipeProvider } from '../../src/contexts/tab-swipe';
import { supabase } from '../../src/lib/supabase';

export default function TabLayout() {
  const [role, setRole] = useState<MobileUserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const autoOpenedAdminRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      try {
        const stored = await getCurrentRole();
        if (mounted) {
          setRole(stored);
          setLoadingRole(false);
        }
      } catch {
        if (mounted) {
          setRole(null);
          setLoadingRole(false);
        }
      }
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const reloadRole = async () => {
        try {
          const stored = await getCurrentRole();
          if (active) setRole(stored);
        } catch {
          if (active) setRole(null);
        }
      };
      reloadRole();
      return () => {
        active = false;
      };
    }, [])
  );

  const swipeContextValue = useMemo(
    () => ({ swipeEnabled, setSwipeEnabled }),
    [swipeEnabled]
  );

  const makeAuthGuard = useCallback((path: string) => ({
    tabPress: (e: any) => {
      e.preventDefault();
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace(path);
        } else {
          router.replace('/(auth)/login');
        }
      })();
    },
  }), []);

  useEffect(() => {
    if (loadingRole || autoOpenedAdminRef.current) return;
    const maybeAutoOpen = async () => {
      if (await shouldAutoOpenAdmin(role)) {
        autoOpenedAdminRef.current = true;
        await markAutoOpenedAdmin();
        router.replace('/admin');
      }
    };
    void maybeAutoOpen();
  }, [loadingRole, role]);
  
  return (
    <TabSwipeProvider value={swipeContextValue}>
      <ExpoTabs
        key={role ?? 'guest'}
        screenOptions={{
          tabBarActiveTintColor: '#111827',
          tabBarInactiveTintColor: '#9ca3af',
          headerShown: false,
          tabBarStyle: { backgroundColor: '#ffffff' },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600', textTransform: 'none' },
        }}>
        <ExpoTabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <ExpoTabs.Screen
          name="bookings/index"
          options={{
            title: 'Reservations',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          }}
          listeners={makeAuthGuard('/(tabs)/bookings')}
        />
        <ExpoTabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
          }}
          listeners={makeAuthGuard('/(tabs)/profile')}
        />
      </ExpoTabs>
    </TabSwipeProvider>
  );
}
