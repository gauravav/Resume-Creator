const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'resume_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Resetting database for new schema...');
    
    await client.query('BEGIN');
    
    // Drop and recreate parsed_resumes table with new schema
    console.log('🗑️  Dropping existing parsed_resumes table...');
    await client.query('DROP TABLE IF EXISTS parsed_resumes CASCADE');
    
    console.log('📋 Creating new parsed_resumes table...');
    await client.query(`
      CREATE TABLE parsed_resumes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        resume_file_name VARCHAR(255),
        json_file_name VARCHAR(255) NOT NULL,
        latex_file_name VARCHAR(255),
        pdf_file_name VARCHAR(255),
        pdf_status VARCHAR(20) DEFAULT 'pending' CHECK (pdf_status IN ('pending', 'generating', 'ready', 'failed')),
        pdf_generated_at TIMESTAMP,
        format_type VARCHAR(20) DEFAULT 'json' CHECK (format_type IN ('json', 'latex')),
        original_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        is_base_resume BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('📇 Creating indexes...');
    await client.query('CREATE INDEX idx_parsed_resumes_user_id ON parsed_resumes(user_id);');
    await client.query('CREATE INDEX idx_parsed_resumes_base ON parsed_resumes(user_id, is_base_resume);');
    
    // Create the update function if it doesn't exist
    console.log('⚙️  Creating update function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Update the trigger for updated_at
    console.log('⚙️  Adding update trigger...');
    await client.query(`
      CREATE TRIGGER update_parsed_resumes_updated_at BEFORE UPDATE ON parsed_resumes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await client.query('COMMIT');
    console.log('✅ Database reset completed successfully!');
    
    // Show table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'parsed_resumes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 New table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
    console.log('\n🎉 Ready for fresh uploads with JSON and LaTeX support!');
    console.log('💡 All uploaded resumes will now:');
    console.log('   - Store raw files in MinIO at: {userId}/resumes/{uuid}_{filename}');
    console.log('   - Store JSON data in MinIO at: {userId}/json/{uuid}_parsed.json');
    console.log('   - Store LaTeX files in MinIO at: {userId}/latex/{uuid}_resume.tex');
    console.log('   - Track format (json/latex) and metadata in PostgreSQL');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  resetDatabase().catch(console.error);
}

module.exports = resetDatabase;