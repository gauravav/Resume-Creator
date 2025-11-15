const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'resume_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runTutorialMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting tutorial tracking migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '003_add_tutorial_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('🎉 Tutorial tracking migration completed successfully!');

    // Show updated table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('tutorial_completed', 'tutorial_completed_at', 'tutorial_skipped')
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Tutorial tracking columns added:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runTutorialMigration().catch(console.error);
}

module.exports = runTutorialMigration;
