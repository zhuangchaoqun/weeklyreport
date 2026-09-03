export const reportSections = [
  { id: 'summary', kicker: '01 · 本周工作概述', title: '计划、完成情况与备注', hint: '逐行对照上周计划，具体说明完成情况；未完成时请写明原因。', required: true, canAttach: true },
  { id: 'experiment', kicker: '02 · 具体研究工作', title: '实验、计算、数据分析与模型开发', hint: '简要描述过程，总结主要结果并作必要分析；建议结合课题主线归纳。', required: true, canAttach: true },
  { id: 'blockers', kicker: '03 · 问题与求助', title: '遇到的问题及拟解决方案', hint: '说明当前问题、初步原因、已经尝试或准备采取的方法；需要老师指导的问题请重点注明。', required: true, canAttach: true },
  { id: 'other', kicker: '04 · 其他工作（选填）', title: '其他值得汇报的工作', hint: '论文撰写、项目申报、专利、学术交流，以及不属于上述内容的工作。', required: false, canAttach: true },
  { id: 'next', kicker: '05 · 下周计划', title: '下周准备完成什么？', hint: '计划要具体、可检查，详略得当。', required: true, canAttach: true },
] as const;

export type ReportSectionId = (typeof reportSections)[number]['id'];
export const reportSectionIds = new Set<string>(reportSections.map((section) => section.id));
