#!/usr/bin/env node

/**
 * Run all pending database migrations
 *
 * Usage:
 *   npm run migrate
 *   node migrations/scripts/migrate.js
 */

require('dotenv').config();
const migrationRunner = require('../migrationRunner');
const logger = require('../../src/utils/logger');
const pool = require('../../src/config/database');

async function runMigrations() {
  try {
    logger.info('🚀 Starting database migrations...');

    const result = await migrationRunner.runPendingMigrations();

    logger.info('📊 Migration Summary:', {
      executed: result.executed,
      skipped: result.skipped,
      total: result.executed + result.skipped
    });

    if (result.executed > 0) {
      logger.info(`✅ Successfully executed ${result.executed} migration(s)`);
    } else {
      logger.info('✅ Database is up to date - no migrations to run');
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
