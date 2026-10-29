import { supabase } from '../../lib/supabase.js';
import {
  Workspace,
  SavedAnalysis,
  SavedDashboard,
  Notification,
  ReportItem,
  ResourceShare,
  PlatformSettings,
  AccessPermission,
  ResourceType,
  NotificationSeverity
} from '../../types/platform.js';

/**
 * 1. WORKSPACE SERVICE (Part 1 & 14)
 */
export const WorkspaceService = {
  async createWorkspace(
    userId: string,
    workspaceName: string,
    description?: string,
    isPersonal: boolean = false
  ): Promise<Workspace> {
    const { data, error } = await supabase
      .from('workspaces')
      .insert([{
        owner_id: userId,
        workspace_name: workspaceName.trim(),
        description: description?.trim() || null,
        is_personal: isPersonal
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getWorkspaces(userId: string): Promise<Workspace[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async ensurePersonalWorkspace(userId: string): Promise<Workspace> {
    const { data: existing } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', userId)
      .eq('is_personal', true)
      .maybeSingle();

    if (existing) return existing;

    return this.createWorkspace(userId, 'Personal Workspace', 'Default personal analytics workspace', true);
  }
};

/**
 * 2. SAVED ANALYSIS SERVICE (Part 3 & 14)
 */
export const SavedAnalysisService = {
  async saveAnalysis(
    userId: string,
    payload: {
      workspace_id?: string;
      dataset_id?: string;
      dataset_version_id?: string;
      analysis_name: string;
      analysis_type: string;
      selected_columns?: string[];
      filters?: Record<string, any>;
      statistical_config?: Record<string, any>;
      bi_config?: Record<string, any>;
      ai_config?: Record<string, any>;
    }
  ): Promise<SavedAnalysis> {
    const { data, error } = await supabase
      .from('saved_analyses')
      .insert([{
        user_id: userId,
        workspace_id: payload.workspace_id || null,
        dataset_id: payload.dataset_id || null,
        dataset_version_id: payload.dataset_version_id || null,
        analysis_name: payload.analysis_name.trim(),
        analysis_type: payload.analysis_type,
        selected_columns: payload.selected_columns || [],
        filters: payload.filters || {},
        statistical_config: payload.statistical_config || {},
        bi_config: payload.bi_config || {},
        ai_config: payload.ai_config || {}
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSavedAnalyses(userId: string, workspaceId?: string): Promise<SavedAnalysis[]> {
    let query = supabase
      .from('saved_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async deleteAnalysis(analysisId: string): Promise<boolean> {
    const { error } = await supabase
      .from('saved_analyses')
      .delete()
      .eq('id', analysisId);

    if (error) throw error;
    return true;
  }
};

/**
 * 3. DASHBOARD SERVICE (Part 4 & 14)
 */
export const DashboardService = {
  async saveDashboard(
    userId: string,
    payload: {
      workspace_id?: string;
      dataset_id?: string;
      layout_name: string;
      description?: string;
      widgets: any[];
      filters?: Record<string, any>;
      is_default?: boolean;
    }
  ): Promise<SavedDashboard> {
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .insert([{
        user_id: userId,
        workspace_id: payload.workspace_id || null,
        dataset_id: payload.dataset_id || null,
        layout_name: payload.layout_name.trim(),
        description: payload.description || null,
        widgets: payload.widgets || [],
        filters: payload.filters || {},
        is_default: payload.is_default ?? false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDashboards(userId: string, workspaceId?: string): Promise<SavedDashboard[]> {
    let query = supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async deleteDashboard(dashboardId: string): Promise<boolean> {
    const { error } = await supabase
      .from('dashboard_layouts')
      .delete()
      .eq('id', dashboardId);

    if (error) throw error;
    return true;
  }
};

/**
 * 4. NOTIFICATION SERVICE (Part 5, 6 & 14)
 */
export const NotificationService = {
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    severity: NotificationSeverity = 'info',
    metadata: Record<string, any> = {}
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        message,
        severity,
        metadata,
        read: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  async markNotificationRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  },

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return true;
  },

  async deleteNotification(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  }
};

/**
 * 5. REPORT SERVICE (Part 7 & 14)
 */
export const ReportService = {
  async getReports(userId: string): Promise<ReportItem[]> {
    const { data, error } = await supabase
      .from('executive_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async renameReport(reportId: string, newSummary: string): Promise<ReportItem> {
    const { data, error } = await supabase
      .from('executive_reports')
      .update({ summary: newSummary.trim() })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReport(reportId: string): Promise<boolean> {
    const { error } = await supabase
      .from('executive_reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
    return true;
  },

  async getReportMetadata(reportId: string): Promise<ReportItem | null> {
    const { data, error } = await supabase
      .from('executive_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};

/**
 * 6. SHARING SERVICE (Part 9, 10 & 14)
 */
export const SharingService = {
  async createShare(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    permission: AccessPermission = 'viewer',
    expirationHours?: number
  ): Promise<ResourceShare> {
    let expiration: string | null = null;
    if (expirationHours && expirationHours > 0) {
      const expDate = new Date();
      expDate.setHours(expDate.getHours() + expirationHours);
      expiration = expDate.toISOString();
    }

    const { data, error } = await supabase
      .from('resource_shares')
      .insert([{
        owner_id: userId,
        resource_type: resourceType,
        resource_id: resourceId,
        access_permission: permission,
        expiration,
        share_status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getShareByToken(shareToken: string): Promise<ResourceShare | null> {
    const { data, error } = await supabase
      .from('resource_shares')
      .select('*')
      .eq('share_token', shareToken)
      .eq('share_status', 'active')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    if (data.expiration && new Date(data.expiration) < new Date()) {
      return null; // Expired share token
    }

    return data;
  },

  async revokeShare(shareId: string): Promise<boolean> {
    const { error } = await supabase
      .from('resource_shares')
      .update({ share_status: 'revoked' })
      .eq('id', shareId);

    if (error) throw error;
    return true;
  },

  async listUserShares(userId: string): Promise<ResourceShare[]> {
    const { data, error } = await supabase
      .from('resource_shares')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

/**
 * 7. PLATFORM SETTINGS SERVICE (Part 12 & 14)
 */
export const PlatformSettingsService = {
  async getSettings(userId: string): Promise<PlatformSettings | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateSettings(userId: string, settingsPayload: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...settingsPayload,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
