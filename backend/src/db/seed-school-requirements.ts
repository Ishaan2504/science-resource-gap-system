import dotenv from 'dotenv';
dotenv.config();

import { pool, inTransaction } from './pool';
import { calculatePriority, WeightConfig } from '../domain/priority-engine';

interface ResourceTemplate {
  name: string;
  category: string;
  unit: string;
}

const RESOURCE_TEMPLATES: ResourceTemplate[] = [
  // Science Laboratory
  { name: 'Science lab safety kits', category: 'Science Laboratory', unit: 'kits' },
  { name: 'First aid & chemical eyewash station', category: 'Science Laboratory', unit: 'units' },
  { name: 'Lab workstation benches & sinks', category: 'Science Laboratory', unit: 'workstations' },
  // Physics Equipment
  { name: 'Physics experiment kits', category: 'Physics Equipment', unit: 'kits' },
  { name: 'Optics & laser bench set', category: 'Physics Equipment', unit: 'sets' },
  { name: 'Electrical circuit training board', category: 'Physics Equipment', unit: 'boards' },
  // Chemistry Equipment
  { name: 'Chemistry glassware sets', category: 'Chemistry Equipment', unit: 'sets' },
  { name: 'Chemical reagents & storage cabinet', category: 'Chemistry Equipment', unit: 'cabinets' },
  { name: 'Analytical balance & burettes', category: 'Chemistry Equipment', unit: 'units' },
  // Biology Equipment
  { name: 'Student microscopes', category: 'Biology Equipment', unit: 'microscopes' },
  { name: 'Compound digital microscopes', category: 'Biology Equipment', unit: 'microscopes' },
  { name: 'Human anatomy & specimen models', category: 'Biology Equipment', unit: 'models' },
  // Computers/Computer Lab
  { name: 'Desktop computers', category: 'Computers/Computer Lab', unit: 'computers' },
  { name: 'Interactive smart panel / projector', category: 'Computers/Computer Lab', unit: 'units' },
  { name: 'Lab computer workstations', category: 'Computers/Computer Lab', unit: 'workstations' },
  // Connectivity & EdTech
  { name: 'Internet bandwidth upgrade', category: 'Connectivity & EdTech', unit: 'connections' },
  { name: 'Digital STEM simulation software', category: 'Connectivity & EdTech', unit: 'licenses' },
  { name: 'Local LAN & Wi-Fi router', category: 'Connectivity & EdTech', unit: 'units' },
];

export async function seedSchoolRequirements() {
  console.log('🚀 Seeding placeholder requirements for all schools...\n');

  try {
    // 1. Get or ensure admin user
    const adminRes = await pool.query("SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (!adminRes.rowCount) {
      throw new Error('Admin user not found. Please run seed-admin or create-admin first.');
    }
    const adminUserId = adminRes.rows[0].user_id;

    // 2. Get active weight configuration
    const configRes = await pool.query('SELECT * FROM weight_configs WHERE is_active = true LIMIT 1');
    if (!configRes.rowCount) {
      throw new Error('No active weight configuration found.');
    }
    const config = configRes.rows[0] as WeightConfig;

    // 3. Ensure all resource categories exist
    const categoriesRes = await pool.query('SELECT category_id, name, importance_weight FROM resource_categories');
    const categoryMap = new Map<string, { id: string; importance: number }>();
    for (const c of categoriesRes.rows) {
      categoryMap.set(c.name, { id: c.category_id, importance: Number(c.importance_weight) });
    }

    // 4. Ensure standard resources exist in DB
    console.log('📦 Ensuring master resources are registered...');
    const resourceMap = new Map<string, { id: string; categoryId: string; importance: number }>();

    for (const t of RESOURCE_TEMPLATES) {
      const cat = categoryMap.get(t.category);
      if (!cat) continue;

      const existing = await pool.query(
        'SELECT resource_id FROM resources WHERE category_id = $1 AND name = $2',
        [cat.id, t.name]
      );

      let resId: string;
      if (existing.rowCount) {
        resId = existing.rows[0].resource_id;
      } else {
        const ins = await pool.query(
          'INSERT INTO resources(category_id, name, unit_of_measure, is_active) VALUES($1, $2, $3, true) RETURNING resource_id',
          [cat.id, t.name, t.unit]
        );
        resId = ins.rows[0].resource_id;
      }
      resourceMap.set(t.name, { id: resId, categoryId: cat.id, importance: cat.importance });
    }
    console.log(`  ✓ ${resourceMap.size} resources ready.`);

    // 5. Fetch all schools
    const schoolsRes = await pool.query('SELECT school_id, school_name, district, student_strength_total FROM schools ORDER BY school_name');
    const schools = schoolsRes.rows;
    console.log(`\n🏫 Found ${schools.length} schools in database.`);

    let totalCreatedReqs = 0;
    const resourceList = Array.from(resourceMap.entries());

    // 6. Process each school
    for (let i = 0; i < schools.length; i++) {
      const s = schools[i];

      // Check if school already has active requirements
      const existingReqs = await pool.query('SELECT count(*) FROM requirements WHERE school_id = $1', [s.school_id]);
      if (Number(existingReqs.rows[0].count) > 0) {
        continue;
      }

      await inTransaction(async (c) => {
        // Ensure school has a verified assessment
        let assessmentId: string;
        const existingAsm = await c.query(
          "SELECT assessment_id FROM assessments WHERE school_id = $1 AND status = 'VERIFIED' ORDER BY verified_at DESC LIMIT 1",
          [s.school_id]
        );

        if (existingAsm.rowCount) {
          assessmentId = existingAsm.rows[0].assessment_id;
          // Ensure verified_at is not null
          await c.query(
            "UPDATE assessments SET verified_at = coalesce(verified_at, now() - interval '5 days'), verified_by = coalesce(verified_by, $2) WHERE assessment_id = $1",
            [assessmentId, adminUserId]
          );
        } else {
          const daysAgo = 3 + (i % 25);
          const asm = await c.query(
            `INSERT INTO assessments(school_id, submitted_by, assessment_date, idempotency_key, version_number, status, verified_by, verified_at)
             VALUES($1, $2, current_date - ($3 || ' days')::interval, gen_random_uuid(), 1, 'VERIFIED', $2, now() - ($3 || ' days')::interval)
             RETURNING assessment_id`,
            [s.school_id, adminUserId, daysAgo]
          );
          assessmentId = asm.rows[0].assessment_id;
        }

        // Pick 3 to 4 resources deterministically for this school
        const chosenIndices = [
          (i * 3) % resourceList.length,
          (i * 3 + 4) % resourceList.length,
          (i * 3 + 8) % resourceList.length,
          (i * 3 + 12) % resourceList.length,
        ];
        const uniqueIndices = [...new Set(chosenIndices)].slice(0, 3 + (i % 2));

        const statuses = ['OPEN', 'OPEN', 'UNDER_REVIEW', 'ACCEPTED', 'IN_PROGRESS'];
        const conditions: ('POOR' | 'FAIR' | 'GOOD')[] = ['POOR', 'FAIR', 'POOR'];
        const alternatives: ('NONE' | 'PARTIAL')[] = ['NONE', 'PARTIAL', 'NONE'];

        for (let j = 0; j < uniqueIndices.length; j++) {
          const [resName, resInfo] = resourceList[uniqueIndices[j]];

          const required = 15 + ((i * 7 + j * 5) % 25); // 15 - 39
          const available = 5 + ((i * 3 + j * 2) % 10);  // 5 - 14
          const functional = Math.min(available, 2 + ((i + j) % 6)); // 2 - 7
          const gapQty = Math.max(1, required - functional);
          const gapRatio = gapQty / required;
          const condition = conditions[j % conditions.length];
          const alternative = alternatives[j % alternatives.length];
          const status = statuses[(i + j) % statuses.length];
          const studentsAffected = Math.max(100, Math.min(Number(s.student_strength_total), 300 + (j * 120)));

          // Check if school_resource already exists
          const existingSr = await c.query(
            'SELECT school_resource_id FROM school_resources WHERE assessment_id = $1 AND resource_id = $2',
            [assessmentId, resInfo.id]
          );

          let srId: string;
          if (existingSr.rowCount) {
            srId = existingSr.rows[0].school_resource_id;
          } else {
            const srRes = await c.query(
              `INSERT INTO school_resources(assessment_id, resource_id, required_qty, available_qty, functional_qty, condition_rating, has_alternative, students_affected, notes)
               VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING school_resource_id`,
              [assessmentId, resInfo.id, required, available, functional, condition, alternative, studentsAffected, `Initial assessment gap for ${resName}`]
            );
            srId = srRes.rows[0].school_resource_id;
          }

          // Insert or update gap_record
          const gapRes = await c.query(
            `INSERT INTO gap_records(school_resource_id, gap_qty, gap_ratio, computed_at)
             VALUES($1, $2, $3, now())
             ON CONFLICT(school_resource_id) DO UPDATE SET gap_qty = excluded.gap_qty, gap_ratio = excluded.gap_ratio, computed_at = now()
             RETURNING gap_id`,
            [srId, gapQty, gapRatio]
          );
          const gapId = gapRes.rows[0].gap_id;

          // Calculate priority score
          const score = calculatePriority({
            gapRatio,
            importance: resInfo.importance,
            studentsAffected,
            maxStudentsAffected: 1000,
            alternative,
            condition,
            config,
          });

          // Insert priority_score
          const scoreRes = await c.query(
            `INSERT INTO priority_scores(school_resource_id, weight_config_id, severity_score, importance_score, students_score, alternative_score, condition_score, final_score, priority_class, computed_at)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
             RETURNING score_id`,
            [srId, config.config_id, score.severity, score.importance, score.students, score.alternative, score.condition, score.finalScore, score.priorityClass]
          );
          const scoreId = scoreRes.rows[0].score_id;

          // Insert requirement
          const reqRes = await c.query(
            `INSERT INTO requirements(school_id, resource_id, gap_id, score_id, status, accepted_gap_qty, created_at)
             VALUES($1, $2, $3, $4, $5, $6, now() - ($7 || ' days')::interval)
             RETURNING requirement_id`,
            [s.school_id, resInfo.id, gapId, scoreId, status, gapQty, 2 + (j * 3)]
          );
          const reqId = reqRes.rows[0].requirement_id;

          // Status event
          await c.query(
            "INSERT INTO requirement_status_events(requirement_id, old_status, new_status, actor_id) VALUES($1, NULL, $2, $3)",
            [reqId, status, adminUserId]
          );

          totalCreatedReqs++;
        }
      });

      if ((i + 1) % 20 === 0 || i === schools.length - 1) {
        console.log(`  Processed ${i + 1}/${schools.length} schools...`);
      }
    }

    console.log(`\n✅ Done! Successfully seeded ${totalCreatedReqs} placeholder requirements across all schools.`);
  } catch (err) {
    console.error('❌ Error seeding school requirements:', err);
    throw err;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('seed-school-requirements.ts')) {
  seedSchoolRequirements()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await pool.end();
      process.exit(1);
    });
}
