/**
 * InsightIQ AI - Explainable AI (XAI) Contracts
 */

export type XAIMethod = 'SHAP' | 'LIME' | 'TreeInterpreter' | 'FeaturePermutation';

export type XAIType = 'global' | 'local' | 'what_if' | 'counterfactual';

export type FeatureDirection = 'positive' | 'negative' | 'neutral';

export interface MLExplanationFeature {
  id?: string;
  explanation_id?: string;
  feature_name: string;
  feature_value?: string | null;
  contribution: number;
  importance_rank: number;
  direction: FeatureDirection;
}

export interface MLExplanation {
  id: string;
  user_id: string;
  model_id: string;
  prediction_id?: string | null;
  explanation_method: XAIMethod;
  explanation_type: XAIType;
  explanation_data: Record<string, any>;
  created_at: string;
}

export interface WhatIfRequest {
  model_id: string;
  original_input: Record<string, any>;
  modified_features: Record<string, any>;
}

export interface WhatIfResponse {
  success: boolean;
  explanation_id: string;
  original_prediction: number;
  new_prediction: number;
  difference: number;
  changed_features: Record<string, any>;
}

export interface CounterfactualResponse {
  current_prediction: number;
  desired_outcome: string | number;
  recommended_feature_changes: {
    feature_name: string;
    current_value: any;
    recommended_value: any;
    feasibility: 'easy' | 'moderate' | 'difficult';
  }[];
  causality_disclaimer: string;
}

export interface ModelXAICompatibility {
  model_id: string;
  algorithm: string;
  supported_methods: XAIMethod[];
  shap_supported: boolean;
  lime_supported: boolean;
}
