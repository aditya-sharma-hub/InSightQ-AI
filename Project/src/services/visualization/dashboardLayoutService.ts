import { supabase } from '../../lib/supabase.js';
import { DashboardLayout, DashboardWidget } from '../../types/visualization.js';

export const DashboardLayoutService = {
  /**
   * 1. getLayout: Retrieve user's persisted dashboard layout for a dataset
   */
  async getLayout(userId: string, datasetId?: string): Promise<DashboardLayout | null> {
    let query = supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId);

    if (datasetId) {
      query = query.eq('dataset_id', datasetId);
    } else {
      query = query.eq('is_default', true);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * 2. saveLayout: Save or update dashboard layout
   */
  async saveLayout(userId: string, datasetId: string | undefined, layoutName: string, widgets: DashboardWidget[]) {
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .upsert({
        user_id: userId,
        dataset_id: datasetId || null,
        layout_name: layoutName,
        widgets,
        is_default: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,dataset_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 3. addWidget: Append widget to existing layout
   */
  async addWidget(userId: string, datasetId: string | undefined, widget: DashboardWidget) {
    const layout = await this.getLayout(userId, datasetId);
    const widgets = layout ? [...layout.widgets, widget] : [widget];
    return await this.saveLayout(userId, datasetId, layout?.layout_name || 'Executive Dashboard', widgets);
  },

  /**
   * 4. removeWidget: Remove widget from layout
   */
  async removeWidget(userId: string, datasetId: string | undefined, widgetId: string) {
    const layout = await this.getLayout(userId, datasetId);
    if (!layout) return null;
    const widgets = layout.widgets.filter((w) => w.id !== widgetId);
    return await this.saveLayout(userId, datasetId, layout.layout_name, widgets);
  }
};
