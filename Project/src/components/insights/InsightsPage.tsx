import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { useAuth } from '../../context/AuthContext.js';
import { DatasetService } from '../../services/dataset/datasetService.js';
import { StatisticalAnalysisService } from '../../services/stats/statisticalAnalysisService.js';
import { BIService } from '../../services/bi/biService.js';
import { MLPipelineService } from '../../services/ml/mlPipelineService.js';
import { DatasetProfile } from '../../types/dataset.js';
import { StructuredAIAnalysisResponse } from '../../types/ai.js';

export const InsightsPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [insights, setInsights] = useState<{
    observations: string[];
    interpretations: string[];
    recommendations: string[];
    analyticalFacts: Record<string, any> | null;
    confidence: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [datasetProfile, setDatasetProfile] = useState<DatasetProfile | null>(null);

  /* Fetch dataset profile when dataset is selected */
  useEffect(() => {
    if (!selectedDatasetId) return;
    DatasetService.getDataset(selectedDatasetId).then((dsDetails) => {
      setDatasetProfile(dsDetails.profile || null);
    });
  }, [selectedDatasetId]);

  /* Fetch insights when dataset changes */
  useEffect(() => {
    if (!selectedDatasetId) return;
    if (!userId) return;

    /* Fetch statistical analysis */
    StatisticalAnalysisService.getStatisticalResults(userId, selectedDatasetId)
      .then((statsRes) => {
        /* Fetch BI full analytics */
        BIService.getBIFullAnalytics(userId, selectedDatasetId).then((biRes) => {
          /* Fetch ML models */
          MLPipelineService.listModels(selectedDatasetId).then((mlRes) => {
            /* Build insights from available data */
            const observations: string[] = [];
            const interpretations: string[] = [];
            const recommendations: string[] = [];
            let analyticalFacts: Record<string, any> = {};
            let confidence = 0;

            /* Add statistical observations */
            if (statsRes && statsRes.length > 0) {
              const latestStat = statsRes[statsRes.length - 1];
              if (latestStat.mean !== undefined) {
                observations.push(
                  `Dataset has ${statsRes.length} statistical records with mean values recorded`
                );
                analyticalFacts.mean = latestStat.mean;
                confidence = Math.max(confidence, 85);
              }
              if (latestStat.median !== undefined) {
                observations.push(
                  `Median value detected across numeric columns`
                );
              }
              if (latestStat.outlier_count > 0) {
                observations.push(
                  `${latestStat.outlier_count} outlier value(s) detected in dataset`
                );
              }
              if (latestStat.unique_values > 0) {
                observations.push(
                  `${latestStat.unique_values} unique value(s) found across columns`
                );
              }
            }

            /* Add BI KPI observations */
            if (biRes) {
              const kpis = biRes.kpis;
              if (kpis.length > 0) {
                const latestKPI = kpis[kpis.length - 1];
                if (latestKPI.metricName && latestKPI.metricValue !== undefined) {
                  observations.push(
                    `${latestKPI.metricName}: ${latestKPI.metricValue}`
                  );
                }
              }
            }

            /* Add ML model observations */
            if (mlRes && mlRes.length > 0) {
              observations.push(
                `${mlRes.length} machine learning model(s) configured for this dataset`
              );
            }

            /* Add analytical facts from all sources */
            if (statsRes && statsRes.length > 0) {
              statsRes.forEach((stat: any) => {
                if (stat.mean !== undefined) analyticalFacts.mean = stat.mean;
                if (stat.median !== undefined) analyticalFacts.median = stat.median;
                if (stat.outlier_count > 0) analyticalFacts.outlier_count = stat.outlier_count;
                if (stat.unique_values > 0) analyticalFacts.unique_values = stat.unique_values;
              });
            }

            if (biRes && biRes.kpis && biRes.kpis.length > 0) {
              biRes.kpis.forEach((kpi: any) => {
                if (kpi.metricValue !== undefined) analyticalFacts[kpi.metricName] = kpi.metricValue;
              });
            }

            confidence = 70;

            setInsights({
              observations,
              interpretations,
              recommendations,
              analyticalFacts,
              confidence,
            });
            setLoading(false);
          });
        });
      })
      .catch((err) => {
        console.error('[Insights] Failed to load insights:', err);
        setLoading(false);
      });
  }, [selectedDatasetId, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
        <div className="flex items-center justify-center p-6">
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 px-5 py-3 rounded-xl shadow-lg">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-300">Loading Insights...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedDatasetId) {
    return (
      <div className="p-6 bg-gray-800 rounded-xl mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Insights</h2>
        <p className="text-gray-400">
          Select a dataset to generate insights. Upload a dataset or select from your projects.
        </p>
      </div>
    );
  }

  /* Generate interpretations and recommendations from observations and facts */
  const generateInterpretations = (): string[] => {
    const results: string[] = [];
    const facts = insights?.analyticalFacts;

    if (facts?.mean !== undefined) {
      const mean = facts.mean;
      results.push(
        `The dataset has a mean value of ${mean}, indicating the central tendency of numeric columns`
      );
    }
    if (facts?.outlier_count !== undefined && facts.outlier_count > 0) {
      results.push(
        ` ${facts.outlier_count} outlier value(s) detected may indicate data quality issues or anomalous business events requiring investigation`
      );
    }
    if (facts?.unique_values !== undefined) {
      results.push(
        ` ${facts.unique_values} unique value(s) observed reflecting the cardinality of key identifiers`
      );
    }
    if (facts?.median !== undefined) {
      results.push(
        `The median provides a robust measure of central tendency, less sensitive to extreme values than the mean`
      );
    }
    return results;
  };

  const generateRecommendations = (): string[] => {
    const results: string[] = [];
    const facts = insights?.analyticalFacts;

    /* Recommend based on data characteristics */
    if (facts?.outlier_count !== undefined && facts.outlier_count > 0) {
      results.push(
        'Investigate detected outliers to determine if they represent data entry errors, genuine extreme values, or significant business events'
      );
    }
    if (facts?.mean !== undefined && facts?.median !== undefined) {
      const mean = facts.mean;
      const median = facts.median;
      if (Math.abs(mean - median) > 1) {
        results.push(
          'Consider examining the data distribution shape; significant mean-median difference may indicate skewness'
        );
      }
    }
    if (!facts?.mean) {
      results.push(
        'Run descriptive statistics to understand the central tendency and distribution of numeric columns'
      );
    }
    results.push(
      'Perform correlation analysis to identify relationships between numeric variables'
    );
    results.push(
      'Consider segmenting the data by categorical dimensions to uncover hidden patterns'
    );
    return results;
  };

  if (!insights || insights.observations.length === 0 && insights.interpretations.length === 0) {
    return (
      <div className="p-6 bg-gray-800 rounded-xl mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Insights</h2>
        <p className="text-gray-400">
          No insights available for this dataset. Run statistical analysis to generate insights.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-xl mb-6">
      <h2 className="text-xl font-bold text-white mb-6">Insights</h2>

      {/* Observations */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-cyan-400 mb-3">Observations</h3>
        <div className="space-y-3 text-gray-300">
          {insights.observations.map((obs, idx) => (
            <div key={idx} className="p-3 bg-gray-900 rounded-border border-gray-700/50">
              <React.Fragment>
                {obs}
              </React.Fragment>
            </div>
          ))}
        </div>
      </div>

      {/* Interpretations */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-cyan-400 mb-3">Interpretations</h3>
        <div className="space-y-3 text-gray-300">
          {generateInterpretations().map((interp, idx) => (
            <div key={idx} className="p-3 bg-gray-900 rounded-border border-gray-700/50">
              <React.Fragment>
                {interp}
              </React.Fragment>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="text-base font-semibold text-cyan-400 mb-3">Recommendations</h3>
        <div className="space-y-3 text-gray-300">
          {insights.recommendations.length > 0
            ? insights.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-gray-900 rounded-border border-gray-700/50">
                  <React.Fragment>
                    {rec}
                  </React.Fragment>
                </div>
              ))
            : generateRecommendations().map((rec, idx) => (
                <div key={idx} className="p-3 bg-gray-900 rounded-border border-gray-700/50">
                  <React.Fragment>
                    {rec}
                  </React.Fragment>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};