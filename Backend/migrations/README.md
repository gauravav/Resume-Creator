# Database Migrations

This directory contains database migration scripts that manage schema changes and data migrations for the application.

## Overview

Migrations are versioned database changes that allow you to:
- Track database schema evolution over time
- Safely apply changes across different environments
- Rollback changes if needed
- Collaborate on database changes with your team

## Migration System

### How It Works

1. **Automatic Execution**: Migrations run automatically when the server starts
2. **Tracking**: A `migrations` table tracks which migrations have been executed
3. **Idempotent**: Migrations check for existing changes before applying them
4. **Ordered**: Migrations run in chronological order based on timestamp

### Migration File Naming

Migration files follow this naming pattern:
```
YYYYMMDDHHMMSS_description.js
```

Example:
```
20250118000001_add_refresh_token_fields.js
```

The timestamp ensures migrations run in the correct order.

## NPM Scripts

### Run Pending Migrations
```bash
npm run migrate
```
Executes all pending migrations that haven't been run yet.

### Check Migration Status
```bash
npm run migrate:status
```
Shows which migrations have been executed and which are pending.

### Rollback Last Migration
```bash
npm run migrate:rollback
```
Rolls back the most recently executed migration (if it has a `down` function).

### Create New Migration
```bash
npm run migrate:create -- add_user_roles
```
Creates a new migration file with the given name.

## Migration File Structure

Each migration file exports two functions:

### `up(pool)` - Apply Changes
This function is called when the migration runs. It should:
- Apply database schema changes
- Insert/update data
- Be idempotent (safe to run multiple times)

### `down(pool)` - Rollback Changes
This function reverses the changes made by `up`. It should:
- Remove schema changes
- Delete inserted data
- Restore the database to its previous state

### Example Migration

```javascript
const logger = require('../src/utils/logger');

async function up(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Adding new column to users table...');

    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'new_column'
    `);

    if (checkColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN new_column VARCHAR(255)
      `);
      logger.info('✅ Added new_column');
    } else {
      logger.info('⏭️  new_column already exists');
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

async function down(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Removing new_column from users table...');

    await client.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS new_column
    `);

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
```

## Best Practices

### 1. Make Migrations Idempotent
Always check if changes already exist before applying them:

```javascript
// ✅ Good - Idempotent
const checkColumn = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'email'
`);

if (checkColumn.rows.length === 0) {
  await client.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255)`);
}

// ❌ Bad - Not idempotent
await client.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255)`);
```

### 2. Use Transactions
Wrap all changes in a transaction to ensure atomicity:

```javascript
await client.query('BEGIN');
try {
  // ... your changes
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
```

### 3. Test Rollbacks
Always implement and test the `down` function:

```javascript
// Test the migration
npm run migrate

// Test the rollback
npm run migrate:rollback

// Re-run the migration to verify
npm run migrate
```

### 4. Keep Migrations Small
Create focused migrations that do one thing well. This makes them:
- Easier to review
- Safer to rollback
- Simpler to debug

### 5. Never Modify Executed Migrations
Once a migration has been run in production:
- Never modify it
- Create a new migration instead
- This preserves the historical record

## Workflow

### Making a Database Change

1. **Create the migration**
   ```bash
   npm run migrate:create -- add_user_preferences
   ```

2. **Edit the migration file**
   - Implement the `up` function with your changes
   - Implement the `down` function to reverse them
   - Make it idempotent

3. **Test locally**
   ```bash
   # Check current status
   npm run migrate:status

   # Run the migration
   npm run migrate

   # Test rollback
   npm run migrate:rollback

   # Re-run to verify idempotency
   npm run migrate
   ```

4. **Commit the migration**
   ```bash
   git add migrations/20250118123456_add_user_preferences.js
   git commit -m "Add user preferences migration"
   ```

5. **Deploy**
   - Migrations run automatically when the server starts
   - Monitor logs to ensure successful execution

## Troubleshooting

### Migration Failed During Execution

1. Check the error logs
2. Fix the issue in the migration file
3. If the migration table was updated, rollback first:
   ```bash
   npm run migrate:rollback
   ```
4. Re-run the migration:
   ```bash
   npm run migrate
   ```

### Server Won't Start Due to Migration Error

1. Check the server logs for the specific error
2. You can manually skip the failed migration:
   ```sql
   DELETE FROM migrations WHERE name = 'YYYYMMDDHHMMSS_migration_name';
   ```
3. Fix the migration file
4. Restart the server

### Need to Skip a Migration

If you need to mark a migration as executed without running it:

```sql
INSERT INTO migrations (name) VALUES ('20250118000001_migration_name');
```

## Migration History

The `migrations` table tracks execution history:

```sql
-- View all executed migrations
SELECT * FROM migrations ORDER BY executed_at DESC;

-- Check if a specific migration ran
SELECT * FROM migrations WHERE name = '20250118000001_add_refresh_token_fields';
```

## Files in This Directory

- **`migrationRunner.js`** - Core migration engine
- **`scripts/`** - NPM script implementations
  - `migrate.js` - Run pending migrations
  - `status.js` - Check migration status
  - `rollback.js` - Rollback last migration
  - `create.js` - Create new migration
- **`YYYYMMDDHHMMSS_*.js`** - Migration files

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Migration Best Practices](https://www.prisma.io/dataguide/types/relational/migration-strategies)

---

**Note**: Always backup your database before running migrations in production!
