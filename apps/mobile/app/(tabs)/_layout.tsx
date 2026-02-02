import { Tabs } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStoredRole, type MobileUserRole } from '../../src/services/auth';
import { useFocusEffect } from '@react-navigation/native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState<MobileUserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      try {
        const stored = await getStoredRole();
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
          const stored = await getStoredRole();
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

  return (
    <Tabs
      key={role ?? 'guest'}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
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
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
        }}
      />
      {isAdmin && !loadingRole ? (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
            tabBarButton: HapticTab,
          }}
        />
      ) : (
        <Tabs.Screen
          name="admin"
          options={{
            href: null,
          }}
        />
      )}
    </Tabs>
  );
}
