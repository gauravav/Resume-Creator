#!/usr/bin/env node

/**
 * Check migration status
 *
 * Usage:
 *   npm run migrate:status
 *   node migrations/scripts/status.js
 */

require('dotenv').config();
const migrationRunner = require('../migrationRunner');
const logger = require('../../src/utils/logger');
const pool = require('../../src/config/database');

async function checkStatus() {
  try {
    logger.info('📋 Checking migration status...\n');

    const status = await migrationRunner.getStatus();

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              DATABASE MIGRATION STATUS                 ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Total migrations:    ${status.total.toString().padEnd(32)}║`);
    console.log(`║ Executed:            ${status.executed.toString().padEnd(32)}║`);
    console.log(`║ Pending:             ${status.pending.toString().padEnd(32)}║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    if (status.migrations.length > 0) {
      console.log('Migrations:');
      console.log('─'.repeat(80));

      status.migrations.forEach(migration => {
        const statusIcon = migration.executed ? '✅' : '⏸️ ';
        const statusText = migration.executed ? 'Executed' : 'Pending ';
        console.log(`${statusIcon} ${statusText} | ${migration.name}`);
      });

      console.log('─'.repeat(80) + '\n');
    }

    if (status.pending > 0) {
      logger.info(`Run 'npm run migrate' to execute ${status.pending} pending migration(s)`);
    } else {
      logger.info('✅ Database is up to date');
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to get migration status:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkStatus();
