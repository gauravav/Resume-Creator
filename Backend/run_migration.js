const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'resume_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...');
    
    // Check if columns already exist
    const checkColumns = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'parsed_resumes' 
      AND column_name IN ('json_file_name', 'original_name', 'file_size');
    `;
    
    const existingColumns = await client.query(checkColumns);
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);
    
    if (existingColumnNames.length === 3) {
      console.log('✅ Migration already applied. All columns exist.');
      return;
    }
    
    await client.query('BEGIN');
    
    // Add new columns
    if (!existingColumnNames.includes('json_file_name')) {
      await client.query('ALTER TABLE parsed_resumes ADD COLUMN json_file_name VARCHAR(255)');
      console.log('✅ Added json_file_name column');
    }
    
    if (!existingColumnNames.includes('original_name')) {
      await client.query('ALTER TABLE parsed_resumes ADD COLUMN original_name VARCHAR(255)');
      console.log('✅ Added original_name column');
    }
    
    if (!existingColumnNames.includes('file_size')) {
      await client.query('ALTER TABLE parsed_resumes ADD COLUMN file_size BIGINT');
      console.log('✅ Added file_size column');
    }
    
    // Update existing records with placeholder values
    const updateQuery = `
      UPDATE parsed_resumes 
      SET 
        json_file_name = CASE 
          WHEN json_file_name IS NULL THEN CONCAT(user_id, '/json/', SUBSTRING(resume_file_name FROM '[^/]+$'), '_parsed.json')
          ELSE json_file_name 
        END,
        original_name = CASE 
          WHEN original_name IS NULL THEN SUBSTRING(resume_file_name FROM '[^/]+$')
          ELSE original_name 
        END,
        file_size = CASE 
          WHEN file_size IS NULL THEN 0
          ELSE file_size 
        END
      WHERE json_file_name IS NULL OR original_name IS NULL OR file_size IS NULL;
    `;
    
    const result = await client.query(updateQuery);
    console.log(`✅ Updated ${result.rowCount} existing records with placeholder values`);
    
    // Make the columns NOT NULL after updating
    if (!existingColumnNames.includes('json_file_name')) {
      await client.query('ALTER TABLE parsed_resumes ALTER COLUMN json_file_name SET NOT NULL');
      console.log('✅ Set json_file_name as NOT NULL');
    }
    
    if (!existingColumnNames.includes('original_name')) {
      await client.query('ALTER TABLE parsed_resumes ALTER COLUMN original_name SET NOT NULL');
      console.log('✅ Set original_name as NOT NULL');
    }
    
    if (!existingColumnNames.includes('file_size')) {
      await client.query('ALTER TABLE parsed_resumes ALTER COLUMN file_size SET NOT NULL');
      console.log('✅ Set file_size as NOT NULL');
    }
    
    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully!');
    
    // Show updated table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'parsed_resumes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Updated table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = runMigration;