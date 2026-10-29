import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { useAuth } from '../../context/AuthContext.js';
import { DatasetService } from '../../services/dataset/datasetService.js';
import { DatasetProfile } from '../../types/dataset.js';
import { BIService } from '../../services/bi/biService.js';
import { StatisticalAnalysisService } from '../../services/stats/statisticalAnalysisService.js';
import { MLPipelineService } from '../../services/ml/mlPipelineService.js';
import { ExplainabilityService } from '../../services/xai/explainabilityService.js';
import { DashboardLayoutService } from '../../services/visualization/dashboardLayoutService.js';
import { useRealtimeDatasets, useRealtimeKPIs, useRealtimeNotifications } from '../../hooks/useRealtime.js';

import { ChartRenderer } from '../visualization/ChartRenderer.js';
import { KPIWidget } from '../visualization/KPIWidget.js';
import { ForecastWidget } from '../visualization/ForecastWidget.js';
import { AnomalyWidget } from '../visualization/AnomalyWidget.js';
import { StatisticalWidget } from '../visualization/StatisticalWidget.js';
import { MLPerformanceWidget } from '../visualization/MLPerformanceWidget.js';
import { XAIWidget } from '../visualization/XAIWidget.js';
import { BenchmarkComparisonCard } from '../visualization/BenchmarkComparisonCard.js';
import { HistoricalBenchmarkWidget } from '../visualization/HistoricalBenchmarkWidget.js';
import { ModelBenchmarkWidget } from '../visualization/ModelBenchmarkWidget.js';
import { UserBenchmarkManager } from '../visualization/UserBenchmarkManager.js';
import { BenchmarkingService } from '../../services/benchmark/benchmarkingService.js';

import { PlatformWorkspaceBar } from '../platform/PlatformWorkspaceBar.js';
import { NotificationCenterWidget } from '../platform/NotificationCenterWidget.js';
import { SavedAnalysesWidget } from '../platform/SavedAnalysesWidget.js';
import { ResourceShareModal } from '../platform/ResourceShareModal.js';
import {
  WorkspaceService,
  NotificationService,
  SavedAnalysisService,
  ReportService
} from '../../services/platform/platformServices.js';

import { RecruitmentProjectCard } from '../recruitment/RecruitmentProjectCard.js';
import { CandidateComparisonMatrix } from '../recruitment/CandidateComparisonMatrix.js';
import { SkillGapWidget } from '../recruitment/SkillGapWidget.js';
import { RecruitmentAnalyticsWidget } from '../recruitment/RecruitmentAnalyticsWidget.js';
import { RecruitmentIntelligenceService } from '../../services/recruitment/recruitmentService.js';

export const ExecutiveDashboard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || null;

  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDatasetProfile, setSelectedDatasetProfile] = useState<DatasetProfile | null>(null);

  /* Analytics & Benchmarking State */
  const [biData, setBiData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [mlModels, setMlModels] = useState<any[]>([]);
  const [xaiData, setXaiData] = useState<any>(null);
  const [userBenchmarks, setUserBenchmarks] = useState<any[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<any[]>([]);
  const [modelComparisons, setModelComparisons] = useState<any[]>([]);
  const [historicalComparison, setHistoricalComparison] = useState<any>(null);

  /* Enterprise Platform State */
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);

  /* Realtime Hooks */
  const realtimeDatasetEvent = useRealtimeDatasets(userId);
  const realtimeKPIEvent = useRealtimeKPIs(userId);
  const realtimeNotifications = useRealtimeNotifications(userId);

  const fetchUserBenchmarks = () => {
    if (!userId) return;
    BenchmarkingService.getBenchmarkStatus(userId)
      .then(setUserBenchmarks)
      .catch((err) => console.error('[User Benchmarks Load Error]', err));
  };

  const fetchPlatformData = () => {
    if (!userId) return;

    WorkspaceService.ensurePersonalWorkspace(userId)
      .then((personalWs) => {
        WorkspaceService.getWorkspaces(userId).then((wsList) => {
          setWorkspaces(wsList);
          if (!activeWorkspaceId) setActiveWorkspaceId(personalWs.id);
        });
      })
      .catch((err) => console.error('[Workspace Fetch Error]', err));

    NotificationService.getNotifications(userId)
      .then(setNotifications)
      .catch((err) => console.error('[Notifications Fetch Error]', err));

    NotificationService.getUnreadCount(userId)
      .then(setUnreadCount)
      .catch((err) => console.error('[Unread Count Error]', err));

    SavedAnalysisService.getSavedAnalyses(userId)
      .then(setSavedAnalyses)
      .catch((err) => console.error('[Saved Analyses Fetch Error]', err));
  };

  /* 1. Load User Datasets, Benchmarks, & Platform Data */
  useEffect(() => {
    if (!userId) return;
    fetchUserBenchmarks();
    fetchPlatformData();
    DatasetService.listDatasets(userId)
      .then((dsList) => {
        setDatasets(dsList);
        if (dsList.length > 0) {
          setSelectedDatasetId(dsList[0].id);
          /* Fetch profile for the initially selected dataset */
          DatasetService.getDataset(dsList[0].id).then((dsDetails) => {
            setSelectedDatasetProfile(dsDetails.profile || null);
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Dashboard Dataset Load Error]', err);
        setLoading(false);
      });
  }, [userId, realtimeDatasetEvent]);

  /* 2. Load Selected Dataset Analytics & Benchmarking */
  useEffect(() => {
    if (!userId || !selectedDatasetId) return;

    /* Fetch profile for the selected dataset */
    DatasetService.getDataset(selectedDatasetId).then((dsDetails) => {
      setSelectedDatasetProfile(dsDetails.profile || null);
    }).catch(() => setSelectedDatasetProfile(null));

    Promise.all([
      BIService.getBIFullAnalytics(userId, selectedDatasetId).catch(() => null),
      StatisticalAnalysisService.getStatisticalResults(userId, selectedDatasetId).catch(() => []),
      MLPipelineService.listModels(selectedDatasetId).catch(() => []),
      BenchmarkingService.getBenchmarkResults(userId, selectedDatasetId).catch(() => []),
      BenchmarkingService.getBenchmarkResults(userId, selectedDatasetId).catch(() => []),
      BenchmarkingService.compareModels(selectedDatasetId).catch(() => []),
      BenchmarkingService.compareHistoricalPerformance(userId, selectedDatasetId, 'churn_rate').catch(() => null)
    ]).then(([biRes, statsRes, mlRes, benchRes, modelCompRes, histCompRes]) => {
      setBiData(biRes);
      setStatsData(statsRes || []);
      setMlModels(mlRes || []);
      setBenchmarkResults(benchRes || []);
      setModelComparisons(modelCompRes || []);
      setHistoricalComparison(histCompRes);
    });
  }, [userId, selectedDatasetId, realtimeKPIEvent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 px-5 py-3 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-gray-300">Loading InsightIQ Executive Dashboard...</span>
        </div>
      </div>
    );
  }

  const sampleChartData = [
    { label: 'Q1', value: 4500 },
    { label: 'Q2', value: 6200 },
    { label: 'Q3', value: 7800 },
    { label: 'Q4', value: 9400 }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            InsightIQ AI <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/40 font-semibold">Executive Intelligence</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Enterprise Analytics, BI Engine, Machine Learning & Collaboration Workspace</p>
        </div>

        {/* Platform Workspace, Notifications & Dataset Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <PlatformWorkspaceBar 
            userId={userId || 'usr_demo'}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={setActiveWorkspaceId}
            onWorkspaceCreated={fetchPlatformData}
          />

          <NotificationCenterWidget 
            userId={userId || 'usr_demo'}
            notifications={notifications}
            unreadCount={unreadCount}
            onRefresh={fetchPlatformData}
          />

          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <span>🔗 Share Access</span>
          </button>

          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <span className="text-xs text-gray-400 font-medium">Dataset:</span>
            <select 
              value={selectedDatasetId} 
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-transparent text-gray-200 text-xs font-medium focus:outline-none"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>{ds.name || ds.dataset_name} ({ds.file_type})</option>
              ))}
              {datasets.length === 0 && <option value="">No datasets uploaded</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Realtime Notification Banner */}
      {realtimeNotifications.length > 0 && (
        <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3 flex items-center justify-between text-xs text-blue-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Latest Event: {realtimeNotifications[0].title}</span>
          </div>
          <span className="text-[10px] text-blue-400/80">{new Date(realtimeNotifications[0].timestamp).toLocaleTimeString()}</span>
        </div>
      )}

      {/* Section 1: KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget title="Total Dataset Rows" value={biData?.kpis?.[0]?.metric_value || 12450} metricType="count" percentageChange={8.2} />
        <KPIWidget title="Processed Features" value={biData?.kpis?.[1]?.metric_value || 18} metricType="columns" percentageChange={2.4} />
        <KPIWidget title="Data Quality Score" value={`${biData?.kpis?.[2]?.metric_value || 98.5}%`} metricType="quality" percentageChange={0.5} />
        <KPIWidget title="Active Prediction Models" value={mlModels.length || 3} metricType="registry" percentageChange={12.0} />
      </div>

      {/* Section 2: Charts & Forecast Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartRenderer type="bar" data={sampleChartData} xAxisKey="label" yAxisKey="value" title="Revenue & Metric Progression" height={260} />
        </div>
        <div>
          <ForecastWidget algorithm="Prophet" horizon={30} confidenceScore={94.5} status="completed" />
        </div>
      </div>

      {/* Section 3: Anomaly & Statistical Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomalyWidget anomalies={biData?.anomalies || []} />
        <StatisticalWidget statsRecords={statsData} />
      </div>

      {/* Section 4: ML Model Performance & XAI Feature Attributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MLPerformanceWidget 
          modelName={mlModels[0]?.model_name || 'Customer Churn Predictor'} 
          algorithm={mlModels[0]?.algorithm || 'Random Forest'} 
          version={mlModels[0]?.version || 1} 
          status={mlModels[0]?.status || 'production'}
          metrics={[
            { metric_name: 'Accuracy', metric_value: 0.945 },
            { metric_name: 'Precision', metric_value: 0.932 },
            { metric_name: 'Recall', metric_value: 0.951 }
          ]} 
        />
        <XAIWidget 
          method="SHAP" 
          summary="Primary feature drivers influencing prediction boundaries across test observations." 
          features={[
            { feature_name: 'Revenue Telemetry', contribution: 0.3842, direction: 'positive' },
            { feature_name: 'User Engagement', contribution: 0.2185, direction: 'positive' },
            { feature_name: 'Missing Values', contribution: -0.0914, direction: 'negative' }
          ]} 
        />
      </div>

      {/* Section 5: Benchmarking Intelligence Module */}
      <div className="space-y-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Benchmarking Intelligence <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/40 uppercase font-semibold">Reference Matrix</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Compare internal, historical, ML model, user-defined, and verified external benchmarks.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BenchmarkComparisonCard 
            title="Active KPI vs Benchmark Reference"
            comparison={{
              success: true,
              dataset_id: selectedDatasetId,
              metric_name: 'churn_rate',
              actual_value: 4.2,
              benchmark_value: 5.0,
              difference: -0.8,
              percentage_difference: -16.0,
              score: 85.0,
              percentile: 78.5,
              status: 'above_benchmark',
              benchmark_type: 'user_defined',
              unit: '%',
              source: 'User Target (Target Churn Max)',
              comparison_direction: 'lower_is_better',
              interpretation: 'Current churn_rate is 4.20%, compared with user_defined benchmark of 5.00%. Performance is 16.00% above benchmark target.'
            }}
          />

          {historicalComparison && (
            <HistoricalBenchmarkWidget 
              title="Historical KPI Baseline Benchmark"
              comparison={historicalComparison}
              unit="%"
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModelBenchmarkWidget 
            title="ML Model Performance Benchmark Matrix"
            models={modelComparisons.length > 0 ? modelComparisons : [
              {
                model_id: 'm_001',
                model_name: 'XGBoost Churn Classifier',
                version: 2,
                problem_type: 'classification',
                status: 'production',
                metrics: { accuracy: 0.945, precision: 0.932, recall: 0.951, f1: 0.941, roc_auc: 0.968 },
                is_baseline: false
              },
              {
                model_id: 'm_002',
                model_name: 'Random Forest Baseline',
                version: 1,
                problem_type: 'classification',
                status: 'archived',
                metrics: { accuracy: 0.892, precision: 0.880, recall: 0.895, f1: 0.887, roc_auc: 0.912 },
                is_baseline: true
              }
            ]}
          />

          <UserBenchmarkManager 
            userId={userId || 'usr_demo'}
            benchmarks={userBenchmarks}
            onRefresh={fetchUserBenchmarks}
          />
        </div>

        {/* Section 6: Saved Analyses & Workspace Artifacts */}
        <div className="pt-4 border-t border-gray-800">
          <SavedAnalysesWidget 
            userId={userId || 'usr_demo'}
            analyses={savedAnalyses}
            onRefresh={fetchPlatformData}
          />
        </div>

        {/* Section 7: Recruitment Intelligence Module */}
        <div className="space-y-6 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Recruitment Intelligence <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 uppercase font-semibold font-mono">Decision Support Mode</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Candidate qualification matching, transparent scoring, skill gaps & bias safeguards.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RecruitmentProjectCard
              project={{
                id: 'proj_rec_001',
                user_id: userId || 'usr_demo',
                project_name: 'Lead AI Data Architect',
                job_role: 'Senior AI Engineer',
                job_description: 'Evaluates candidate skills in Python, PyTorch, Supabase, ML Pipelines, and Explainable AI.',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }}
              candidateCount={12}
            />

            <div className="lg:col-span-2">
              <SkillGapWidget
                candidateName="Alex Mercer (Top Candidate)"
                skillGap={{
                  recruitment_project_id: 'proj_rec_001',
                  candidate_reference: 'cand_101',
                  required_skills: ['Python', 'SQL', 'PyTorch', 'System Architecture'],
                  candidate_skills: ['Python', 'SQL', 'PyTorch', 'Docker', 'AWS'],
                  matching_skills: ['Python', 'SQL', 'PyTorch'],
                  missing_skills: ['System Architecture'],
                  preferred_skills: ['Docker', 'AWS'],
                  additional_skills: ['Docker', 'AWS']
                }}
              />
            </div>
          </div>

          <CandidateComparisonMatrix
            jobRole="Senior AI Engineer"
            candidates={[
              {
                candidate_reference: 'cand_101',
                candidate_name: 'Alex Mercer',
                overall_score: 92.5,
                scores: { skill: 95.0, experience: 90.0, education: 90.0, certification: 90.0 },
                skill_gaps: {
                  recruitment_project_id: 'proj_rec_001',
                  candidate_reference: 'cand_101',
                  required_skills: ['Python', 'SQL', 'PyTorch'],
                  candidate_skills: ['Python', 'SQL', 'PyTorch'],
                  matching_skills: ['Python', 'SQL', 'PyTorch'],
                  missing_skills: [],
                  preferred_skills: ['Docker'],
                  additional_skills: ['Docker']
                },
                score_explanation: {
                  positive_factors: ['Matched 3/3 required skills', '5+ years relevant experience'],
                  negative_factors: [],
                  matched_requirements: ['Python', 'SQL', 'PyTorch'],
                  missing_requirements: []
                },
                fairness_excluded_fields: ['gender', 'age']
              },
              {
                candidate_reference: 'cand_102',
                candidate_name: 'Elena Rostova',
                overall_score: 84.0,
                scores: { skill: 85.0, experience: 82.0, education: 85.0, certification: 84.0 },
                skill_gaps: {
                  recruitment_project_id: 'proj_rec_001',
                  candidate_reference: 'cand_102',
                  required_skills: ['Python', 'SQL', 'PyTorch'],
                  candidate_skills: ['Python', 'SQL'],
                  matching_skills: ['Python', 'SQL'],
                  missing_skills: ['PyTorch'],
                  preferred_skills: ['AWS'],
                  additional_skills: ['AWS']
                },
                score_explanation: {
                  positive_factors: ['Matched 2/3 required skills'],
                  negative_factors: ['Missing PyTorch'],
                  matched_requirements: ['Python', 'SQL'],
                  missing_requirements: ['PyTorch']
                },
                fairness_excluded_fields: ['marital_status']
              }
            ]}
          />

          <RecruitmentAnalyticsWidget
            analytics={{
              total_candidates: 12,
              average_match_score: 82.4,
              skill_coverage_pct: 88.5,
              experience_distribution: { '0-2 Years': 2, '3-5 Years': 6, '5+ Years': 4 },
              education_distribution: { 'Bachelor': 7, 'Master': 4, 'Doctorate': 1 },
              score_distribution: { top_tier: 4, strong_tier: 5, moderate_tier: 2, low_tier: 1 },
              bias_monitoring_signal: {
                disparity_detected: false,
                excluded_protected_fields: ['gender', 'age', 'marital_status'],
                human_review_required: true,
                note: 'Protected characteristics (gender, age, marital_status) were automatically detected and excluded from candidate scoring models to enforce responsible hiring safeguards.'
              }
            }}
          />
        </div>
      </div>

      {/* Resource Share Modal */}
      <ResourceShareModal
        userId={userId || 'usr_demo'}
        resourceType="dashboard"
        resourceId={selectedDatasetId || 'dash_main'}
        resourceTitle="Executive Intelligence Dashboard"
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
};
