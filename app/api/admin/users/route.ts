import { requireAdmin } from '@/lib/auth';
import { db,publicUser } from '@/lib/db';

export async function GET(){
  if(!await requireAdmin())return Response.json({error:'无管理员权限。'},{status:403});
  const rows=db.prepare(`SELECT u.*,a.status AS approval_status,
    CASE WHEN pr.status='pending' THEN pr.requested_at ELSE NULL END AS reset_requested_at
    FROM users u
    LEFT JOIN student_approvals a ON a.user_id=u.id
    LEFT JOIN password_reset_requests pr ON pr.user_id=u.id
    WHERE u.status=?
    ORDER BY CASE WHEN pr.status='pending' THEN 0 WHEN a.status='pending' THEN 1 ELSE 2 END,u.role,u.created_at DESC`).all('active') as Record<string,unknown>[];
  return Response.json({users:rows.map((row)=>({...publicUser(row),resetRequestedAt:typeof row.reset_requested_at==='string'?row.reset_requested_at:null}))});
}
