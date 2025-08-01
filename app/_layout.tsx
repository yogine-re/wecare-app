import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import DashboardScreen from './(tabs)/index';
import LoginScreen from './login';

function AppContent() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();

  // Force check auth status on mount and when component updates
  React.useEffect(() => {
    console.log('🏗️ Layout: Checking auth status...');
    checkAuthStatus();
  }, []);

  // Add effect to log state changes
  React.useEffect(() => {
    console.log('🏗️ Layout: Authentication state changed - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    console.log('🏗️ Layout: Loading...');
    return null; // Or a splash/loading indicator
  }

  console.log('🏗️ Layout rendering, isAuthenticated:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('🏗️ Layout: User not authenticated, showing login screen');
    return <LoginScreen />;
  }

  console.log('🏗️ Layout: User authenticated, showing dashboard');
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DashboardScreen />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
