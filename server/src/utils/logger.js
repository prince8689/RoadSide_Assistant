// ============================================
// LOGGER UTILITY
// ============================================
// Provides structured logging for the entire application.
//
// Components:
//   1. accessLogger  — Morgan middleware that writes to logs/access.log
//   2. consoleLogger — Morgan middleware that logs to console (dev mode)
//   3. logError()    — Writes error details to logs/error.log
//   4. logger        — Simple log functions: info, warn, error
//
// Log files are auto-created in /server/logs/ directory.

const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// ── Create logs directory if it doesn't exist ──
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ── File streams (append mode) ──
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

// ── Custom Morgan format ──
const logFormat = ':date[iso] :method :url :status :response-time ms - :res[content-length]';

// ── Morgan middleware instances ──
const accessLogger = morgan(logFormat, { stream: accessLogStream });
const consoleLogger = morgan('dev');

// ── Error logger (writes to error.log file) ──
const logError = (error, req) => {
  const timestamp = new Date().toISOString();
  const method = req?.method || 'N/A';
  const url = req?.originalUrl || req?.url || 'N/A';
  const userId = req?.user?.id || 'anonymous';
  const message = error?.message || 'Unknown error';
  const stack = error?.stack || '';

  const log = `[${timestamp}] ${method} ${url} | User: ${userId} | Error: ${message}\n${stack}\n---\n`;
  errorLogStream.write(log);
};

// ── Simple logger functions ──
// Replace console.log/warn/error throughout the codebase with these
const logger = {
  info: (message, data = '') => {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] INFO: ${message} ${data ? JSON.stringify(data) : ''}\n`;
    if (process.env.NODE_ENV !== 'production') {
      process.stdout.write(`  ℹ️  ${message} ${data ? JSON.stringify(data) : ''}\n`);
    }
    accessLogStream.write(log);
  },

  warn: (message, data = '') => {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] WARN: ${message} ${data ? JSON.stringify(data) : ''}\n`;
    if (process.env.NODE_ENV !== 'production') {
      process.stdout.write(`  ⚠️  ${message} ${data ? JSON.stringify(data) : ''}\n`);
    }
    errorLogStream.write(log);
  },

  error: (message, data = '') => {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] ERROR: ${message} ${data ? JSON.stringify(data) : ''}\n`;
    if (process.env.NODE_ENV !== 'production') {
      process.stderr.write(`  🔴 ${message} ${data ? JSON.stringify(data) : ''}\n`);
    }
    errorLogStream.write(log);
  },
};

module.exports = {
  accessLogger,
  consoleLogger,
  logError,
  logger,
};
