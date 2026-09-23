# Selah

教会工具平台（Portal）。一个可以不断增加模块的集合地：敬拜、排班、活动、行政……
目前服务 CCIL 国语堂，架构上从第一天起按多教会 / 多组织设计。

> Selah（סֶלָה）：诗篇中给乐师的指示——停、静、扬起。

## 第一个模块：Worship Slides（敬拜歌词投影生成器）

录入歌名和各段歌词 → 选 flow（如 `V1 C V2 C B C`）→ 选主题 →
一键生成全字带拼音（Arial 35）、中文黑体 45、对比度足够的 PPTX。
歌曲进库，下次直接复用；flow 错了改一下重新生成。免登录，打开即用。

## 线上地址

**https://selah-8haol.vercel.app** — 免登录，打开即用。Phase 1 已上线：17 套主题（12 静态 + 5 动态视频）、逐字拼音对齐、自动放大字号、PPTX 一键下载、歌库与历史版本。

## 文档

- 设计文档：[docs/superpowers/specs/2026-09-22-platform-and-worship-slides-design.md](docs/superpowers/specs/2026-09-22-platform-and-worship-slides-design.md)
- Phase 0 技术验证结论：[spikes/pptx-pinyin/FINDINGS.md](spikes/pptx-pinyin/FINDINGS.md)

## 本地运行

```bash
pnpm install
pnpm --filter @selah/web db:seed   # 可选：写入一首示例歌
pnpm dev                            # http://localhost:3000
```
本地不需要任何数据库：留空 `DATABASE_URL` 时数据存在 `apps/web/.data/pglite/`。

## 部署（Vercel + Neon）

1. Vercel 新建项目，导入 `8haol/selah`，Root Directory 设为 `apps/web`，Framework 选 Next.js。
2. Storage → 添加 Neon Postgres（免费档），Vercel 会自动注入 `DATABASE_URL`。
3. 在 Environment Variables 里加 `SELAH_AUTO_MIGRATE=1`（首次部署自动建表；之后可删）。
4. Deploy。打开域名 → `/worship`。

## 技术栈

Next.js 16 · TypeScript · Tailwind CSS 4 · Neon Postgres (PGlite locally) · Drizzle ORM · pptxgenjs · pinyin-pro · Vercel
