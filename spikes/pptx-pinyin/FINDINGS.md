# Phase 0 Spike 结论 — pptxgenjs + pinyin-pro（2026-09-22）

运行：`pnpm install && node generate.mjs`（`ONLY=title,A,B,video` 选变体，`OUT=xxx.pptx` 指定文件名）。
验证环境：macOS PowerPoint 16.113。Windows PowerPoint 与 Google Slides 待 Haoyang 用 `evidence/selah-spike-sample.pptx` 验证。

## 结论一览

| 验证点 | 结果 | 对设计的影响 |
|---|---|---|
| 拼音上 / 中文下，两层居中文本框（变体 A） | **通过**。PowerPoint 正常打开，排版符合模版参数（Arial 35 / 黑体 45），见 `evidence/powerpoint-mac-variantA-V1.png` | MVP 采用此方案 |
| 逐字对齐用无边框表格（变体 B） | **失败**。pptxgenjs 4.0.1 生成的表格让 PowerPoint 弹出 "found a problem with content… Repair"。去掉 border / rowH / margin 选项后仍不稳定 | 不用 pptxgenjs 表格。若要逐字精确对齐，用"每个字一个小文本框"方案，或留给网页演示模式（HTML ruby 天然对齐） |
| 视频背景 `addMedia({type:'video'})` | **文件可正常打开**（`evidence/powerpoint-mac-video-bg.png`），媒体作为 `ppt/media/media-N.mp4` 嵌入。pptxgenjs **不生成 `<p:timing>`**，也没有 loop/autoplay 参数 | 需要用 jszip 后处理每张视频页的 slide XML，注入 `<p:timing>` 自动播放 + `repeatCount="indefinite"`；未验证。多页共用同一视频时 pptxgenjs 是否去重媒体也未验证，若不去重，一份 20 页的 PPTX 会有 20 份视频 |
| pinyin-pro 多音字 | 长阔→cháng、快乐→lè、行在→xíng、重新→chóng 全对；"不致"输出 bú（做了变调） | 默认可信；编辑器仍要提供逐字修正 + 全曲记住 |
| 对比度 | 白字 / 深蓝底 17.4 : 1，拼音浅灰 13.3 : 1（WCAG AAA 门槛 4.5） | 主题保存时强制校验对比度 ≥ 7 : 1；图片/视频背景加半透明压暗层 + 文字阴影 |
| 字体回退 | Mac 上无 SimHei，系统回退到黑体系字体，效果可接受。Windows 有 SimHei（黑体），应与模版一致 | PPTX 里写 `SimHei`；Google Slides 导入时的映射待验证（Slides 没有 SimHei） |
| 文件体积 | 9 页纯文字 82 KB；含 6 秒 720p 视频 247 KB（视频本体 147 KB，实际素材会是 5–30 MB） | 成品 PPTX 不入库，只存 SlideDeck JSON 按需重生成 |

## 未完成 / 需要 Haoyang 配合

1. 在教会 Windows 电脑的 PowerPoint 打开 `evidence/selah-spike-sample.pptx`，确认字体和字号观感。
2. 把同一文件上传 Google Drive → 用 Google Slides 打开，看字体映射成什么、排版是否保持。
3. 若 Google Slides 是主要目标格式，Phase 2 直接走 Slides API（教会 Google 账号授权一次），而不是 PPTX 转换。
