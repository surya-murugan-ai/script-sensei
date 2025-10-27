import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for migrations');
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Only need one connection for migrations
});

const db = drizzle({ client: pool });

async function runMigrations() {
  console.log('🗄️  Running database migrations...');
  
  try {
    // Check if tables already exist
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'prescriptions'
      );
    `);
    
    const tablesExist = result.rows[0]?.exists;
    
    if (tablesExist) {
      console.log('📋 Tables already exist, running migrations...');
    } else {
      console.log('🆕 Fresh database, creating tables...');
    }
    
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

