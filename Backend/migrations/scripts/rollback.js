#!/usr/bin/env node

/**
 * Rollback the last executed migration
 *
 * Usage:
 *   npm run migrate:rollback
 *   node migrations/scripts/rollback.js
 */

require('dotenv').config();
const migrationRunner = require('../migrationRunner');
const logger = require('../../src/utils/logger');
const pool = require('../../src/config/database');

async function rollback() {
  try {
    logger.info('🔄 Rolling back last migration...');

    await migrationRunner.rollbackLastMigration();

    logger.info('✅ Rollback completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Rollback failed:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

rollback();
