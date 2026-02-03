import { Tabs as ExpoTabs, withLayoutContext, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentRole, type MobileUserRole } from '../../src/services/auth';
import { markAutoOpenedAdmin, shouldAutoOpenAdmin } from '../../src/services/admin-bridge';
import { useFocusEffect } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Platform } from 'react-native';
import { TabSwipeProvider } from '../../src/contexts/tab-swipe';
import { supabase } from '../../src/lib/supabase';

const MaterialTopTabs = createMaterialTopTabNavigator();
const Tabs = withLayoutContext(MaterialTopTabs.Navigator);

export default function TabLayout() {
  const colorScheme = useColorScheme();
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

  const isAdmin = role === 'owner' || role === 'instructor' || role === 'super_admin';
  const swipeContextValue = useMemo(
    () => ({ swipeEnabled, setSwipeEnabled }),
    [swipeEnabled]
  );

  const showAdmin = isAdmin && !loadingRole;

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
  
  if (Platform.OS === 'web') {
    return (
      <TabSwipeProvider value={swipeContextValue}>
        <ExpoTabs
          key={role ?? 'guest'}
          screenOptions={{
            tabBarActiveTintColor: '#111827',
            tabBarInactiveTintColor: '#9ca3af',
            headerShown: false,
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

  return (
    <TabSwipeProvider value={swipeContextValue}>
      <Tabs
        key={role ?? 'guest'}
        tabBarPosition="bottom"
        screenOptions={{
          tabBarActiveTintColor: '#111827',
          tabBarInactiveTintColor: '#9ca3af',
          headerShown: false,
          swipeEnabled,
          tabBarShowIcon: true,
          tabBarIndicatorStyle: { height: 0 },
          tabBarStyle: { backgroundColor: '#ffffff' },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600', textTransform: 'none' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookings/index"
          options={{
            title: 'Reservations',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          }}
          listeners={makeAuthGuard('/(tabs)/bookings')}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
          }}
          listeners={makeAuthGuard('/(tabs)/profile')}
        />
      </Tabs>
    </TabSwipeProvider>
  );
}
