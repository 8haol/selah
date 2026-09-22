# Selah

教会工具平台（Portal）。一个可以不断增加模块的集合地：敬拜、排班、活动、行政……
目前服务 CCIL 国语堂，架构上从第一天起按多教会 / 多组织设计。

> Selah（סֶלָה）：诗篇中给乐师的指示——停、静、扬起。

## 第一个模块：Worship Slides（敬拜歌词投影生成器）

录入歌名和各段歌词 → 选 flow（如 `V1 C V2 C B C`）→ 选主题 →
一键生成全字带拼音（Arial 35）、中文黑体 45、对比度足够的 PPTX。
歌曲进库，下次直接复用；flow 错了改一下重新生成。免登录，打开即用。

## 文档

- 设计文档：[docs/superpowers/specs/2026-09-22-platform-and-worship-slides-design.md](docs/superpowers/specs/2026-09-22-platform-and-worship-slides-design.md)
- Phase 0 技术验证结论：[spikes/pptx-pinyin/FINDINGS.md](spikes/pptx-pinyin/FINDINGS.md)

## 状态

Phase 0 spike 完成，设计文档 v2 待审阅。Phase 1（MVP）待批准后开始。

## 技术栈

Next.js 15 · TypeScript · Tailwind + shadcn/ui · Neon Postgres · Drizzle ORM · Vercel Blob · pptxgenjs · pinyin-pro · Vercel
