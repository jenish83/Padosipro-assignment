import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// One navigator; AuthContext.status decides which of these screens exist at any moment.
export type RootParams = {
  Login: { email?: string; notice?: string } | undefined;
  Register: undefined;
  VerifyEmail: { email: string; resendAfterSeconds?: number };
  Profile: undefined;
  TaskSelection: { mode?: 'first' | 'edit' } | undefined;
  Home: undefined;
};

export type ScreenProps<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;
