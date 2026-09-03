import 'server-only';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db, publicUser, type PublicUser } from '@/lib/db';

export const SESSION_COOKIE = 'beio_session';
export function hashPassword(password:string) { const salt=randomBytes(16); return `scrypt:${salt.toString('hex')}:${scryptSync(password,salt,64).toString('hex')}`; }
export function verifyPassword(password:string,stored:string) { const [alg,saltHex,hashHex]=stored.split(':'); if(alg!=='scrypt'||!saltHex||!hashHex)return false; const expected=Buffer.from(hashHex,'hex'); const actual=scryptSync(password,Buffer.from(saltHex,'hex'),expected.length); return expected.length===actual.length&&timingSafeEqual(expected,actual); }
export function tokenHash(token:string){return createHash('sha256').update(token).digest('hex')}
export function createSession(userId:string){const token=randomBytes(32).toString('base64url');const now=new Date();const expires=new Date(now.getTime()+14*86400000);db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(tokenHash(token),userId,expires.toISOString(),now.toISOString());return{token,expires}}
export function getSessionUserByToken(token:string):PublicUser|null{const row=db.prepare(`SELECT u.*,a.status AS approval_status FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN student_approvals a ON a.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.status='active' AND (u.role='admin' OR a.status='approved')`).get(tokenHash(token),new Date().toISOString()) as Record<string,unknown>|undefined;return row?publicUser(row):null}
export async function getSessionUser():Promise<PublicUser|null>{const token=(await cookies()).get(SESSION_COOKIE)?.value;return token?getSessionUserByToken(token):null}
export async function requireAdmin(){const user=await getSessionUser();return user?.role==='admin'?user:null}
export const cookieOptions=(expires:Date)=>({httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',expires,priority:'high' as const});
