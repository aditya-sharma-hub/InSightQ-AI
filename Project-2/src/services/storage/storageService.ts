import { supabase } from '../../lib/supabase.js';

export type StorageBucket = 'avatars' | 'datasets' | 'reports' | 'exports';

export const storageService = {
  /**
   * Helper: Construct target path adhering to folder convention: {userId}/{filePath}
   */
  getStoragePath(userId: string, filePath: string): string {
    const cleanPath = filePath.replace(/^\/+/, '');
    return `${userId}/${cleanPath}`;
  },

  /**
   * Upload User Avatar image into private 'avatars' bucket under avatars/{userId}/avatar.{ext}
   */
  async uploadAvatar(userId: string, file: File) {
    const ext = file.name.split('.').pop() || 'png';
    const filePath = this.getStoragePath(userId, `profile-avatar.${ext}`);

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data;
  },

  /**
   * Upload Dataset file into private 'datasets' bucket under datasets/{userId}/{filePath}
   */
  async uploadDataset(userId: string, fileName: string, file: File) {
    const filePath = this.getStoragePath(userId, fileName);

    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data;
  },

  /**
   * Upload Report document into private 'reports' bucket under reports/{userId}/{filePath}
   */
  async uploadReport(userId: string, fileName: string, file: File) {
    const filePath = this.getStoragePath(userId, fileName);

    const { data, error } = await supabase.storage
      .from('reports')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data;
  },

  /**
   * Upload Export artifact into private 'exports' bucket under exports/{userId}/{filePath}
   */
  async uploadExport(userId: string, fileName: string, file: File) {
    const filePath = this.getStoragePath(userId, fileName);

    const { data, error } = await supabase.storage
      .from('exports')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data;
  },

  /**
   * Download a private file from any bucket
   */
  async downloadFile(bucket: StorageBucket, userId: string, fileName: string) {
    const filePath = this.getStoragePath(userId, fileName);

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) throw error;
    return data;
  },

  /**
   * Generate a secure temporary Signed URL for private file access
   */
  async getSignedUrl(bucket: StorageBucket, userId: string, fileName: string, expiresInSeconds: number = 3600) {
    const filePath = this.getStoragePath(userId, fileName);

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  },

  /**
   * List files belonging to the authenticated user inside a private bucket
   */
  async listFiles(bucket: StorageBucket, userId: string, subPath: string = '') {
    const pathPrefix = subPath ? `${userId}/${subPath}` : userId;

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
   * Delete a file from a private bucket
   */
  async deleteFile(bucket: StorageBucket, userId: string, fileName: string) {
    const filePath = this.getStoragePath(userId, fileName);

    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    return data;
  }
};
