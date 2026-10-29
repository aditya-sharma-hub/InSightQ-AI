export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string | null
          provider: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string | null
          provider?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string | null
          provider?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: 'light' | 'dark' | 'system'
          language: string
          timezone: string
          currency: string
          email_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: 'light' | 'dark' | 'system'
          language?: string
          timezone?: string
          currency?: string
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          theme?: 'light' | 'dark' | 'system'
          language?: string
          timezone?: string
          currency?: string
          email_notifications?: boolean
          updated_at?: string
        }
      }
      user_activity: {
        Row: {
          id: string
          user_id: string
          action: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          action?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      datasets: {
        Row: {
          id: string
          user_id: string
          name: string
          original_filename: string
          storage_path: string
          file_type: 'CSV' | 'XLS' | 'XLSX' | 'JSON' | 'PARQUET'
          file_size: number
          upload_source: string
          status: string
          row_count: number
          column_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          original_filename: string
          storage_path: string
          file_type: 'CSV' | 'XLS' | 'XLSX' | 'JSON' | 'PARQUET'
          file_size: number
          upload_source?: string
          status?: string
          row_count?: number
          column_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          storage_path?: string
          status?: string
          row_count?: number
          column_count?: number
          updated_at?: string
        }
      }
      dataset_versions: {
        Row: {
          id: string
          version_number: number
          dataset_id: string
          storage_path: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          version_number?: number
          dataset_id: string
          storage_path: string
          description?: string | null
          created_at?: string
        }
        Update: {
          description?: string | null
        }
      }
      dataset_columns: {
        Row: {
          id: string
          dataset_id: string
          column_name: string
          data_type: string
          null_percentage: number
          unique_values: number
          sample_values: Json
          is_target: boolean
          created_at: string
        }
        Insert: {
          id?: string
          dataset_id: string
          column_name: string
          data_type: string
          null_percentage?: number
          unique_values?: number
          sample_values?: Json
          is_target?: boolean
          created_at?: string
        }
        Update: {
          data_type?: string
          null_percentage?: number
          unique_values?: number
          sample_values?: Json
          is_target?: boolean
        }
      }
      dataset_quality: {
        Row: {
          id: string
          dataset_id: string
          duplicate_rows: number
          missing_values: number
          outlier_count: number
          quality_score: number
          last_scanned: string
        }
        Insert: {
          id?: string
          dataset_id: string
          duplicate_rows?: number
          missing_values?: number
          outlier_count?: number
          quality_score?: number
          last_scanned?: string
        }
        Update: {
          duplicate_rows?: number
          missing_values?: number
          outlier_count?: number
          quality_score?: number
          last_scanned?: string
        }
      }
      dataset_statistics: {
        Row: {
          id: string
          dataset_id: string
          total_rows: number
          total_columns: number
          numeric_columns: number
          categorical_columns: number
          datetime_columns: number
          memory_usage: number
          created_at: string
        }
        Insert: {
          id?: string
          dataset_id: string
          total_rows?: number
          total_columns?: number
          numeric_columns?: number
          categorical_columns?: number
          datetime_columns?: number
          memory_usage?: number
          created_at?: string
        }
        Update: {
          total_rows?: number
          total_columns?: number
          numeric_columns?: number
          categorical_columns?: number
          datetime_columns?: number
          memory_usage?: number
        }
      }
      dataset_tags: {
        Row: {
          id: string
          dataset_id: string
          tag_name: string
          created_at: string
        }
        Insert: {
          id?: string
          dataset_id: string
          tag_name: string
          created_at?: string
        }
        Update: {
          tag_name?: string
        }
      }
      dataset_processing_logs: {
        Row: {
          id: string
          dataset_id: string | null
          user_id: string
          processing_stage: string
          status: 'started' | 'completed' | 'failed' | 'in_progress'
          execution_time: number
          created_at: string
        }
        Insert: {
          id?: string
          dataset_id?: string | null
          user_id: string
          processing_stage: string
          status: 'started' | 'completed' | 'failed' | 'in_progress'
          execution_time?: number
          created_at?: string
        }
        Update: {
          status?: 'started' | 'completed' | 'failed' | 'in_progress'
          execution_time?: number
        }
      }
      business_kpis: {
        Row: {
          id: string
          user_id: string
          dataset_id: string
          metric_name: string
          metric_type: 'sum' | 'average' | 'count' | 'ratio' | 'growth' | 'percentage'
          metric_value: number
          aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct_count'
          visualization_type: 'card' | 'gauge' | 'trend_line' | 'progress'
          calculated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dataset_id: string
          metric_name: string
          metric_type: 'sum' | 'average' | 'count' | 'ratio' | 'growth' | 'percentage'
          metric_value: number
          aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct_count'
          visualization_type?: 'card' | 'gauge' | 'trend_line' | 'progress'
          calculated_at?: string
        }
        Update: {
          metric_name?: string
          metric_value?: number
          calculated_at?: string
        }
      }
      dashboard_metrics: {
        Row: {
          id: string
          user_id: string
          dataset_id: string
          widget_name: string
          widget_type: 'chart' | 'kpi_card' | 'table' | 'map' | 'funnel'
          chart_type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap'
          x_axis: string | null
          y_axis: string | null
          filters: Json
          refresh_interval: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dataset_id: string
          widget_name: string
          widget_type: 'chart' | 'kpi_card' | 'table' | 'map' | 'funnel'
          chart_type?: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap'
          x_axis?: string | null
          y_axis?: string | null
          filters?: Json
          refresh_interval?: number
          created_at?: string
        }
        Update: {
          widget_name?: string
          filters?: Json
        }
      }
      trend_analysis: {
        Row: {
          id: string
          user_id: string
          dataset_id: string
          trend_type: 'linear' | 'exponential' | 'seasonal' | 'cyclical'
          confidence: number
          slope: number
          seasonality: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          summary: string | null
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dataset_id: string
          trend_type: 'linear' | 'exponential' | 'seasonal' | 'cyclical'
          confidence?: number
          slope?: number
          seasonality?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          summary?: string | null
          generated_at?: string
        }
        Update: {
          summary?: string | null
        }
      }
      anomaly_results: {
        Row: {
          id: string
          user_id: string
          dataset_id: string
          anomaly_type: 'outlier' | 'spike' | 'drop' | 'variance_shift' | 'pattern_break'
          severity: 'low' | 'medium' | 'high' | 'critical'
          affected_columns: Json
          explanation: string | null
          detected_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dataset_id: string
          anomaly_type: 'outlier' | 'spike' | 'drop' | 'variance_shift' | 'pattern_break'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          affected_columns?: Json
          explanation?: string | null
          detected_at?: string
        }
        Update: {
          explanation?: string | null
        }
      }
      forecast_jobs: {
        Row: {
          id: string
          user_id: string
          dataset_id: string
          forecasting_algorithm: 'arima' | 'prophet' | 'exponential_smoothing' | 'linear_regression'
          prediction_horizon: number
          model_status: 'pending' | 'training' | 'completed' | 'failed'
          metrics: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dataset_id: string
          forecasting_algorithm: 'arima' | 'prophet' | 'exponential_smoothing' | 'linear_regression'
          prediction_horizon?: number
          model_status?: 'pending' | 'training' | 'completed' | 'failed'
          metrics?: Json
          created_at?: string
        }
        Update: {
          model_status?: 'pending' | 'training' | 'completed' | 'failed'
          metrics?: Json
        }
      }
      benchmark_results: {
        Row: {
          id: string
          user_id: string
          dataset_id: string
          benchmark_name: string
          benchmark_score: number
          percentile: number
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dataset_id: string
          benchmark_name: string
          benchmark_score?: number
          percentile?: number
          generated_at?: string
        }
        Update: {
          benchmark_score?: number
          percentile?: number
        }
      }
      executive_reports: {
        Row: {
          id: string
          user_id: string
          dataset_id: string
          summary: string
          strengths: Json
          weaknesses: Json
          opportunities: Json
          recommendations: Json
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dataset_id: string
          summary: string
          strengths?: Json
          weaknesses?: Json
          opportunities?: Json
          recommendations?: Json
          generated_at?: string
        }
        Update: {
          summary?: string
          strengths?: Json
          weaknesses?: Json
          opportunities?: Json
          recommendations?: Json
        }
      }
    }
  }
}
