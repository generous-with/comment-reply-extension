# 知乎回答编辑器适配

2026-11-09 使用 BrowserOS neo 检查用户指定的知乎问题页。以下为页面结构摘要，不包含账户资料：

- 标题：`main h1.QuestionHeader-title`。
- 描述：`main .QuestionRichText`，折叠时“显示全部”位于容器内。
- “写回答”打开 `form.AnswerForm`，其中正文为 `.public-DraftEditor-content[contenteditable="true"]`，图片入口为 `button[aria-label="图片"]`。
- “发布设置”展开同一表单中的“一句话介绍”和“送礼物设置”。简介需先点本行“修改”，再在“编辑话题经验”弹窗点 `button.TopicBioItem-modifyButton`，输入框 placeholder 为“一句话介绍”。弹窗的“保存”由用户操作。
- 礼物选项是原生 radio，标签为“开启送礼物”。首次选择触发 `.RewardForm-rewardModal`，其“确定”会接受赞赏协议，扩展将该步骤留给用户。
- BrowserOS 实页仅验证页面结构和弹窗，没有保存简介、确认协议或发布回答。正文及字段回填由 Chromium 受控测试覆盖。
