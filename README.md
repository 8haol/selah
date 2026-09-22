# CCIL SOHO

教会工具平台（Portal）。一个可以不断增加模块的集合地：敬拜、排班、活动、行政……
目前服务 CCIL 国语堂，架构上从第一天起按多教会 / 多组织设计。

## 第一个模块：Worship Slides（敬拜歌词投影生成器）

把歌名和各段歌词录入 → 选 flow（如 `V1 C V2 C B C`）→ 选主题 →
一键生成带拼音、大字号的 PPTX。歌曲进库，下次直接复用，flow 错了改一下重新生成。

## 文档

- 设计文档（架构、选型、数据模型、阶段计划）：
  [docs/superpowers/specs/2026-09-22-platform-and-worship-slides-design.md](docs/superpowers/specs/2026-09-22-platform-and-worship-slides-design.md)

## 状态

设计阶段。代码尚未开始，等设计文档审阅通过后进入 Phase 0（技术 Spike）。

## 计划技术栈

Next.js 15 · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres/Auth/Storage) · Drizzle ORM · pptxgenjs · pinyin-pro · Vercel
