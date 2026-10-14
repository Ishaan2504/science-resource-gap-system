import { Pool } from 'pg';
import { env } from '../config/env';

const isRemote = env.databaseUrl.includes('supabase') || !env.databaseUrl.includes('localhost');
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export async function inTransaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
