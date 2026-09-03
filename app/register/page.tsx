'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { withBasePath } from '@/lib/base-path';

export default function RegisterPage(){
  const[role,setRole]=useState<'student'|'admin'>('student'),[error,setError]=useState(''),[success,setSuccess]=useState(''),[loading,setLoading]=useState(false);
  async function submit(event:React.SyntheticEvent<HTMLFormElement>){
    event.preventDefault();setError('');setSuccess('');const form=event.currentTarget,data=Object.fromEntries(new FormData(form));
    const name=String(data.name??'').trim(),email=String(data.email??'').trim(),password=String(data.password??''),studentId=String(data.studentId??'').trim(),invite=String(data.adminInviteCode??'').trim();
    if(name.length<2){setError('请填写至少 2 个字符的真实姓名。');return}
    if(!/^\S+@\S+\.\S+$/.test(email)){setError('请填写有效的邮箱地址。');return}
    if(password.length<10){setError('密码至少需要 10 位；这是注册按钮没有响应的常见原因。');return}
    if(role==='student'&&!studentId){setError('学生注册必须填写学号。');return}
    if(role==='admin'&&!invite){setError('管理员注册必须填写邀请码。');return}
    setLoading(true);const response=await fetch(withBasePath('/api/auth/register'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,name,email,studentId,adminInviteCode:invite,role})});const result=await response.json() as {error?:string;pendingApproval?:boolean};setLoading(false);
    if(!response.ok){setError(result.error??'注册失败。');return}
    if(result.pendingApproval){setSuccess('注册申请已提交。管理员批准后，你才能登录和查看组内周报。');form.reset();return}
    window.location.href=withBasePath('/admin/accounts');
  }
  return <main className="grid min-h-screen place-items-center bg-background px-5 py-10"><div className="w-full max-w-lg"><Link href="/" className="mb-6 flex items-center justify-center gap-3"><Image src={withBasePath('/beio-mark.png')} alt="BEIO Lab" width={64} height={48} className="h-12 w-16 object-contain"/><span className="font-bold text-[#0b3768]">BEIO LAB · 周报</span></Link><section className="rounded-3xl border bg-card p-6 shadow-[0_20px_60px_rgb(11_55_104/10%)] sm:p-8"><h1 className="text-2xl font-bold tracking-tight text-[#0b2f58]">创建 BEIO 周报账号</h1><p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">学生自主提交注册申请；管理员使用实验室邀请码注册。</p>
    <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"><button type="button" onClick={()=>{setRole('student');setError('')}} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${role==='student'?'bg-white text-[#0b3768] shadow-sm':'text-muted-foreground'}`}><GraduationCap className="size-4"/>学生</button><button type="button" onClick={()=>{setRole('admin');setError('')}} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${role==='admin'?'bg-white text-[#0b3768] shadow-sm':'text-muted-foreground'}`}><ShieldCheck className="size-4"/>管理员</button></div>
    <form onSubmit={submit} noValidate className="space-y-4"><Field label="姓名"><Input name="name" autoComplete="name" placeholder="你的真实姓名"/></Field><Field label="邮箱"><Input name="email" type="email" autoComplete="email" placeholder="name@example.com"/></Field>{role==='student'&&<Field label="学号"><Input name="studentId" placeholder="学生学号"/></Field>}{role==='admin'&&<Field label="管理员邀请码" note="请完整复制邀请码；前后空格会自动忽略"><Input name="adminInviteCode" type="password" autoComplete="off" placeholder="输入管理员邀请码"/></Field>}<Field label="密码" note="至少 10 位，建议包含字母、数字和符号"><Input name="password" type="password" autoComplete="new-password" placeholder="设置至少 10 位密码"/></Field>{success&&<p role="status" className="rounded-lg border border-[#cfe5bd] bg-[#f1f8eb] px-3 py-3 text-sm leading-6 text-[#39651e]">{success}</p>}{error&&<p role="alert" className="rounded-lg bg-red-50 px-3 py-3 text-sm leading-6 text-red-700">{error}</p>}<Button type="submit" disabled={loading||!!success} className="h-10 w-full rounded-xl bg-[#0b3768]"><UserPlus/>{loading?'正在提交…':role==='student'?'提交注册申请':'注册管理员并进入'}</Button></form>
    <div className="mt-5 rounded-xl border border-[#d8e6cc] bg-[#f5f9f1] p-4 text-xs leading-5 text-[#4d683c]"><b className="text-sm text-[#315f19]">注册与使用说明</b><p className="mt-1">学生注册后需由管理员批准；获批后可查看组内周报，并仅在当期周一填写自己的内容。管理员可审核账号、浏览历周记录并逐项点评。</p><p className="mt-1">附件上限 20 MB。周报、附件和点评均保存在服务器中，并随周次长期归档。</p></div><p className="mt-5 text-center text-sm text-muted-foreground">已有账号？ <Link href="/login" className="font-semibold text-[#0b5b92] hover:underline">直接登录</Link></p></section></div></main>
}
function Field({label,note,children}:{label:string;note?:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-[#263d52]">{label}</span>{children}{note&&<span className="mt-1.5 block text-xs leading-5 text-muted-foreground">{note}</span>}</label>}
