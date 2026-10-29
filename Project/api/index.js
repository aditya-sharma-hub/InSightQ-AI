/**
 * Vercel Serverless Function Entry Point for InsightIQ AI
 * 
 * Exports the Express app instance from server.js for serverless invocation.
 */
// Polyfill DOMMatrix for headless/serverless Node environments (e.g., pdf-parse in Node 20)
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
    }
  };
}

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
