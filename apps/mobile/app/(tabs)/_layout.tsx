import { Tabs as ExpoTabs, withLayoutContext } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentRole, type MobileUserRole } from '../../src/services/auth';
import { useFocusEffect } from '@react-navigation/native';
import { createMaterialTopTabNavigator, MaterialTopTabBar } from '@react-navigation/material-top-tabs';
import { Platform } from 'react-native';
import { TabSwipeProvider } from '../../src/contexts/tab-swipe';

const MaterialTopTabs = createMaterialTopTabNavigator();
const Tabs = withLayoutContext(MaterialTopTabs.Navigator);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState<MobileUserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [swipeEnabled, setSwipeEnabled] = useState(true);

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
          />
          <ExpoTabs.Screen
            name="profile/index"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
            }}
          />
          <ExpoTabs.Screen
            name="admin"
            options={
              isAdmin && !loadingRole
                ? {
                    title: 'Admin',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
                  }
                : {
                    href: null,
                  }
            }
          />
        </ExpoTabs>
      </TabSwipeProvider>
    );
  }

  const renderMaterialTabBar = (props: any) => {
    if (isAdmin || loadingRole) {
      return <MaterialTopTabBar {...props} />;
    }

    const filteredRoutes = props.state.routes.filter((route: any) => route.name !== 'admin');
    const filteredState = {
      ...props.state,
      routes: filteredRoutes,
      index: Math.min(props.state.index, filteredRoutes.length - 1),
    };
    const filteredDescriptors = filteredRoutes.reduce((acc: any, route: any) => {
      acc[route.key] = props.descriptors[route.key];
      return acc;
    }, {});

    return <MaterialTopTabBar {...props} state={filteredState} descriptors={filteredDescriptors} />;
  };

  return (
    <TabSwipeProvider value={swipeContextValue}>
      <Tabs
        key={role ?? 'guest'}
        tabBarPosition="bottom"
        tabBar={renderMaterialTabBar}
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
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={
            isAdmin && !loadingRole
              ? {
                  title: 'Admin',
                  tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
                }
              : {
                  tabBarItemStyle: { display: 'none' },
                }
          }
        />
      </Tabs>
    </TabSwipeProvider>
  );
}
