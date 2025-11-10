# Database Migrations Guide

This project uses TypeORM migrations to manage database schema changes.

## Setup

Migrations are configured in `src/config/typeorm.config.ts` and run automatically in production.

## Commands

### Generate a new migration

```bash
npm run migration:generate -- src/migrations/YourMigrationName
```

This will compare your entities with the current database schema and generate a migration file.

### Create an empty migration

```bash
npm run migration:create -- src/migrations/YourMigrationName
```

Use this when you need to write custom SQL or make manual changes.

### Run pending migrations

```bash
npm run migration:run
```

This will execute all pending migrations in order.

### Revert the last migration

```bash
npm run migration:revert
```

This will undo the last migration that was run.

## Initial Setup

1. **Generate initial migration from entities:**
   ```bash
   npm run migration:generate -- src/migrations/InitialSchema
   ```

2. **Review the generated migration** in `migrations/` directory

3. **Run the migration:**
   ```bash
   npm run migration:run
   ```

## Workflow

### Development

1. Make changes to your entities
2. Generate migration: `npm run migration:generate -- src/migrations/YourChangeName`
3. Review and test the migration locally
4. Run migration: `npm run migration:run`

### Production

Migrations run automatically on app startup when `NODE_ENV=production`.

To run manually:
```bash
NODE_ENV=production npm run migration:run
```

## Migration Files

Migrations are stored in the `migrations/` directory and follow this naming pattern:
- `TIMESTAMP-YourMigrationName.ts`

Example: `1234567890123-InitialSchema.ts`

## Important Notes

- **Never edit existing migrations** - create new ones instead
- **Always test migrations** on a copy of production data first
- **Backup your database** before running migrations in production
- **Review generated migrations** before running them
- Migrations run in order based on their timestamp

## Troubleshooting

### Migration fails with "relation already exists"

This usually means the migration was partially run. Check the `migrations` table:
```sql
SELECT * FROM migrations;
```

If the migration is listed but failed, you may need to manually fix the database state or revert and re-run.

### Need to reset everything

⚠️ **WARNING: This will delete all data!**

```bash
# Drop all tables (be careful!)
npm run migration:revert  # Repeat until all migrations are reverted

# Or manually drop tables and start fresh
npm run migration:run
```

