import { Router } from 'express';
import { z } from 'zod';
import { inTransaction, pool } from '../../db/pool';
import { allow, authenticate, canAccessSchool } from '../../middleware/auth';
import { ApiError } from '../../shared/errors';

export const feedbackRouter = Router();
feedbackRouter.use(authenticate);

feedbackRouter.get('/feedback', async (req, res, next) => {
  try {
    const result = req.principal!.role === 'ADMIN'
      ? await pool.query(`SELECT f.*,u.full_name AS submitted_by_name,u.role AS submitted_by_role,s.school_name
          FROM user_feedback f JOIN users u ON u.user_id=f.submitted_by
          LEFT JOIN schools s ON s.school_id=f.school_id ORDER BY f.created_at DESC LIMIT 200`)
      : await pool.query(`SELECT f.*,u.full_name AS submitted_by_name,u.role AS submitted_by_role,s.school_name
          FROM user_feedback f JOIN users u ON u.user_id=f.submitted_by
          LEFT JOIN schools s ON s.school_id=f.school_id
          WHERE f.submitted_by=$1 ORDER BY f.created_at DESC LIMIT 100`, [req.principal!.userId]);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

feedbackRouter.post('/feedback', allow('SCHOOL','NGO','ADMIN','FIELD_COORDINATOR'), async (req, res, next) => {
  try {
    const body = z.object({
      category: z.enum(['INSTRUCTOR','SERVICE','EQUIPMENT']),
      target_name: z.string().trim().min(1).max(160),
      rating: z.number().int().min(1).max(5),
      comments: z.string().trim().min(10).max(2000),
      school_id: z.string().uuid().optional(),
    }).parse(req.body);
    if (body.school_id && !await canAccessSchool(req.principal!.userId, req.principal!.role, body.school_id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You cannot submit feedback for this school.');
    }
    const result = await inTransaction(async (client) => {
      const saved = await client.query(`INSERT INTO user_feedback(submitted_by,category,target_name,rating,comments,school_id)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [
        req.principal!.userId, body.category, body.target_name, body.rating, body.comments, body.school_id ?? null,
      ]);
      await client.query(`INSERT INTO audit_logs(entity_type,entity_id,action,performed_by,new_value)
        VALUES('UserFeedback',$1,'CREATE',$2,jsonb_build_object('category',$3,'target_name',$4,'rating',$5))`,
      [saved.rows[0].feedback_id, req.principal!.userId, body.category, body.target_name, body.rating]);
      return saved.rows[0];
    });
    res.status(201).json(result);
  } catch (error) { next(error); }
});
