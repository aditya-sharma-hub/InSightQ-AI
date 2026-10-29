/**
 * Vercel Serverless Function Entry Point for InsightIQ AI
 * 
 * Exports the Express app instance from server.js for serverless invocation.
 */
const path = require('path');
const fs = require('fs');

let serverApp = null;
let initError = null;

try {
  const server = require('../server.js');
  serverApp = server.app || server;
} catch (e1) {
  try {
    const server = require(path.join(process.cwd(), 'server.js'));
    serverApp = server.app || server;
  } catch (e2) {
    try {
      const server = require(path.join(__dirname, 'server.js'));
      serverApp = server.app || server;
    } catch (e3) {
      initError = new Error(`Failed to load server.js: ${e1.stack || e1.message} | ${e2.stack || e2.message} | ${e3.stack || e3.message}`);
    }
  }
}

module.exports = (req, res) => {
  if (initError || !serverApp) {
    console.error('[Serverless Init Error]', initError);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: false,
      error: 'Vercel serverless function failed during module initialization',
      details: initError ? initError.message : 'serverApp is null',
      stack: initError ? initError.stack : null
    }));
  }

  try {
    return serverApp(req, res);
  } catch (runtimeErr) {
    console.error('[Serverless Runtime Error]', runtimeErr);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: false,
      error: 'Serverless runtime exception',
      details: runtimeErr.message,
      stack: runtimeErr.stack
    }));
  }
};
