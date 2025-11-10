# Database Migrations

## Current Status

You have one pending migration: `InitialSchema1762647065336`

## Quick Start

Since you already have tables created via `synchronize`, you have two options:

### Option 1: Mark migration as run (if schema matches)

If your current database schema matches the migration, you can mark it as already executed:

```bash
# Connect to your database and manually insert the migration record
# Or use TypeORM CLI to mark it as executed
npm run typeorm migration:show -d src/config/typeorm.config.ts
```

Then manually insert into the `migrations` table:
```sql
INSERT INTO migrations (timestamp, name) VALUES (1762647065336, 'InitialSchema1762647065336');
```

### Option 2: Fresh start (recommended for clean setup)

Drop existing tables and run migrations fresh:

```bash
# 1. Drop all existing tables (⚠️ WARNING: This deletes all data!)
# Connect to your database and run:
# DROP SCHEMA public CASCADE;
# CREATE SCHEMA public;
# GRANT ALL ON SCHEMA public TO postgres;
# GRANT ALL ON SCHEMA public TO public;

# 2. Run the migration
npm run migration:run
```

## Running Migrations

```bash
# Show pending migrations
npm run migration:show

# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Creating New Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- migrations/YourMigrationName

# Create empty migration for custom SQL
npm run migration:create -- migrations/YourMigrationName
```

## Production

Migrations run automatically on app startup when `NODE_ENV=production`.

To run manually in production:
```bash
NODE_ENV=production npm run migration:run
```

