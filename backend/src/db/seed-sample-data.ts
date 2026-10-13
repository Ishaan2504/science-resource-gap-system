import bcrypt from 'bcryptjs';
import { pool } from './pool';

async function seedSampleData() {
  console.log('🌱 Starting sample data seeding...\n');

  try {
    // ============================================================================
    // 1. CREATE USERS WITH DIFFERENT ROLES
    // ============================================================================
    console.log('👥 Creating users...');
    
    const password = 'Test123456'; // Same password for all test users
    const passwordHash = await bcrypt.hash(password, 12);

    // Check if users exist first
    let ngoUserId, schoolUserId, coordinatorUserId;
    
    // NGO User
    const existingNgo = await pool.query('SELECT user_id FROM users WHERE email = $1', ['ngo@example.com']);
    if (existingNgo.rowCount) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, 'ngo@example.com']);
      ngoUserId = existingNgo.rows[0].user_id;
      console.log('  ✓ NGO User: ngo@example.com / Test123456 (updated)');
    } else {
      const ngoResult = await pool.query(
        `INSERT INTO users(email, password_hash, role, full_name, phone)
         VALUES($1, $2, $3, $4, $5)
         RETURNING user_id`,
        ['ngo@example.com', passwordHash, 'NGO', 'Science Foundation NGO Officer', '+919876543210']
      );
      ngoUserId = ngoResult.rows[0].user_id;
      console.log('  ✓ NGO User: ngo@example.com / Test123456');
    }

    // School Official User
    const existingSchool = await pool.query('SELECT user_id FROM users WHERE email = $1', ['school@example.com']);
    if (existingSchool.rowCount) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, 'school@example.com']);
      schoolUserId = existingSchool.rows[0].user_id;
      console.log('  ✓ School User: school@example.com / Test123456 (updated)');
    } else {
      const schoolUserResult = await pool.query(
        `INSERT INTO users(email, password_hash, role, full_name, phone)
         VALUES($1, $2, $3, $4, $5)
         RETURNING user_id`,
        ['school@example.com', passwordHash, 'SCHOOL', 'School Headmaster', '+919876543211']
      );
      schoolUserId = schoolUserResult.rows[0].user_id;
      console.log('  ✓ School User: school@example.com / Test123456');
    }

    // Field Coordinator User
    const existingCoordinator = await pool.query('SELECT user_id FROM users WHERE email = $1', ['coordinator@example.com']);
    if (existingCoordinator.rowCount) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, 'coordinator@example.com']);
      coordinatorUserId = existingCoordinator.rows[0].user_id;
      console.log('  ✓ Field Coordinator: coordinator@example.com / Test123456 (updated)');
    } else {
      const coordinatorResult = await pool.query(
        `INSERT INTO users(email, password_hash, role, full_name, phone)
         VALUES($1, $2, $3, $4, $5)
         RETURNING user_id`,
        ['coordinator@example.com', passwordHash, 'FIELD_COORDINATOR', 'District Field Coordinator', '+919876543212']
      );
      coordinatorUserId = coordinatorResult.rows[0].user_id;
      console.log('  ✓ Field Coordinator: coordinator@example.com / Test123456');
    }

    // ============================================================================
    // 2. CREATE NGO ORGANIZATION
    // ============================================================================
    console.log('\n🏢 Creating NGO organization...');
    const existingOrg = await pool.query('SELECT org_id FROM organizations WHERE user_id = $1', [ngoUserId]);
    if (existingOrg.rowCount) {
      await pool.query('UPDATE organizations SET verification_status = $1 WHERE user_id = $2', ['VERIFIED', ngoUserId]);
      console.log('  ✓ NGO Organization verified (updated)');
    } else {
      await pool.query(
        `INSERT INTO organizations(user_id, org_name, registration_number, focus_areas, service_districts, verification_status)
         VALUES($1, $2, $3, $4, $5, $6)`,
        [
          ngoUserId,
          'Science Education Foundation',
          'REG/2020/NGO/12345',
          ['Science Equipment', 'Laboratory Infrastructure', 'Teacher Training'],
          ['Bangalore Urban', 'Bangalore Rural', 'Mysore', 'Tumkur'],
          'VERIFIED'
        ]
      );
      console.log('  ✓ NGO Organization verified');
    }

    // ============================================================================
    // 3. CREATE SCHOOLS
    // ============================================================================
    console.log('\n🏫 Creating schools...');
    
    const schools = [
      {
        name: 'Government Higher Secondary School, Bangalore',
        udise: '29200401201',
        type: 'GOVERNMENT',
        district: 'Bangalore Urban',
        state: 'Karnataka',
        strength: 842,
        address: 'M.G. Road, Bangalore, Karnataka - 560001',
        user_id: schoolUserId // Linked to school user
      },
      {
        name: 'Government High School, Mysore',
        udise: '29210502304',
        type: 'GOVERNMENT',
        district: 'Mysore',
        state: 'Karnataka',
        strength: 615,
        address: 'Sayyaji Rao Road, Mysore, Karnataka - 570001',
        user_id: null // Will create user
      },
      {
        name: 'Government Composite School, Tumkur',
        udise: '29220603405',
        type: 'GOVERNMENT',
        district: 'Tumkur',
        state: 'Karnataka',
        strength: 731,
        address: 'B.H. Road, Tumkur, Karnataka - 572101',
        user_id: null // Will create user
      },
      {
        name: 'Aided High School, Hassan',
        udise: '29230704506',
        type: 'AIDED',
        district: 'Hassan',
        state: 'Karnataka',
        strength: 559,
        address: 'Church Road, Hassan, Karnataka - 573201',
        user_id: null // Will create user
      },
      {
        name: 'Government Girls High School, Mandya',
        udise: '29240805607',
        type: 'GOVERNMENT',
        district: 'Mandya',
        state: 'Karnataka',
        strength: 478,
        address: 'K.R. Circle, Mandya, Karnataka - 571401',
        user_id: null // Will create user
      }
    ];

    const schoolIds: string[] = [];
    for (const school of schools) {
      let userId = school.user_id;
      
      // Create a school user if not provided
      if (!userId) {
        const schoolEmail = `school.${school.district.toLowerCase().replace(/\s+/g, '')}@example.com`;
        const existingSchoolUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [schoolEmail]);
        
        if (existingSchoolUser.rowCount) {
          userId = existingSchoolUser.rows[0].user_id;
        } else {
          const result = await pool.query(
            `INSERT INTO users(email, password_hash, role, full_name, phone)
             VALUES($1, $2, $3, $4, $5)
             RETURNING user_id`,
            [schoolEmail, passwordHash, 'SCHOOL', `${school.name} Admin`, null]
          );
          userId = result.rows[0].user_id;
        }
      }
      
      // Check if school already exists for this user
      const existingSchool = await pool.query('SELECT school_id FROM schools WHERE user_id = $1', [userId]);
      if (existingSchool.rowCount) {
        schoolIds.push(existingSchool.rows[0].school_id);
        console.log(`  ✓ ${school.name} (already exists)`);
        continue;
      }
      
      const result = await pool.query(
        `INSERT INTO schools(user_id, school_name, udise_code, school_type, district, state, address, student_strength_total, verification_status)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING school_id`,
        [userId, school.name, school.udise, school.type, school.district, school.state, school.address, school.strength, 'VERIFIED']
      );
      schoolIds.push(result.rows[0].school_id);
      console.log(`  ✓ ${school.name}`);
    }

    // ============================================================================
    // 4. ASSIGN FIELD COORDINATOR TO SCHOOLS
    // ============================================================================
    console.log('\n📋 Assigning field coordinator to schools...');
    for (const schoolId of schoolIds.slice(0, 3)) { // First 3 schools
      const existing = await pool.query(
        'SELECT 1 FROM field_coordinator_schools WHERE coordinator_user_id = $1 AND school_id = $2',
        [coordinatorUserId, schoolId]
      );
      if (!existing.rowCount) {
        await pool.query(
          `INSERT INTO field_coordinator_schools(coordinator_user_id, school_id) VALUES($1, $2)`,
          [coordinatorUserId, schoolId]
        );
      }
    }
    console.log('  ✓ Field coordinator assigned to 3 schools');

    // ============================================================================
    // 5. GET RESOURCE CATEGORIES AND RESOURCES
    // ============================================================================
    console.log('\n📦 Getting resources from database...');
    const categoriesResult = await pool.query('SELECT category_id, name FROM resource_categories ORDER BY name');
    const categories = categoriesResult.rows;
    
    const resourcesMap: Record<string, Array<{resource_id: string, name: string}>> = {};
    for (const cat of categories) {
      const resourcesResult = await pool.query(
        'SELECT resource_id, name FROM resources WHERE category_id = $1',
        [cat.category_id]
      );
      resourcesMap[cat.name] = resourcesResult.rows;
    }
    console.log(`  ✓ Found ${categories.length} categories with resources`);

    // ============================================================================
    // 6. CREATE ASSESSMENTS FOR SCHOOLS
    // ============================================================================
    console.log('\n📊 Creating assessments...');
    
    const assessmentData = [
      {
        schoolIndex: 0,
        date: '2026-09-19',
        resources: [
          { category: 'Biology Equipment', resource: 'Student microscopes', required: 25, available: 12, functional: 7, condition: 'POOR', alternative: 'NONE' },
          { category: 'Biology Equipment', resource: 'Laboratory equipment sets', required: 15, available: 15, functional: 14, condition: 'GOOD', alternative: 'FULL' },
          { category: 'Physics Equipment', resource: 'Physics experiment kits', required: 20, available: 11, functional: 8, condition: 'FAIR', alternative: 'PARTIAL' },
        ]
      },
      {
        schoolIndex: 1,
        date: '2026-09-16',
        resources: [
          { category: 'Chemistry Equipment', resource: 'Chemistry glassware sets', required: 20, available: 12, functional: 8, condition: 'FAIR', alternative: 'NONE' },
          { category: 'Physics Equipment', resource: 'Physics experiment kits', required: 18, available: 9, functional: 7, condition: 'POOR', alternative: 'PARTIAL' },
        ]
      },
      {
        schoolIndex: 2,
        date: '2026-09-14',
        resources: [
          { category: 'Computers/Computer Lab', resource: 'Desktop computers', required: 30, available: 15, functional: 10, condition: 'POOR', alternative: 'NONE' },
          { category: 'Connectivity & EdTech', resource: 'Internet bandwidth upgrade', required: 1, available: 0, functional: 0, condition: 'NOT_APPLICABLE', alternative: 'NONE' },
        ]
      },
      {
        schoolIndex: 3,
        date: '2026-09-10',
        resources: [
          { category: 'Biology Equipment', resource: 'Student microscopes', required: 18, available: 8, functional: 5, condition: 'POOR', alternative: 'NONE' },
          { category: 'Science Laboratory', resource: 'Science lab safety kits', required: 10, available: 7, functional: 7, condition: 'GOOD', alternative: 'PARTIAL' },
        ]
      }
    ];

    for (const assessment of assessmentData) {
      const schoolId = schoolIds[assessment.schoolIndex];
      
      // Create assessment
      const assessmentResult = await pool.query(
        `INSERT INTO assessments(school_id, submitted_by, assessment_date, idempotency_key, version_number, status)
         VALUES($1, $2, $3, gen_random_uuid(), $4, $5)
         RETURNING assessment_id`,
        [schoolId, coordinatorUserId, assessment.date, 1, 'VERIFIED']
      );
      const assessmentId = assessmentResult.rows[0].assessment_id;

      // Add resources to assessment
      for (const res of assessment.resources) {
        const categoryResources = resourcesMap[res.category];
        if (!categoryResources) continue;
        
        const resource = categoryResources.find(r => r.name === res.resource);
        if (!resource) continue;

        // Insert school resource
        const schoolResourceResult = await pool.query(
          `INSERT INTO school_resources(assessment_id, resource_id, required_qty, available_qty, functional_qty, condition_rating, has_alternative)
           VALUES($1, $2, $3, $4, $5, $6, $7)
           RETURNING school_resource_id`,
          [assessmentId, resource.resource_id, res.required, res.available, res.functional, res.condition, res.alternative]
        );
        const schoolResourceId = schoolResourceResult.rows[0].school_resource_id;

        // Calculate gap
        const gapQty = Math.max(0, res.required - res.functional);
        const gapRatio = res.required > 0 ? gapQty / res.required : 0;

        // Insert gap record
        await pool.query(
          `INSERT INTO gap_records(school_resource_id, gap_qty, gap_ratio)
           VALUES($1, $2, $3)`,
          [schoolResourceId, gapQty, gapRatio]
        );
      }

      console.log(`  ✓ Assessment for ${schools[assessment.schoolIndex].name}`);
    }

    // ============================================================================
    // 7. TRIGGER PRIORITY SCORING AND REQUIREMENTS GENERATION
    // ============================================================================
    console.log('\n🎯 Generating priority scores and requirements...');
    console.log('  (This would normally be done by the scoring engine after verification)');
    console.log('  ⚠️  Note: Run the recompute script manually to generate requirements');

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Sample data seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📋 LOGIN CREDENTIALS:\n');
    console.log('  Admin:');
    console.log('    Email: admin@example.com');
    console.log('    Password: Test123456');
    console.log('    Role: ADMIN\n');
    console.log('  NGO User:');
    console.log('    Email: ngo@example.com');
    console.log('    Password: Test123456');
    console.log('    Role: NGO\n');
    console.log('  School User:');
    console.log('    Email: school@example.com');
    console.log('    Password: Test123456');
    console.log('    Role: SCHOOL');
    console.log('    (This account is linked to: Government Higher Secondary School, Bangalore)\n');
    console.log('  Field Coordinator:');
    console.log('    Email: coordinator@example.com');
    console.log('    Password: Test123456');
    console.log('    Role: FIELD_COORDINATOR\n');
    console.log('  Additional School Users (auto-generated):');
    console.log('    Email: school.mysore@example.com / Test123456');
    console.log('    Email: school.tumkur@example.com / Test123456');
    console.log('    Email: school.hassan@example.com / Test123456');
    console.log('    Email: school.mandya@example.com / Test123456\n');
    console.log('📊 DATA CREATED:\n');
    console.log(`  • ${schools.length} schools (all verified)`);
    console.log(`  • ${assessmentData.length} assessments (all verified)`);
    console.log(`  • 1 NGO organization (verified)`);
    console.log(`  • Field coordinator assigned to 3 schools\n`);
    console.log('🚀 You can now login with any of the above credentials!\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed
seedSampleData()
  .then(() => {
    console.log('✨ Seeding process completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
