const pool = require('./database');
const logger = require('../utils/logger');

const initializeDatabase = async () => {
  logger.info('Checking database initialization...');
  
  try {
    // Check if users table exists
    const checkTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'parsed_resumes', 'job_descriptions', 'generated_resumes', 'token_usage');
    `;
    
    const result = await pool.query(checkTablesQuery);
    const existingTables = result.rows.map(row => row.table_name);
    
    const requiredTables = ['users', 'parsed_resumes', 'job_descriptions', 'generated_resumes', 'token_usage'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      logger.info('✅ All required database tables exist');
      return;
    }
    
    logger.info(`📋 Missing tables: ${missingTables.join(', ')}`);
    logger.info('🔧 Initializing database tables...');
    
    // Create extension if not exists
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    // Create users table
    if (missingTables.includes('users')) {
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await pool.query('CREATE INDEX idx_users_email ON users(email);');
      logger.info('✅ Created users table');
    }
    
    // Create update trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create trigger for users table
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // Create parsed_resumes table
    if (missingTables.includes('parsed_resumes')) {
      await pool.query(`
        CREATE TABLE parsed_resumes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          resume_file_name VARCHAR(255) NOT NULL,
          json_file_name VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_size BIGINT NOT NULL,
          is_base_resume BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await pool.query('CREATE INDEX idx_parsed_resumes_user_id ON parsed_resumes(user_id);');
      await pool.query('CREATE INDEX idx_parsed_resumes_base ON parsed_resumes(user_id, is_base_resume);');
      logger.info('✅ Created parsed_resumes table');
    }
    
    // Create job_descriptions table
    if (missingTables.includes('job_descriptions')) {
      await pool.query(`
        CREATE TABLE job_descriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          company VARCHAR(255),
          description TEXT NOT NULL,
          parsed_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await pool.query('CREATE INDEX idx_job_descriptions_user_id ON job_descriptions(user_id);');
      logger.info('✅ Created job_descriptions table');
    }
    
    // Create generated_resumes table
    if (missingTables.includes('generated_resumes')) {
      await pool.query(`
        CREATE TABLE generated_resumes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          base_resume_id INTEGER REFERENCES parsed_resumes(id),
          job_description_id INTEGER REFERENCES job_descriptions(id),
          generated_content JSONB NOT NULL,
          file_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await pool.query('CREATE INDEX idx_generated_resumes_user_id ON generated_resumes(user_id);');
      logger.info('✅ Created generated_resumes table');
    }
    
    // Create token_usage table
    if (missingTables.includes('token_usage')) {
      await pool.query(`
        CREATE TABLE token_usage (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          operation_type VARCHAR(100) NOT NULL,
          tokens_used INTEGER NOT NULL DEFAULT 0,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await pool.query('CREATE INDEX idx_token_usage_user_id ON token_usage(user_id);');
      await pool.query('CREATE INDEX idx_token_usage_operation ON token_usage(operation_type);');
      await pool.query('CREATE INDEX idx_token_usage_created_at ON token_usage(created_at);');
      logger.info('✅ Created token_usage table');
    }
    
    logger.info('🎉 Database initialization completed successfully');
    
  } catch (error) {
    logger.error('❌ Database initialization failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const checkDatabaseConnection = async () => {
  logger.info('🔌 Checking database connection...');
  
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    logger.info('✅ Database connection successful', {
      timestamp: result.rows[0].current_time
    });
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed', {
      error: error.message,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  checkDatabaseConnection
};