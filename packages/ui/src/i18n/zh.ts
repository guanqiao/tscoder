import { dict as en } from "./en"

type Keys = keyof typeof en

export const dict = {
  "ui.sessionReview.title": "会话变更",
  "ui.sessionReview.title.lastTurn": "上一轮变�?,
  "ui.sessionReview.diffStyle.unified": "统一",
  "ui.sessionReview.diffStyle.split": "拆分",
  "ui.sessionReview.expandAll": "全部展开",
  "ui.sessionReview.collapseAll": "全部收起",

  "ui.sessionReview.change.added": "已添�?,
  "ui.sessionReview.change.removed": "已移�?,
  "ui.sessionReview.change.modified": "已修�?,
  "ui.lineComment.label.prefix": "评论 ",
  "ui.lineComment.label.suffix": "",
  "ui.lineComment.editorLabel.prefix": "正在评论 ",
  "ui.lineComment.editorLabel.suffix": "",
  "ui.lineComment.placeholder": "添加评论",
  "ui.lineComment.submit": "评论",
  "ui.sessionTurn.steps.show": "显示步骤",
  "ui.sessionTurn.steps.hide": "隐藏步骤",
  "ui.sessionTurn.summary.response": "回复",
  "ui.sessionTurn.diff.showMore": "显示更多更改（{{count}}�?,

  "ui.sessionTurn.retry.retrying": "重试�?,
  "ui.sessionTurn.retry.inSeconds": "{{seconds}} 秒后",

  "ui.sessionTurn.status.delegating": "正在委派工作",
  "ui.sessionTurn.status.planning": "正在规划下一�?,
  "ui.sessionTurn.status.gatheringContext": "正在收集上下�?,
  "ui.sessionTurn.status.searchingCodebase": "正在搜索代码�?,
  "ui.sessionTurn.status.searchingWeb": "正在搜索网页",
  "ui.sessionTurn.status.makingEdits": "正在修改",
  "ui.sessionTurn.status.runningCommands": "正在运行命令",
  "ui.sessionTurn.status.thinking": "思考中",
  "ui.sessionTurn.status.thinkingWithTopic": "思考：{{topic}}",
  "ui.sessionTurn.status.gatheringThoughts": "正在整理思路",
  "ui.sessionTurn.status.consideringNextSteps": "正在考虑下一�?,

  "ui.messagePart.diagnostic.error": "错误",
  "ui.messagePart.title.edit": "编辑",
  "ui.messagePart.title.write": "写入",
  "ui.messagePart.option.typeOwnAnswer": "输入自己的答�?,
  "ui.messagePart.review.title": "检查你的答�?,

  "ui.list.loading": "加载�?,
  "ui.list.empty": "无结�?,
  "ui.list.clearFilter": "清除筛�?,
  "ui.list.emptyWithFilter.prefix": "没有关于",
  "ui.list.emptyWithFilter.suffix": "的结�?,

  "ui.messageNav.newMessage": "新消�?,

  "ui.textField.copyToClipboard": "复制到剪贴板",
  "ui.textField.copyLink": "复制链接",
  "ui.textField.copied": "已复�?,

  "ui.imagePreview.alt": "图片预览",

  "ui.tool.read": "读取",
  "ui.tool.loaded": "已加�?,
  "ui.tool.list": "列表",
  "ui.tool.glob": "Glob",
  "ui.tool.grep": "Grep",
  "ui.tool.webfetch": "Webfetch",
  "ui.tool.shell": "Shell",
  "ui.tool.patch": "补丁",
  "ui.tool.todos": "待办",
  "ui.tool.todos.read": "读取待办",
  "ui.tool.questions": "问题",
  "ui.tool.agent": "{{type}} 智能�?,

  "ui.common.file.one": "个文�?,
  "ui.common.file.other": "个文�?,
  "ui.common.question.one": "个问�?,
  "ui.common.question.other": "个问�?,

  "ui.common.add": "添加",
  "ui.common.cancel": "取消",
  "ui.common.confirm": "确认",
  "ui.common.dismiss": "忽略",
  "ui.common.close": "关闭",
  "ui.common.next": "下一�?,
  "ui.common.submit": "提交",

  "ui.permission.deny": "拒绝",
  "ui.permission.allowAlways": "始终允许",
  "ui.permission.allowOnce": "允许一�?,

  "ui.message.expand": "展开消息",
  "ui.message.collapse": "收起消息",
  "ui.message.copy": "复制",
  "ui.message.copied": "已复�?,
  "ui.message.attachment.alt": "附件",

  "ui.patch.action.deleted": "已删�?,
  "ui.patch.action.created": "已创�?,
  "ui.patch.action.moved": "已移�?,
  "ui.patch.action.patched": "已应用补�?,

  "ui.question.subtitle.answered": "{{count}} 已回�?,
  "ui.question.answer.none": "(无答�?",
  "ui.question.review.notAnswered": "(未回�?",
  "ui.question.multiHint": "(可多�?",
  "ui.question.custom.placeholder": "输入你的答案...",
} satisfies Partial<Record<Keys, string>>
