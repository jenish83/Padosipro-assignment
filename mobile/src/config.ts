import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example). Defaults suit the emulators:
//  - Android emulator reaches your computer at 10.0.2.2
//  - iOS simulator can use localhost
// For a physical phone use your computer's LAN IP, e.g. http://192.168.1.10:4000
const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || fallback).replace(/\/$/, '');
export const RESEND_COOLDOWN_SECONDS = 30;
