import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookieOptions, createSession, hashPassword, SESSION_COOKIE } from '@/lib/auth';
import { db, publicUser } from '@/lib/db';

export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const value=(input:unknown)=>typeof input==='string'?input:'';
  const name=value(body?.name).trim(),email=value(body?.email).trim().toLowerCase(),password=value(body?.password),studentId=value(body?.studentId).trim()||null,role=body?.role==='admin'?'admin':'student';
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<10)return NextResponse.json({error:'请填写姓名、有效邮箱和至少 10 位密码。'},{status:400});
  if(role==='student'&&!studentId)return NextResponse.json({error:'学生注册必须填写学号。'},{status:400});
  if(role==='admin'&&(!process.env.ADMIN_INVITE_CODE||value(body?.adminInviteCode).trim()!==process.env.ADMIN_INVITE_CODE.trim()))return NextResponse.json({error:'管理员邀请码无效，请检查是否复制了多余空格。'},{status:403});
  if(db.prepare('SELECT id FROM users WHERE email=? OR (? IS NOT NULL AND student_id=?)').get(email,studentId,studentId))return NextResponse.json({error:'邮箱或学号已被注册。'},{status:409});
  const id=randomUUID(),createdAt=new Date().toISOString();
  try{
    db.exec('BEGIN IMMEDIATE');
    db.prepare('INSERT INTO users (id,name,email,student_id,role,password_hash,created_at) VALUES (?,?,?,?,?,?,?)').run(id,name,email,studentId,role,hashPassword(password),createdAt);
    if(role==='student')db.prepare('INSERT INTO student_approvals (user_id,status,requested_at) VALUES (?,?,?)').run(id,'pending',createdAt);
    db.exec('COMMIT');
    const row=db.prepare('SELECT u.*,a.status AS approval_status FROM users u LEFT JOIN student_approvals a ON a.user_id=u.id WHERE u.id=?').get(id) as Record<string,unknown>;
    if(role==='student')return NextResponse.json({user:publicUser(row),pendingApproval:true},{status:202});
    const session=createSession(id);const response=NextResponse.json({user:publicUser(row)},{status:201});response.cookies.set(SESSION_COOKIE,session.token,cookieOptions(session.expires));return response;
  }catch{try{db.exec('ROLLBACK')}catch{}return NextResponse.json({error:'注册失败，请检查邮箱或学号是否重复。'},{status:409})}
}
