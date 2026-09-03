import { NextResponse } from 'next/server';
import { tokenHash,SESSION_COOKIE } from '@/lib/auth';
import { db } from '@/lib/db';
export async function POST(request:Request){const token=request.headers.get('cookie')?.match(/(?:^|; )beio_session=([^;]+)/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(decodeURIComponent(token)));const response=NextResponse.json({ok:true});response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,path:'/',maxAge:0});return response}
