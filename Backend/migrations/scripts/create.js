#!/usr/bin/env node

/**
 * Create a new migration file
 *
 * Usage:
 *   npm run migrate:create -- add_user_roles
 *   node migrations/scripts/create.js add_user_roles
 */

const fs = require('fs');
const path = require('path');

function createMigration() {
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error('❌ Error: Migration name is required');
    console.log('\nUsage:');
    console.log('  npm run migrate:create -- <migration_name>');
    console.log('\nExample:');
    console.log('  npm run migrate:create -- add_user_roles');
    process.exit(1);
  }

  // Generate timestamp (YYYYMMDDHHMMSS)
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
                   (now.getMonth() + 1).toString().padStart(2, '0') +
                   now.getDate().toString().padStart(2, '0') +
                   now.getHours().toString().padStart(2, '0') +
                   now.getMinutes().toString().padStart(2, '0') +
                   now.getSeconds().toString().padStart(2, '0');

  // Create filename
  const filename = `${timestamp}_${migrationName}.js`;
  const filepath = path.join(__dirname, '..', filename);

  // Migration template
  const template = `/**
 * Migration: ${migrationName.replace(/_/g, ' ')}
 *
 * Description:
 * [Add a description of what this migration does]
 *
 * Changes:
 * - [List the changes this migration makes]
 */

const logger = require('../src/utils/logger');

/**
 * Run the migration
 */
async function up(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Running migration: ${migrationName}');

    // Add your migration code here
    // Example:
    // await client.query(\`
    //   ALTER TABLE users
    //   ADD COLUMN new_column VARCHAR(255)
    // \`);

    await client.query('COMMIT');
    logger.info('✅ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed, rolling back', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Rollback the migration
 */
async function down(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Rolling back migration: ${migrationName}');

    // Add your rollback code here
    // Example:
    // await client.query(\`
    //   ALTER TABLE users
    //   DROP COLUMN IF EXISTS new_column
    // \`);

    await client.query('COMMIT');
    logger.info('✅ Rollback completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Rollback failed', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };
`;

  // Write the file
  fs.writeFileSync(filepath, template);

  console.log('✅ Migration created successfully!');
  console.log(`📄 File: ${filename}`);
  console.log(`📁 Path: ${filepath}`);
  console.log('\nNext steps:');
  console.log('1. Edit the migration file to add your changes');
  console.log('2. Run the migration with: npm run migrate');
}

createMigration();
