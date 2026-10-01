// Pure validation functions (no React). They mirror the server rules so users get instant feedback;
// the server still validates everything again. Each returns an error message, or null when valid.

export const validateEmail = (v: string): string | null => {
  const value = v.trim();
  if (!value) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Enter a valid email address.';
  return null;
};

export const validatePassword = (v: string): string | null => {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  if (v.length > 72) return 'Password must be at most 72 characters.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Password must contain a letter and a number.';
  return null;
};

export const validateConfirmPassword = (password: string, confirm: string): string | null => {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
};

export const validateName = (v: string): string | null => {
  const value = v.trim();
  if (!value) return 'Name is required.';
  if (value.length < 2) return 'Name must be at least 2 characters.';
  if (value.length > 80) return 'Name is too long.';
  return null;
};

/** Indian mobile: 10 digits, starting with 6-9 (the +91 is shown as a fixed prefix in the UI). */
export const validateMobile = (v: string): string | null => {
  const digits = v.replace(/[\s-]/g, '');
  if (!digits) return 'Mobile number is required.';
  if (!/^[6-9]\d{9}$/.test(digits)) return 'Enter a valid 10-digit Indian mobile number.';
  return null;
};

export const validateAddress = (v: string): string | null => {
  const value = v.trim();
  if (!value) return 'Address is required.';
  if (value.length < 5) return 'Address must be at least 5 characters.';
  if (value.length > 250) return 'Address is too long (250 characters max).';
  return null;
};

export const validateBusinessName = (v: string): string | null => (v.trim().length > 100 ? 'Business name is too long.' : null);

export const validateOtp = (v: string): string | null => (/^\d{6}$/.test(v) ? null : 'Enter the 6-digit code.');

export const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
