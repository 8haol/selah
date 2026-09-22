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

## 补充（同日晚）— 视觉主题与媒体去重

- 新增 `themes.mjs`（6 套主题：夜空 / 圣殿 / 深海 / 青草地 / 晨光 / 纸）、`render.mjs`（背景栅格化 + HTML 预览 + PPTX）、`snapshot.mjs`（全尺寸 PNG 样张 + 总览图）。
  样张见 `evidence/themes-contact-sheet.jpg`，PPTX 见 `evidence/selah-themes-sample.pptx`。
- 背景做法：SVG（渐变 + 高斯模糊光晕 + 颗粒 + 暗角）→ sharp 栅格化为 1920×1080 JPEG → 作为每页背景图嵌入。
  pptxgenjs 本身不支持渐变背景，"背景 = 图片"是正确抽象，也天然兼容 Google Slides。
- **pptxgenjs 不去重媒体已证实**：18 页共用 6 张 2.3MB PNG 时 PPTX 达 42MB；换成 40–50KB JPEG 后 1MB。
  生产实现要么后处理合并重复媒体，要么保证背景图 ≤ 100KB。
- 标题页用楷体（Windows `KaiTi`）+ 细金线 + 拼音 + 元信息；歌词页左上角小胶囊段落角标（VERSE 1 / CHORUS）；正文加柔和阴影。
  歌词字号维持 45 / 35 不变。

## 补充 — 动态"流光"背景（同日晚）

- `flow-bg.mjs`：程序化流光渲染器。4D 值噪声 fbm，时间沿噪声空间的一个圆采样，**循环点完全无缝**；
  域扭曲 + 横向拉伸出流动的光带，再叠一层高对比"光丝"。CPU 渲染 384×216，ffmpeg 放大到 1280×720 加柔化和颗粒。
  10 秒 / 24fps 约 12 秒渲染完，MP4 约 1.2MB。样例 `evidence/flow-deep-loop.mp4`。
- `evidence/flow-webgl.html`：同一算法的 WebGL 片元着色器，实时 60fps，零文件体积，配色由 uniform 传入即可随主题切换。
  这是网页演示模式动态背景的实现路径。
- 结论：动态背景自己生成即可，不必购买素材。**网页演示模式是动态背景的最佳载体**；PPTX 只能每页嵌一份视频，
  翻页时视频从头播放会有可见跳变，且需要后处理去重媒体并注入 `<p:timing>` 实现自动循环；Google Slides 无法做循环视频背景。
