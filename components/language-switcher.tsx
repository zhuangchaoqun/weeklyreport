'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Language = 'zh' | 'en';

const translations: Record<string, string> = {
  'BEIO LAB · 周报': 'BEIO LAB · Weekly Reports',
  建成环境智慧运维实验室: 'Built Environment Intelligent Operations Lab',
  登录: 'Sign in',
  '学生与管理员使用同一入口，系统按账号角色进入对应工作台。':
    'Students and administrators use the same sign-in page and are directed to their own workspace.',
  邮箱: 'Email',
  密码: 'Password',
  忘记密码请联系管理员重置:
    'Contact an administrator if you forget your password',
  '正在登录…': 'Signing in…',
  '还没有账号？': 'Need an account?',
  现在注册: 'Register now',
  '创建 BEIO 周报账号': 'Create a BEIO weekly report account',
  '学生自主提交注册申请；管理员使用实验室邀请码注册。':
    'Students submit a registration request; administrators register with the lab invitation code.',
  学生: 'Student',
  管理员: 'Administrator',
  姓名: 'Name',
  学号: 'Student ID',
  管理员邀请码: 'Administrator invitation code',
  '请完整复制邀请码；前后空格会自动忽略':
    'Paste the complete invitation code; surrounding spaces are ignored',
  '至少 10 位，建议包含字母、数字和符号':
    'At least 10 characters; letters, numbers and symbols are recommended',
  学生学号: 'Student ID',
  输入管理员邀请码: 'Enter the administrator invitation code',
  '设置至少 10 位密码': 'Set a password of at least 10 characters',
  '正在提交…': 'Submitting…',
  提交注册申请: 'Submit registration request',
  注册管理员并进入: 'Register administrator and continue',
  注册与使用说明: 'Registration and usage',
  '学生注册后需由管理员批准；获批后可查看组内周报，并仅在当期周一填写自己的内容。管理员可审核账号、浏览历周记录并逐项点评。':
    'Student accounts require administrator approval. Approved students can view group reports and edit their own reports. Administrators can review accounts, browse archived weeks and comment on each section.',
  '附件上限 20 MB。周报、附件和点评均保存在服务器中，并随周次长期归档。':
    'Each attachment may be up to 20 MB. Reports, attachments and comments are stored on the server and archived by week.',
  '已有账号？': 'Already have an account?',
  直接登录: 'Sign in',
  返回周报: 'Back to reports',
  '管理员 · 账号审核': 'Administrator · Account review',
  注册申请与账号: 'Registration requests and accounts',
  '待审核学生只有获批后才能登录和查看周报。移除账号不会删除历史记录。':
    'Students can sign in and view reports only after approval. Removing an account preserves its report history.',
  注册管理员: 'Register administrator',
  '正在读取账号…': 'Loading accounts…',
  '暂无账号或注册申请。': 'No accounts or registration requests.',
  申请找回密码: 'Password reset requested',
  待审核: 'Pending',
  已批准学生: 'Approved student',
  批准进入: 'Approve',
  重置密码: 'Reset password',
  移除申请: 'Remove request',
  移除账号: 'Remove account',
  '正在读取周报…': 'Loading weekly report…',
  '无法读取周报。': 'Unable to load the weekly report.',
  返回登录: 'Back to sign in',
  '导师 · 管理员': 'Supervisor · Administrator',
  学生账号: 'Student account',
  账号审核: 'Account review',
  退出登录: 'Sign out',
  自然周档案: 'Weekly archive',
  查看学生: 'Students',
  '绿色：已提交 · 红色：未提交': 'Green: submitted · Red: not submitted',
  已提交: 'Submitted',
  未提交: 'Not submitted',
  每周汇报: 'Weekly Report',
  '学生可持续保存草稿；提交后锁定，只有导师退回后才能继续修改。':
    'You may save drafts at any time. A submitted report is locked until your supervisor returns it.',
  导师点评模式: 'Supervisor review mode',
  '每个内容块下均可填写点评，学生内容由学生本人维护。':
    'Add comments under any section. Report content remains managed by the student.',
  导师已退回修改: 'Returned for revision',
  '请根据导师点评修改后重新提交。':
    "Please revise the report based on your supervisor's comments and submit it again.",
  '内容填写进度（仅供参考）': 'Completion progress (for reference only)',
  尚未开始: 'Not started',
  所有更改都会保存在服务器: 'All changes are stored on the server',
  提交导师点评: 'Submit supervisor comments',
  '点评和导师附件可持续修改；退回后学生即可继续修改并重新提交。':
    'Comments and supervisor attachments remain editable. Returning the report lets the student revise and resubmit it.',
  '退回说明（选填）': 'Return note (optional)',
  退回学生修改: 'Return for revision',
  '提交 / 更新点评': 'Submit / update comments',
  本期周报已提交并锁定: 'This report has been submitted and locked',
  '导师退回后，保存、修改和附件上传功能会重新开放。':
    'Saving, editing and attachment uploads will be available again after the supervisor returns the report.',
  保存草稿或正式提交: 'Save draft or submit',
  '草稿可持续修改；正式提交后需等待导师退回才能修改。':
    'Drafts remain editable. After submission, changes require the supervisor to return the report.',
  '正在保存…': 'Saving…',
  保存草稿: 'Save draft',
  正式提交: 'Submit report',
  '01 · 本周工作概述': '01 · Weekly work overview',
  '计划、完成情况与备注': 'Plans, progress and notes',
  '对完成情况及未完成的原因做具体说明。可在任一单元格中直接粘贴整张 Word 表格，系统会自动填入全部行；也可手动增加或删除行。':
    'Describe progress and explain unfinished work. Paste an entire Word table into any cell to fill all rows automatically, or add and remove rows manually.',
  序号: 'No.',
  上周计划: 'Previous plan',
  完成情况: 'Progress',
  备注: 'Notes',
  操作: 'Actions',
  填写上周计划: 'Enter the previous plan',
  说明完成情况或未完成原因: 'Describe progress or reasons for incomplete work',
  '补充说明（选填）': 'Additional notes (optional)',
  添加一行: 'Add row',
  暂无内容: 'No content',
  建议填写: 'Recommended',
  '在这里填写本周内容…': "Enter this week's work here…",
  本栏目暂无内容: 'No content in this section',
  附件: 'Attachments',
  '上传附件（单个 ≤20 MB）': 'Upload attachment (max 20 MB each)',
  导师点评: 'Supervisor comments',
  '留下具体、可行动的建议…': 'Leave specific, actionable feedback…',
  暂无已批准学生: 'No approved students',
  '学生提交注册申请后，请先在“账号审核”中批准。':
    'Approve student registration requests in Account review first.',
  前往账号审核: 'Go to account review',
  '02 · 具体研究工作': '02 · Research work',
  '实验、计算、数据分析与模型开发':
    'Experiments, computation, data analysis and model development',
  '简要描述过程，总结主要结果并作必要分析；建议结合课题主线归纳。':
    'Briefly describe the process, summarize key results and provide the necessary analysis, organized around your research topic.',
  '03 · 问题与求助': '03 · Problems and support',
  遇到的问题及拟解决方案: 'Problems and proposed solutions',
  '说明当前问题、初步原因、已经尝试或准备采取的方法；需要老师指导的问题请重点注明。':
    'Describe the problem, likely causes and methods tried or planned. Highlight questions that need supervisor guidance.',
  '04 · 其他工作（选填）': '04 · Other work (optional)',
  其他值得汇报的工作: 'Other work worth reporting',
  '论文撰写、项目申报、专利、学术交流，以及不属于上述内容的工作。':
    'Papers, project applications, patents, academic exchanges and work not covered above.',
  '05 · 下周计划': '05 · Plan for next week',
  下周准备完成什么: 'What will you complete next week?',
  '下周准备完成什么？': 'What will you complete next week?',
  计划要具体可检查详略得当: 'Make the plan specific and verifiable.',
  '计划要具体、可检查，详略得当。':
    'Make the plan specific, verifiable and appropriately detailed.',
  周报已退回学生: 'Report returned to student',
  导师点评已提交: 'Supervisor comments submitted',
  周报已提交并锁定: 'Report submitted and locked',
  草稿已保存: 'Draft saved',
  '读取周报失败。': 'Unable to load the weekly report.',
  '保存失败。': 'Unable to save.',
  '附件上传失败。': 'Attachment upload failed.',
  '登录失败。': 'Sign-in failed.',
  '注册失败。': 'Registration failed.',
  '审批失败。': 'Approval failed.',
  '移除账号失败。': 'Unable to remove the account.',
  '密码重置失败。': 'Password reset failed.',
  '请先登录。': 'Please sign in first.',
  '自然周无效。': 'Invalid calendar week.',
  '周报已提交，需由导师退回后才能修改。':
    'This report has been submitted and can only be edited after your supervisor returns it.',
  '请填写至少 2 个字符的真实姓名。':
    'Enter your full name using at least 2 characters.',
  '请填写有效的邮箱地址。': 'Enter a valid email address.',
  '密码至少需要 10 位；这是注册按钮没有响应的常见原因。':
    'The password must be at least 10 characters.',
  '学生注册必须填写学号。': 'A student ID is required.',
  '管理员注册必须填写邀请码。':
    'The administrator invitation code is required.',
  '注册申请已提交。管理员批准后，你才能登录和查看组内周报。':
    'Your registration request has been submitted. You can sign in and view group reports after administrator approval.',
};

const originalText = new WeakMap<Node, string>();
const appliedText = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const appliedAttributes = new WeakMap<Element, Map<string, string>>();

function dynamicTranslation(value: string) {
  let match = value.match(/^(\d{4}) 年 · 第 (\d+) 周$/);
  if (match) return `Week ${match[2]} · ${match[1]}`;
  match = value.match(/^(\d{4}) 年第 (\d+) 周$/);
  if (match) return `Week ${match[2]} of ${match[1]}`;
  match = value.match(/^(\d{4}) 年 (\d+) 月 (\d+) 日$/);
  if (match) return `${match[2]}/${match[3]}/${match[1]}`;
  match = value.match(/^(.+)的周报$/);
  if (match) return `${match[1]}'s Weekly Report`;
  match = value.match(/^状态：(已提交|已锁定|草稿)$/);
  if (match)
    return `Status: ${{ 已提交: 'Submitted', 已锁定: 'Locked', 草稿: 'Draft' }[match[1] as '已提交' | '已锁定' | '草稿']}`;
  match = value.match(/^最近保存：(.+)$/);
  if (match) return `Last saved: ${match[1]}`;
  match = value.match(/^(\d+) 个学生注册申请等待审核$/);
  if (match)
    return `${match[1]} student registration request(s) awaiting review`;
  match = value.match(/^注册于 (.+)$/);
  if (match) return `Registered ${match[1]}`;
  match = value.match(/^申请于 (.+)$/);
  if (match) return `Requested ${match[1]}`;
  match = value.match(/^ · 学号 (.+)$/);
  if (match) return ` · Student ID ${match[1]}`;
  match = value.match(/^删除第 (\d+) 行$/);
  if (match) return `Delete row ${match[1]}`;
  match = value.match(/^已从 Word 粘贴 (\d+) 行$/);
  if (match) return `${match[1]} row(s) pasted from Word`;
  return value;
}

function translate(value: string) {
  return translations[value] ?? dynamicTranslation(value);
}

function applyLanguage(language: Language) {
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.title =
    language === 'en' ? 'BEIO Lab · Weekly Reports' : 'BEIO Lab · 周报';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (!parent?.closest('[data-i18n-ignore]')) {
      const current = node.textContent ?? '';
      const previous = appliedText.get(node);
      if (
        !originalText.has(node) ||
        (previous !== undefined && current !== previous)
      )
        originalText.set(node, current);
      const source = originalText.get(node) ?? '';
      const trimmed = source.trim();
      const target =
        language === 'en' && trimmed
          ? source.replace(trimmed, translate(trimmed))
          : source;
      if (current !== target) node.textContent = target;
      appliedText.set(node, target);
    }
    node = walker.nextNode();
  }
  for (const element of document.body.querySelectorAll(
    '[placeholder],[aria-label],[title],[data-placeholder]',
  )) {
    if (element.closest('[data-i18n-ignore]')) continue;
    let attributes = originalAttributes.get(element);
    if (!attributes) {
      attributes = new Map();
      originalAttributes.set(element, attributes);
    }
    let applied = appliedAttributes.get(element);
    if (!applied) {
      applied = new Map();
      appliedAttributes.set(element, applied);
    }
    for (const name of [
      'placeholder',
      'aria-label',
      'title',
      'data-placeholder',
    ]) {
      const current = element.getAttribute(name);
      const previous = applied.get(name);
      if (
        current !== null &&
        (!attributes.has(name) ||
          (previous !== undefined && current !== previous))
      )
        attributes.set(name, current);
      const source = attributes.get(name);
      if (source !== undefined) {
        const target = language === 'en' ? translate(source) : source;
        if (current !== target) element.setAttribute(name, target);
        applied.set(name, target);
      }
    }
  }
}

export function LanguageSwitcher() {
  const [language, setLanguage] = useState<Language>('zh');
  useEffect(() => {
    setLanguage(localStorage.getItem('beio-language') === 'en' ? 'en' : 'zh');
  }, []);
  useEffect(() => {
    let applying = false;
    const run = () => {
      if (applying) return;
      applying = true;
      applyLanguage(language);
      applying = false;
    };
    run();
    localStorage.setItem('beio-language', language);
    const observer = new MutationObserver(() => queueMicrotask(run));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'placeholder',
        'aria-label',
        'title',
        'data-placeholder',
      ],
    });
    return () => observer.disconnect();
  }, [language]);
  return (
    <div data-i18n-ignore className="fixed right-3 top-3 z-[70]">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={language === 'zh' ? 'Switch to English' : '切换为中文'}
        onClick={() =>
          setLanguage((current) => (current === 'zh' ? 'en' : 'zh'))
        }
        className="rounded-full border-[#b9c9d8] bg-white/95 px-3 text-[#0b3768] shadow-sm backdrop-blur hover:bg-[#edf4fb]"
      >
        <Languages className="size-4" />
        {language === 'zh' ? 'English' : '中文'}
      </Button>
    </div>
  );
}
