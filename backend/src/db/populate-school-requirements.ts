import dotenv from 'dotenv';
dotenv.config();

import { pool, inTransaction } from './pool';

export async function populateSchoolRequirements() {
  console.log('🚀 Populating school_requirements table for all 137 schools using direct set-based INSERT...');

  await inTransaction(async (client) => {
    // Truncate existing school_requirements
    await client.query('TRUNCATE TABLE school_requirements CASCADE');

    // Perform direct SQL INSERT ... SELECT
    const result = await client.query(`
      INSERT INTO school_requirements (
        school_id, submitted_by, resource_name, category,
        quantity_requested, urgency, justification, status, created_at, updated_at
      )
      SELECT
        r.school_id,
        s.user_id AS submitted_by,
        res.name AS resource_name,
        rc.name AS category,
        GREATEST(1, g.gap_qty) AS quantity_requested,
        CASE
          WHEN ps.priority_class = 'CRITICAL' THEN 'CRITICAL'
          WHEN ps.priority_class = 'HIGH' THEN 'HIGH'
          WHEN ps.priority_class = 'LOW' THEN 'LOW'
          ELSE 'MEDIUM'
        END AS urgency,
        CASE
          WHEN ps.priority_class = 'CRITICAL' THEN 'Critical lab shortage required urgently for state board practical curriculum and safety compliance.'
          WHEN ps.priority_class = 'HIGH' THEN 'High priority requirement to accommodate secondary science batches and practical experiments.'
          WHEN ps.priority_class = 'MEDIUM' THEN 'Required to replace aging apparatus and ensure each student group has hands-on lab access.'
          ELSE 'Standard institutional requirement to upgrade science laboratory facilities.'
        END AS justification,
        CASE
          WHEN r.status = 'OPEN' THEN 'PENDING'
          WHEN r.status = 'ACCEPTED' THEN 'APPROVED'
          WHEN r.status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
          WHEN r.status = 'COMPLETED' THEN 'FULFILLED'
          ELSE 'PENDING'
        END AS status,
        r.created_at,
        r.created_at
      FROM requirements r
      JOIN schools s USING(school_id)
      JOIN resources res USING(resource_id)
      JOIN resource_categories rc USING(category_id)
      JOIN gap_records g USING(gap_id)
      JOIN priority_scores ps ON ps.score_id = r.score_id
      ORDER BY s.school_name, res.name;
    `);

    console.log(`✅ Successfully inserted ${result.rowCount} records into school_requirements!`);
  });

  const summary = await pool.query(`
    SELECT
      count(*) AS total_requirements,
      count(DISTINCT school_id) AS distinct_schools,
      round(count(*)::numeric / count(DISTINCT school_id), 1) AS avg_per_school
    FROM school_requirements;
  `);

  console.log('\n📊 Database Summary for school_requirements:');
  console.log(`  Total requirements: ${summary.rows[0].total_requirements}`);
  console.log(`  Covered schools:    ${summary.rows[0].distinct_schools} / 137`);
  console.log(`  Avg per school:     ${summary.rows[0].avg_per_school}`);
}

if (require.main === module) {
  populateSchoolRequirements()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error('Error populating school_requirements:', err);
      await pool.end();
      process.exit(1);
    });
}
