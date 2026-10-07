# Selah

**Worship slides for Chinese-speaking churches.** Type or photograph a song's lyrics, pick an arrangement (`V1 C V2 C B C`) and a theme, and download a PowerPoint deck. Every Chinese character in the deck has its pinyin aligned above it, and the type is sized to stay readable from the back row.

Live: **https://selah-8haol.vercel.app** (no login)

> Selah (סֶלָה): the word in the Psalms that tells the musicians to pause and lift.

## Why it exists

Selah was built for a Mandarin-speaking congregation in London, where lyric slides were made by hand in PowerPoint to a fixed template: pinyin over every character (Arial 35), Chinese in a heavy sans (45), and readable contrast on the projector. Selah encodes that template once. Songs live in a shared library, and a setlist is regenerated in one click when the arrangement changes.

## What's interesting in here

- **Per-character pinyin layout engine** — [`packages/slide-engine`](packages/slide-engine). This is a framework-free TypeScript package covered by 100+ tests.
  - It turns lyrics, a flow and a theme into a deck model ([`deck.ts`](packages/slide-engine/src/deck.ts)), then lays out lines so each character's pinyin sits exactly over it ([`layout.ts`](packages/slide-engine/src/layout.ts)).
  - Text auto-scales to fill the slide without overflowing.
  - Pinyin readings are corrected for words that church texts pronounce differently from the dictionary, such as 祢 ([`pinyin.ts`](packages/slide-engine/src/pinyin.ts)).
- **PPTX that PowerPoint actually likes** — [`pptx.ts`](packages/slide-engine/src/pptx.ts) and [`pptx-post.ts`](packages/slide-engine/src/pptx-post.ts).
  - Decks are generated with pptxgenjs.
  - The output is then post-processed at the XML level. This deduplicates shared media and injects PowerPoint's own autoplay/loop timing tree, so the video backgrounds loop on their own.
  - The findings behind these choices are in the [Phase 0 spike](spikes/pptx-pinyin/FINDINGS.md).
- **Contrast-checked themes** — [`contrast.ts`](packages/slide-engine/src/contrast.ts) and [`themes.ts`](packages/slide-engine/src/themes.ts). There are 17 themes: 12 still and 5 looping video. The backgrounds are rendered procedurally by [`build-backgrounds.mjs`](packages/slide-engine/scripts/build-backgrounds.mjs), and every theme is checked against a contrast floor.
- **Sheet-music recognition** — [`apps/web/app/api/worship/recognize`](apps/web/app/api/worship/recognize/route.ts). Photograph a score (staff or numbered notation) and a vision model returns the title, sections and the sung order with repeats expanded, validated against a zod schema.
- **Zero-setup local dev** — Postgres via Neon in production and PGlite in-process locally, both behind Drizzle ([`apps/web/db`](apps/web/db)). `pnpm dev` needs no database.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · Neon Postgres / PGlite · pptxgenjs · pinyin-pro · Vercel AI SDK · Vitest · pnpm workspaces

```
apps/web               Next.js app: song library, editor, setlists, export
packages/slide-engine  pure TS: lyrics parsing, flow, pinyin, layout, themes, PPTX
spikes/pptx-pinyin     Phase 0 experiments and findings
```

## Run it

```bash
pnpm install
pnpm --filter @selah/web db:seed   # optional: one sample song
pnpm dev                           # http://localhost:3000/worship
pnpm test                          # all workspaces
pnpm typecheck
```

With `DATABASE_URL` empty, data lives in `apps/web/.data/pglite/`. Sheet recognition needs `OPENAI_API_KEY`; everything else works without it.

### Deploy (Vercel + Neon)

1. Import the repo in Vercel, set Root Directory to `apps/web`, framework Next.js.
2. Add Neon Postgres under Storage; Vercel injects `DATABASE_URL`.
3. Set `SELAH_AUTO_MIGRATE=1` for the first deploy so tables are created.

## 中文简介

教会工具平台，第一个模块是敬拜歌词投影生成器：录入或拍照识别歌词，选 flow 和主题，一键生成逐字带拼音、字号和对比度都达标的 PPTX。歌曲进库可复用，免登录。

## License

Code: [MIT](LICENSE). Song lyrics used as sample data and in tests belong to their respective copyright holders and are included only to exercise the software.
