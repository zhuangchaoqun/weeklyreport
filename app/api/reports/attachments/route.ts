import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { reportSectionIds } from '@/lib/report-definitions';
import { ensureReport, getReport, resolveWeek } from '@/lib/report-service';

export async function POST(request:Request){
  const user=await getSessionUser();if(!user)return Response.json({error:'请先登录。'},{status:401});
  const form=await request.formData();
  const periodValue=form.get('periodStart'),sectionValue=form.get('sectionKey'),studentValue=form.get('studentId'),file=form.get('file');
  const periodStart=typeof periodValue==='string'?periodValue:'',sectionKey=typeof sectionValue==='string'?sectionValue:'',studentId=typeof studentValue==='string'?studentValue:'';
  const week=resolveWeek(periodStart);if(!week)return Response.json({error:'自然周无效。'},{status:400});
  if(!reportSectionIds.has(sectionKey))return Response.json({error:'该栏目不支持附件。'},{status:400});
  if(!(file instanceof File)||file.size===0||file.size>20*1024*1024)return Response.json({error:'请选择不超过 20 MB 的文件。'},{status:400});
  const blocked=new Set(['.exe','.com','.bat','.cmd','.ps1','.sh','.msi']),extension=extname(file.name).toLowerCase();
  if(blocked.has(extension))return Response.json({error:'不支持上传可执行文件。'},{status:400});
  let report;
  if(user.role==='student'){
    report=getReport(user.id,week.start);
    if(report?.status==='submitted')return Response.json({error:'周报已提交，需由导师退回后才能上传附件。'},{status:423});
    report=report??ensureReport(user.id,week);
  }else{
    report=getReport(studentId,week.start);
    if(!report)return Response.json({error:'该学生本周尚未保存周报，暂时不能添加导师附件。'},{status:404});
  }
  const id=randomUUID(),storedName=id+extension,directory=join(process.cwd(),'data','uploads',report.id);
  await mkdir(directory,{recursive:true});await writeFile(join(directory,storedName),Buffer.from(await file.arrayBuffer()));
  const now=new Date().toISOString();db.exec('BEGIN IMMEDIATE');
  try{
    db.prepare('INSERT INTO attachments (id,report_id,section_key,original_name,stored_name,mime_type,size_bytes,uploaded_at) VALUES (?,?,?,?,?,?,?,?)').run(id,report.id,sectionKey,file.name.slice(0,255),storedName,file.type||'application/octet-stream',file.size,now);
    db.prepare('INSERT INTO attachment_uploaders (attachment_id,user_id) VALUES (?,?)').run(id,user.id);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error}
  return Response.json({attachment:{id,section_key:sectionKey,original_name:file.name,mime_type:file.type,size_bytes:file.size,uploaded_at:now}},{status:201});
}
