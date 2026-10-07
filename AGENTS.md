# Working in this repo

This repository is public and doubles as a portfolio. Keep the history clean and professional.

## Default behaviour

The owner describes what they want in plain words and will not mention branches, commits or PRs. Apply everything below automatically to every request that changes files, without being asked:

- Analyse the request first: restate the goal, list the files involved, and ask only if something is genuinely ambiguous.
- Pick the branch type and name yourself. Unrelated requests in one message get separate branches and PRs.
- Finish by opening the PR and replying with its link and a short summary in the owner's language.
- Do not merge. Merging to `main` deploys the live site, so the owner merges once CI is green (or explicitly asks you to).
- If a push fails with "Repository not found", the GitHub CLI is on the wrong account: run `gh auth switch -u 8haol` first.

## Flow for every change

1. Start from an up-to-date `main`: `git switch main && git pull`.
2. Branch: `<type>/<short-kebab-description>`, e.g. `feat/retell-voice`, `fix/hero-mobile-layout`.
3. Commit in small, single-purpose steps (format below).
4. Before pushing, run `pnpm typecheck && pnpm test && pnpm --filter @selah/web lint && pnpm --filter @selah/web build`. Do not push red.
5. Push the branch and open a PR with `gh pr create`, filling in the template.
6. Merge only after CI passes, with "Squash and merge"; the branch is deleted automatically.

`main` is protected: no direct pushes, no force pushes, and the `verify` CI job must pass. Never try to bypass it.

## Commits and PR titles

[Conventional Commits](https://www.conventionalcommits.org/), in English, imperative mood, ≤ 72 characters:

```
feat(web): drag to reorder songs in a setlist
fix(engine): keep pinyin aligned when a line wraps
refactor(engine): split layout into measure and place
docs: add screenshots to README
chore(deps): bump pptxgenjs to 4.1
```

Types: `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `chore`, `ci`. One logical change per commit; if the message needs "and", split it. Add a body only to explain *why*.

## Identity

Commits are authored as `Haoyang Li <188928838+8haol@users.noreply.github.com>` (set in this clone's git config; set it again after a fresh clone). Do not add `Co-Authored-By` trailers or "Generated with" lines to commits or PRs.

## Never commit

- Secrets or `.env*` files.
- Internal URLs, employer data, or real people's personal details.
- New copyrighted lyrics: for new tests and fixtures use public-domain text (e.g. 和合本 Psalms, "Amazing Grace").
- Debug leftovers: `console.log`, commented-out blocks, scratch files.
- Generated output (`.next/`, `*.tsbuildinfo`, generated `.pptx` decks) or large binaries beyond the images the site needs.
