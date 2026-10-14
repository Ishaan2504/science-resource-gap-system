import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/routes';
import { schoolRouter } from './modules/schools/routes';
import { requirementRouter } from './modules/requirements/routes';
import { adminRouter } from './modules/admin/routes';
import { reportRouter } from './modules/reports/routes';
import { authenticate } from './middleware/auth';
import { errorHandler } from './shared/errors';
import { pool } from './db/pool';

export const app=express();
app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({limit:'1mb'}));
app.get('/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({status:'ok'});}catch{res.status(503).json({status:'unavailable'});}});
app.use('/api/v1/auth',authRouter);
app.use('/api/v1',schoolRouter);
app.use('/api/v1',requirementRouter);
app.use('/api/v1',adminRouter);
app.use('/api/v1',reportRouter);
app.get('/api/v1/session', authenticate, async (req, res, next) => {
  try {
    const userRes = await pool.query('SELECT user_id, role, email, full_name FROM users WHERE user_id=$1', [req.principal!.userId]);
    if (!userRes.rowCount) {
      return res.json({ user_id: req.principal!.userId, role: req.principal!.role });
    }
    const user = userRes.rows[0];
    let school = null;
    if (user.role === 'SCHOOL') {
      const schRes = await pool.query('SELECT school_id, school_name, udise_code, district FROM schools WHERE user_id=$1 LIMIT 1', [user.user_id]);
      if (schRes.rowCount) {
        school = schRes.rows[0];
      }
    }
    res.json({
      user_id: user.user_id,
      role: user.role,
      email: user.email,
      full_name: user.full_name,
      school_id: school?.school_id,
      school_name: school?.school_name,
      udise_code: school?.udise_code,
      district: school?.district,
    });
  } catch (e) {
    next(e);
  }
});
app.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Endpoint not found.'}}));
app.use(errorHandler);
