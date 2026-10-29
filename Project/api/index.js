/**
 * Vercel Serverless Function Entry Point for InsightIQ AI
 * 
 * Exports the Express app instance from server.js for serverless invocation.
 */
const path = require('path');
const fs = require('fs');

let serverApp;
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
      throw new Error(`Failed to load server.js: ${e1.message} | ${e2.message} | ${e3.message}`);
    }
  }
}

module.exports = serverApp;
