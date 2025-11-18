const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');
const logger = require('../src/utils/logger');

class MigrationRunner {
  constructor() {
    this.migrationsDir = __dirname;
  }

  /**
   * Ensure migrations tracking table exists
   */
  async ensureMigrationsTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
      `);

      logger.info('✅ Migrations tracking table ready');
    } catch (error) {
      logger.error('Failed to create migrations table', { error: error.message });
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations() {
    try {
      const result = await pool.query('SELECT name FROM migrations ORDER BY name');
      return result.rows.map(row => row.name);
    } catch (error) {
      logger.error('Failed to get executed migrations', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark migration as executed
   */
  async markMigrationExecuted(migrationName) {
    try {
      await pool.query(
        'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [migrationName]
      );
      logger.info(`✅ Migration marked as executed: ${migrationName}`);
    } catch (error) {
      logger.error(`Failed to mark migration as executed: ${migrationName}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get all migration files sorted by name
   */
  getMigrationFiles() {
    try {
      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => {
          // Only include .js files that match migration naming pattern (YYYYMMDDHHMMSS_description.js)
          return file.endsWith('.js') &&
                 file !== 'migrationRunner.js' &&
                 /^\d{14}_.*\.js$/.test(file);
        })
        .sort(); // Sort to ensure migrations run in order

      return files;
    } catch (error) {
      logger.error('Failed to read migration files', { error: error.message });
      throw error;
    }
  }

  /**
   * Run a single migration
   */
  async runMigration(migrationFile) {
    const migrationName = path.basename(migrationFile, '.js');
    const migrationPath = path.join(this.migrationsDir, migrationFile);

    try {
      logger.info(`🔄 Running migration: ${migrationName}`);

      const migration = require(migrationPath);

      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${migrationName} does not export an 'up' function`);
      }

      // Run the migration
      await migration.up(pool);

      // Mark as executed
      await this.markMigrationExecuted(migrationName);

      logger.info(`✅ Migration completed: ${migrationName}`);
    } catch (error) {
      logger.error(`❌ Migration failed: ${migrationName}`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations() {
    try {
      logger.info('🔍 Checking for pending migrations...');

      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      logger.info(`Found ${executedMigrations.length} executed migrations`);

      // Get all migration files
      const migrationFiles = this.getMigrationFiles();
      logger.info(`Found ${migrationFiles.length} total migration files`);

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(file => {
        const migrationName = path.basename(file, '.js');
        return !executedMigrations.includes(migrationName);
      });

      if (pendingMigrations.length === 0) {
        logger.info('✅ No pending migrations');
        return { executed: 0, skipped: migrationFiles.length };
      }

      logger.info(`📋 Found ${pendingMigrations.length} pending migrations`);

      // Run pending migrations in order
      for (const migrationFile of pendingMigrations) {
        await this.runMigration(migrationFile);
      }

      logger.info(`🎉 Successfully executed ${pendingMigrations.length} migrations`);

      return {
        executed: pendingMigrations.length,
        skipped: executedMigrations.length
      };
    } catch (error) {
      logger.error('❌ Migration runner failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Rollback last migration (if down function exists)
   */
  async rollbackLastMigration() {
    try {
      logger.info('🔄 Rolling back last migration...');

      await this.ensureMigrationsTable();

      // Get last executed migration
      const result = await pool.query(
        'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const lastMigration = result.rows[0].name;
      const migrationFile = `${lastMigration}.js`;
      const migrationPath = path.join(this.migrationsDir, migrationFile);

      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationFile}`);
      }

      const migration = require(migrationPath);

      if (typeof migration.down !== 'function') {
        throw new Error(`Migration ${lastMigration} does not export a 'down' function`);
      }

      logger.info(`🔄 Rolling back: ${lastMigration}`);

      // Run the rollback
      await migration.down(pool);

      // Remove from migrations table
      await pool.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);

      logger.info(`✅ Rollback completed: ${lastMigration}`);
    } catch (error) {
      logger.error('❌ Rollback failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      await this.ensureMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = this.getMigrationFiles();

      const status = {
        total: migrationFiles.length,
        executed: executedMigrations.length,
        pending: migrationFiles.length - executedMigrations.length,
        migrations: migrationFiles.map(file => {
          const migrationName = path.basename(file, '.js');
          return {
            name: migrationName,
            executed: executedMigrations.includes(migrationName)
          };
        })
      };

      return status;
    } catch (error) {
      logger.error('Failed to get migration status', { error: error.message });
      throw error;
    }
  }
}

module.exports = new MigrationRunner();
