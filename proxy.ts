import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUserByToken, SESSION_COOKIE } from '@/lib/auth';

export function proxy(request:NextRequest){
  const token=request.cookies.get(SESSION_COOKIE)?.value;
  const user=token?getSessionUserByToken(token):null;
  const basePath=request.nextUrl.basePath;
  if(!user)return NextResponse.redirect(new URL(`${basePath}/login?reason=approval`,request.url));
  if(request.nextUrl.pathname.startsWith(`${basePath}/admin`)&&user.role!=='admin')return NextResponse.redirect(new URL(`${basePath}/`,request.url));
  return NextResponse.next();
}
export const config={matcher:['/','/admin/:path*']};
