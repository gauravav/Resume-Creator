/**
 * Migration: Add refresh token fields to users table
 *
 * This migration adds support for refresh tokens to enable
 * automatic token refresh without requiring users to re-login.
 *
 * Changes:
 * - Adds refresh_token column (VARCHAR 512)
 * - Adds refresh_token_expires column (TIMESTAMP)
 * - Creates index on refresh_token for faster lookups
 */

const logger = require('../src/utils/logger');

/**
 * Run the migration
 */
async function up(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Adding refresh token fields to users table...');

    // Check if refresh_token column exists
    const checkRefreshTokenColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'refresh_token'
    `);

    if (checkRefreshTokenColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN refresh_token VARCHAR(512)
      `);
      logger.info('✅ Added refresh_token column');
    } else {
      logger.info('⏭️  refresh_token column already exists');
    }

    // Check if refresh_token_expires column exists
    const checkRefreshTokenExpiresColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'refresh_token_expires'
    `);

    if (checkRefreshTokenExpiresColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN refresh_token_expires TIMESTAMP
      `);
      logger.info('✅ Added refresh_token_expires column');
    } else {
      logger.info('⏭️  refresh_token_expires column already exists');
    }

    // Check if index exists
    const checkIndex = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'users' AND indexname = 'idx_users_refresh_token'
    `);

    if (checkIndex.rows.length === 0) {
      await client.query(`
        CREATE INDEX idx_users_refresh_token ON users(refresh_token)
      `);
      logger.info('✅ Created index on refresh_token column');
    } else {
      logger.info('⏭️  refresh_token index already exists');
    }

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

    logger.info('Rolling back refresh token fields from users table...');

    // Drop index
    await client.query(`
      DROP INDEX IF EXISTS idx_users_refresh_token
    `);
    logger.info('✅ Dropped refresh_token index');

    // Drop columns
    await client.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS refresh_token,
      DROP COLUMN IF EXISTS refresh_token_expires
    `);
    logger.info('✅ Dropped refresh_token columns');

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
