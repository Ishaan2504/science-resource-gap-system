import { inTransaction, pool } from './src/db/pool';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { env } from './src/config/env';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function testRegister() {
  const body = {
    email: 'newuser.test@example.com',
    password: 'Password123',
    full_name: 'Dr. Test User',
    role: 'SCHOOL' as const,
    profile: {
      school_name: 'Test Higher Secondary School',
      district: 'Bangalore Urban',
      state: 'Karnataka',
      student_strength_total: 450,
      school_type: 'GOVERNMENT',
    }
  };

  try {
    const result = await inTransaction(async (c) => {
      const user = await c.query(
        'INSERT INTO users(email,password_hash,role,full_name,phone) VALUES($1,$2,$3,$4,$5) RETURNING user_id',
        [body.email, await bcrypt.hash(body.password, 12), body.role, body.full_name, null]
      );
      const id = user.rows[0].user_id;

      await c.query(
        'INSERT INTO schools(user_id,school_name,school_type,district,state,student_strength_total) VALUES($1,$2,$3,$4,$5,$6)',
        [id, body.profile.school_name, body.profile.school_type, body.profile.district, body.profile.state, body.profile.student_strength_total]
      );

      await c.query(
        "INSERT INTO audit_logs(entity_type,entity_id,action,performed_by,new_value) VALUES('User',$1,'CREATE',$1,jsonb_build_object('role',$2::text))",
        [id, body.role]
      );

      const access = jwt.sign({ role: body.role }, env.accessSecret, { subject: id, expiresIn: '30m' });
      const refresh = jwt.sign({ token_type: 'refresh' }, env.refreshSecret, { subject: id, expiresIn: '14d' });
      await c.query("INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '14 days')", [id, hashToken(refresh)]);

      return { user_id: id, role: body.role, access_token: access, refresh_token: refresh };
    });

    console.log('SUCCESS:', result);
  } catch (err) {
    console.error('ERROR DETAIL:', err);
  } finally {
    await pool.end();
  }
}

testRegister();
