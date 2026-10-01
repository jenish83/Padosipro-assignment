import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootParams } from './types';
import { useAuth } from '../context/AuthContext';
import { ErrorView, LoadingView } from '../components/Feedback';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TaskSelectionScreen from '../screens/TaskSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootParams>();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary } };

export default function RootNavigator() {
  const { status, bootError, refresh, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.full}>
        <LoadingView message="Getting things ready…" />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.full}>
        <ErrorView message={bootError ?? 'Something went wrong.'} onRetry={refresh} secondaryLabel="Log out" onSecondary={signOut} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {status === 'signedOut' ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        ) : status === 'needsProfile' ? (
          <Stack.Screen name="Profile" component={ProfileScreen} />
        ) : status === 'needsTasks' ? (
          // Same route name is also used after onboarding. A different navigationKey
          // drops this screen when tasks are first saved, so Home opens immediately
          // instead of only after a reload.
          <Stack.Screen name="TaskSelection" component={TaskSelectionScreen} navigationKey="needsTasks" />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="TaskSelection" component={TaskSelectionScreen} navigationKey="ready" />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({ full: { flex: 1, backgroundColor: colors.background } });
