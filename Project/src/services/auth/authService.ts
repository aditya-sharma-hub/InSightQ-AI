import { supabase } from '../../lib/supabase.js';
import { UserRole } from '../../types/auth.js';

export const authService = {
  /**
   * Get Active Auth Session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Register a new user with Email, Password, Full Name, and Role
   */
  async signUp({ email, password, fullName, role }: { email: string; password: string; fullName: string; role: UserRole }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role
        }
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with Email and Password
   */
  async signInWithEmail({ email, password }: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with Microsoft OAuth
   */
  async signInWithMicrosoft() {
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Send Password Reset Email
   */
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign Out Current User
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Fetch User Profile from RLS Protected 'profiles' table
   */
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }
    return data || null;
  },

  /**
   * Ensure or Create Real User Profile on First Login
   */
  async ensureUserProfile(authUser: any) {
    if (!authUser) return null;

    let profile = await this.getUserProfile(authUser.id);

    if (!profile) {
      const userMeta = authUser.user_metadata || {};
      const newProfile = {
        id: authUser.id,
        email: authUser.email,
        full_name: userMeta.full_name || userMeta.name || authUser.email?.split('@')[0] || 'Enterprise User',
        avatar_url: userMeta.avatar_url || userMeta.picture || null,
        role: userMeta.role || 'Data Scientist',
        provider: authUser.app_metadata?.provider || 'email',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (!error && data) {
        profile = data;
      } else {
        profile = newProfile;
      }
    }

    return profile;
  }
};
