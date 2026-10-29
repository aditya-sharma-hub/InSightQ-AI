import { supabase } from '../../lib/supabase.js';

export type PrivateBucket = 'avatars' | 'datasets' | 'reports' | 'exports' | 'models';

export const storageSecurityService = {
  /**
   * Helper: Ensures the storage path strictly follows the pattern {userId}/{filePath}
   */
  formatStoragePath(userId: string, filePath: string): string {
    const cleanPath = filePath.replace(/^\/+/, '');
    return `${userId}/${cleanPath}`;
  },

  /**
   * 1. uploadFile: Uploads a file to a private bucket inside the user's isolated folder
   */
  async uploadFile(bucket: PrivateBucket, userId: string, filePath: string, file: File) {
    const targetPath = this.formatStoragePath(userId, filePath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(targetPath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data;
  },

  /**
   * 2. downloadFile: Downloads a file belonging to the authenticated user from a private bucket
   */
  async downloadFile(bucket: PrivateBucket, userId: string, filePath: string) {
    const targetPath = this.formatStoragePath(userId, filePath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(targetPath);

    if (error) throw error;
    return data;
  },

  /**
   * 3. deleteFile: Deletes a file belonging to the authenticated user from a private bucket
   */
  async deleteFile(bucket: PrivateBucket, userId: string, filePath: string) {
    const targetPath = this.formatStoragePath(userId, filePath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([targetPath]);

    if (error) throw error;
    return data;
  },

  /**
   * 4. listFiles: Lists all files inside the authenticated user's private folder
   */
  async listFiles(bucket: PrivateBucket, userId: string, subPath: string = '') {
    const pathPrefix = subPath ? `${userId}/${subPath.replace(/^\/+/, '')}` : userId;

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(pathPrefix, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) throw error;
    return data;
  },

  /**
   * 5. getSignedUrl: Generates a temporary signed URL for viewing private assets securely
   */
  async getSignedUrl(bucket: PrivateBucket, userId: string, filePath: string, expiresInSeconds: number = 3600) {
    const targetPath = this.formatStoragePath(userId, filePath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(targetPath, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  }
};
