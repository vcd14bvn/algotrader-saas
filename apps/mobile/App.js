import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/lib/auth';
import { COLORS } from './src/lib/theme';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SignalsScreen from './src/screens/SignalsScreen';
import TradesScreen from './src/screens/TradesScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: { active: '📊', inactive: '📊' },
  Signals: { active: '🔔', inactive: '🔔' },
  Trades: { active: '📋', inactive: '📋' },
  Charts: { active: '📈', inactive: '📈' },
  Settings: { active: '⚙️', inactive: '⚙️' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name];
          return <>{focused ? icons.active : icons.inactive}</>;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Signals" component={SignalsScreen} />
      <Tab.Screen name="Trades" component={TradesScreen} />
      <Tab.Screen name="Charts" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { token, restoreSession } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await restoreSession();
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: COLORS.accent,
            background: COLORS.bg,
            card: COLORS.surface,
            text: COLORS.text,
            border: COLORS.border,
            notification: COLORS.accent4,
          },
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
