export interface User {
  id: string;
  email?: string;
  name: string;
  operatorId?: string;
  mobileNumber?: string;
  countryCode?: string;
  password?: string;  // ✅ ADD THIS LINE - for storage only
  uid?: string;
  dob?: string;
  createdAt?: string;
  resetToken?: string;
  resetTokenExpiry?: number;
  isTwoFactorEnabled?: boolean;
  isRJ?: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
}

export interface LoginCredentials {
  email?: string;
  operatorId?: string;
  mobileNumber?: string;
  countryCode?: string;
  password: string;
}

export interface SignupCredentials {
  email?: string;
  mobileNumber?: string;
  countryCode?: string;
  password: string;
  confirmPassword: string;
  name: string;
  dob: string;
}

export interface TwoFactorLoginRequest {
  userId?: string;
  mobileNumber?: string;
  countryCode?: string;
  otp?: string;
  password?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ResetPasswordCredentials {
  token: string;
  newPassword: string;
  confirmPassword: string;
}