import express from 'express';
import { authRouter } from './modules/auth/routes';
import { schoolRouter } from './modules/schools/routes';
import { requirementRouter } from './modules/requirements/routes';
import { adminRouter } from './modules/admin/routes';
import { reportRouter } from './modules/reports/routes';
import { authenticate } from './middleware/auth';
import { errorHandler } from './shared/errors';
import { pool } from './db/pool';
import { env } from './config/env';
import { feedbackRouter } from './modules/feedback/routes';
import { assistantRouter } from './modules/assistant/routes';

export const app=express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.header('origin') || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept,Origin,X-Requested-With');
  if (req.method === 'OPTIONS') return res.status(204).end();
  console.log(`[HTTP] ${req.method} ${req.url} from ${req.ip} (origin: ${req.header('origin')})`);
  next();
});
app.use(express.json({limit:'1mb'}));
app.get('/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({status:'ok'});}catch{res.status(503).json({status:'unavailable'});}});
app.use('/api/v1/auth',authRouter);
app.use('/api/v1',schoolRouter);
app.use('/api/v1',requirementRouter);
app.use('/api/v1',adminRouter);
app.use('/api/v1',reportRouter);
app.use('/api/v1',feedbackRouter);
app.use('/api/v1',assistantRouter);
app.get('/api/v1/session', authenticate, async (req, res, next) => {
  try {
    const user = await pool.query('SELECT user_id, email, role, full_name FROM users WHERE user_id=$1', [req.principal!.userId]);
    if (!user.rowCount) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    const u = user.rows[0];
    let school_id: string | null = null;
    let org_id: string | null = null;
    if (u.role === 'SCHOOL') {
      const s = await pool.query('SELECT school_id FROM schools WHERE user_id=$1', [u.user_id]);
      school_id = s.rows[0]?.school_id ?? null;
    } else if (u.role === 'NGO') {
      const o = await pool.query('SELECT org_id FROM organizations WHERE user_id=$1', [u.user_id]);
      org_id = o.rows[0]?.org_id ?? null;
    }
    res.json({
      user_id: u.user_id,
      email: u.email,
      role: u.role,
      full_name: u.full_name,
      school_id,
      org_id,
    });
  } catch (e) { next(e); }
});
app.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Endpoint not found.'}}));
app.use(errorHandler);
