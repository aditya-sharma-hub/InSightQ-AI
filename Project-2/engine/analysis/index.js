const {
  computeCorrelationMatrix,
  computeKMeans,
  computeForecasting,
  trainSupervisedModel,
  statisticalEngine,
  mlEngine,
  unsupervisedEngine,
  forecastingEngine,
  anomalyEngine
} = require('./structure_aware_analysis');

module.exports = {
  // Backwards compatible functions
  computeCorrelationMatrix,
  computeKMeans,
  computeForecasting,
  trainSupervisedModel,

  // Modular specialized engines
  statisticalEngine,
  mlEngine,
  unsupervisedEngine,
  forecastingEngine,
  anomalyEngine,

  // Re-export key functions directly for convenient access
  computeDescriptiveStatistics: statisticalEngine.computeDescriptiveStatistics,
  computeHistogram: statisticalEngine.computeHistogram,
  computeCorrelationAndCovariance: statisticalEngine.computeCorrelationAndCovariance,
  computeTwoSampleTTest: statisticalEngine.computeTwoSampleTTest,
  computeOneSampleTTest: statisticalEngine.computeOneSampleTTest,
  computePairedTTest: statisticalEngine.computePairedTTest,
  computeOneWayANOVA: statisticalEngine.computeOneWayANOVA,
  computeChiSquareTest: statisticalEngine.computeChiSquareTest,

  trainSupervisedEngine: mlEngine.trainSupervisedEngine,
  predictWithArtifact: mlEngine.predictWithArtifact,
  inferMLTaskType: mlEngine.inferMLTaskType,

  computePCA: unsupervisedEngine.computePCA,
  computeClusteringPipeline: unsupervisedEngine.computeClusteringPipeline,

  computeForecastingEngine: forecastingEngine.computeForecastingEngine,
  detectSeriesFrequency: forecastingEngine.detectSeriesFrequency,

  computeAnomalyDetectionEngine: anomalyEngine.computeAnomalyDetectionEngine
};
