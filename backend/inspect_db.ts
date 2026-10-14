import { pool } from './src/db/pool';

async function main() {
  const users = await pool.query(
    'SELECT user_id, email, role, full_name, created_at FROM users WHERE email = $1',
    ['school@scienceonwheels.in']
  );
  console.log('\n======================================================');
  console.log('1. AUTHENTICATED USER IN SUPABASE');
  console.log('======================================================');
  console.table(users.rows);

  const school = await pool.query(
    'SELECT school_id, school_name, udise_code, district, state FROM schools WHERE user_id = $1',
    [users.rows[0].user_id]
  );
  console.log('\n======================================================');
  console.log('2. LINKED SCHOOL RECORD (GOVERNMENT HIGHER SECONDARY SCHOOL)');
  console.log('======================================================');
  console.table(school.rows);

  const tokens = await pool.query(
    'SELECT token_id, user_id, expires_at, created_at FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3',
    [users.rows[0].user_id]
  );
  console.log('\n======================================================');
  console.log('3. ACTIVE AUTH SESSIONS GENERATED ON YOUR MOBILE PHONE');
  console.log('======================================================');
  console.table(tokens.rows);

  const reqs = await pool.query(`
    SELECT 
      r.requirement_id, 
      res.name as resource_name, 
      r.accepted_gap_qty as gap_quantity, 
      r.fulfilled_qty,
      ps.final_score as priority_score, 
      ps.priority_class as priority_category, 
      r.status
    FROM requirements r
    JOIN resources res ON res.resource_id = r.resource_id
    JOIN priority_scores ps ON ps.score_id = r.score_id
    WHERE r.school_id = $1
    ORDER BY ps.final_score DESC
    LIMIT 6
  `, [school.rows[0].school_id]);
  console.log('\n======================================================');
  console.log('4. LIVE RESOURCE GAPS & REQUIREMENTS IN SUPABASE');
  console.log('========================================');
  console.table(reqs.rows);

  await pool.end();
}

main().catch(console.error);
