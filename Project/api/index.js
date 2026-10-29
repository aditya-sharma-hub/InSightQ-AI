/**
 * Vercel Serverless Function Entry Point for InsightIQ AI
 * 
 * Exports the Express app instance from server.js for serverless invocation.
 */
const { app } = require('../server.js');

module.exports = app;
