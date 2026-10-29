/**
 * InsightIQ AI - Authentication & User Types Specification
 */

export type UserRole = 
  | 'Data Analyst'
  | 'Data Scientist'
  | 'Project Manager'
  | 'Administrator';

export type AuthProviderType = 'email' | 'google' | 'azure';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  provider: AuthProviderType;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  email_notifications: boolean;
}

export interface AuthErrorResponse {
  message: string;
  code?: string;
  status?: number;
}
