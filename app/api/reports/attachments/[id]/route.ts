import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_request:Request,context:RouteContext<'/api/reports/attachments/[id]'>){const user=await getSessionUser();if(!user)return Response.json({error:'请先登录。'},{status:401});const{id}=await context.params;const row=db.prepare('SELECT a.*,r.user_id FROM attachments a JOIN reports r ON r.id=a.report_id WHERE a.id=?').get(id) as {report_id:string;stored_name:string;original_name:string;mime_type:string}|undefined;if(!row)return Response.json({error:'附件不存在。'},{status:404});const data=await readFile(join(process.cwd(),'data','uploads',row.report_id,row.stored_name));const safeName=row.original_name.replace(/[\r\n"]/g,'_');return new Response(data,{headers:{'Content-Type':row.mime_type,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,'Cache-Control':'private, no-store'}})}
