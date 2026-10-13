const { generateCleaningPlan, applyCleaningPlan, levenshteinDistance } = require('./cleaner');

module.exports = {
  generateCleaningPlan,
  applyCleaningPlan,
  executeCleaning: applyCleaningPlan,
  levenshteinDistance
};
