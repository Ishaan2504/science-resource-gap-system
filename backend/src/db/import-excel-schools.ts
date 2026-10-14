import path from 'path';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';
import { pool } from './pool';

const districtCodes: Record<string, string> = {
  Buldhana: '2704',
  Akola: '2705',
  Washim: '2706',
  Amravati: '2707',
  Wardha: '2708',
  Nagpur: '2709',
  Bhandara: '2710',
  Gondia: '2711',
  Gadchiroli: '2712',
  Chandrapur: '2713',
  Yavatmal: '2714',
};

export async function importExcelSchools() {
  console.log('🚀 Starting import of schools from Excel to Supabase...\n');

  const excelPath = path.resolve(process.cwd(), '../SoW_Scheduled_Complete.xlsx');
  const wb = xlsx.readFile(excelPath);
  const ws = wb.Sheets['Sheet1'];
  const rows = xlsx.utils.sheet_to_json<Array<unknown>>(ws, { header: 1 });

  let currentDistrict = '';
  const parsedSchools: Array<{
    name: string;
    district: string;
    type: 'GOVERNMENT' | 'AIDED' | 'PRIVATE';
    udise: string;
    strength: number;
    address: string;
  }> = [];

  let idCounter = 1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    if (row.length === 1 && typeof row[0] === 'string' && !row[0].includes('/')) {
      currentDistrict = row[0].trim();
      continue;
    }

    if (row[0] === 'Date' || row[1] === 'School /College name') {
      continue;
    }

    const nameVal = row[1];
    const distVal = row[2] || currentDistrict;

    if (nameVal && typeof nameVal === 'string' && nameVal.trim().length > 0) {
      const rawName = nameVal.trim().replace(/\s+/g, ' ');
      const district = String(distVal || currentDistrict || 'Wardha').trim();
      const distCode = districtCodes[district] || '2799';
      const numPart = String(idCounter).padStart(5, '0');
      const udise = distCode + '01' + numPart;

      let schoolType: 'GOVERNMENT' | 'AIDED' | 'PRIVATE' = 'GOVERNMENT';
      const lower = rawName.toLowerCase();
      if (lower.includes('public school') || lower.includes('convent') || lower.includes('english medium')) {
        schoolType = 'PRIVATE';
      } else if (
        lower.includes('college') ||
        lower.includes('aided') ||
        lower.includes('vidyalay') ||
        lower.includes('shikshan') ||
        lower.includes('mandal')
      ) {
        schoolType = 'AIDED';
      }

      const strength = 320 + ((idCounter * 37) % 580);

      parsedSchools.push({
        name: rawName,
        district,
        type: schoolType,
        udise,
        strength,
        address: `${rawName}, ${district}, Maharashtra`,
      });
      idCounter++;
    }
  }

  console.log(`📊 Found ${parsedSchools.length} schools in Excel.\n`);

  const passwordHash = await bcrypt.hash('Test123456', 12);
  let insertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < parsedSchools.length; i++) {
    const s = parsedSchools[i];

    // Check if school already exists by name or UDISE
    const existing = await pool.query(
      'SELECT school_id FROM schools WHERE LOWER(school_name) = LOWER($1) OR udise_code = $2',
      [s.name, s.udise]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      skippedCount++;
      continue;
    }

    // Create school official user
    const emailNum = String(i + 1).padStart(3, '0');
    const safeDist = s.district.toLowerCase().replace(/[^a-z0-9]/g, '');
    const userEmail = `school.${safeDist}${emailNum}@example.com`;

    let userId: string;
    const existingUser = await pool.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [userEmail]);

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      userId = existingUser.rows[0].user_id;
    } else {
      const userRes = await pool.query(
        `INSERT INTO users(email, password_hash, role, full_name, phone)
         VALUES($1, $2, 'SCHOOL', $3, '+919876543210')
         RETURNING user_id`,
        [userEmail, passwordHash, `${s.name} Official`]
      );
      userId = userRes.rows[0].user_id;
    }

    // Insert school
    await pool.query(
      `INSERT INTO schools(
         user_id, school_name, udise_code, school_type,
         district, state, address, student_strength_total,
         verification_status
       )
       VALUES($1, $2, $3, $4, $5, 'Maharashtra', $6, $7, 'VERIFIED')`,
      [userId, s.name, s.udise, s.type, s.district, s.address, s.strength]
    );

    insertedCount++;
    if (insertedCount % 20 === 0 || insertedCount === parsedSchools.length) {
      console.log(`  ✓ Inserted ${insertedCount}/${parsedSchools.length} schools...`);
    }
  }

  console.log(`\n🎉 Import Complete!`);
  console.log(`  - Newly Inserted: ${insertedCount}`);
  console.log(`  - Existing/Skipped: ${skippedCount}`);
  console.log(`  - Total in Excel: ${parsedSchools.length}`);

  const totalInDb = await pool.query('SELECT COUNT(*) FROM schools');
  console.log(`  - Total Schools now in Supabase: ${totalInDb.rows[0].count}\n`);
}

if (require.main === module) {
  importExcelSchools()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error('Import failed:', err);
      await pool.end();
      process.exitCode = 1;
    });
}
