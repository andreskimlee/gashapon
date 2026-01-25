/**
 * Clear Production Database Tables
 * 
 * Usage: npx ts-node scripts/clear-production-db.ts
 * 
 * WARNING: This will delete ALL game data from production!
 * Only use for testing purposes.
 */

import { Client } from 'pg';

// Production database URL (Supabase pooler)
// Password with special chars needs URL encoding: # -> %23
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres.bwrgtkliojxdrfyoexsy:FAR7ybi9JLRHEe%23o@aws-1-us-east-2.pooler.supabase.com:5432/postgres';

async function clearTables() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database');

    // Confirm before proceeding
    console.log('\n⚠️  WARNING: This will delete ALL data from:');
    console.log('   - nft_ownerships');
    console.log('   - redemptions');
    console.log('   - nfts');
    console.log('   - plays');
    console.log('   - prizes');
    console.log('   - games');
    console.log('\nProceeding in 3 seconds... (Ctrl+C to cancel)\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete in correct order due to foreign keys
    console.log('Deleting nft_ownerships...');
    const r1 = await client.query('DELETE FROM nft_ownerships');
    console.log(`  Deleted ${r1.rowCount} rows`);

    console.log('Deleting redemptions...');
    const r2 = await client.query('DELETE FROM redemptions');
    console.log(`  Deleted ${r2.rowCount} rows`);

    console.log('Deleting nfts...');
    const r3 = await client.query('DELETE FROM nfts');
    console.log(`  Deleted ${r3.rowCount} rows`);

    console.log('Deleting plays...');
    const r4 = await client.query('DELETE FROM plays');
    console.log(`  Deleted ${r4.rowCount} rows`);

    console.log('Deleting prizes...');
    const r5 = await client.query('DELETE FROM prizes');
    console.log(`  Deleted ${r5.rowCount} rows`);

    console.log('Deleting games...');
    const r6 = await client.query('DELETE FROM games');
    console.log(`  Deleted ${r6.rowCount} rows`);

    console.log('\n✅ All tables cleared successfully!');

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clearTables();
