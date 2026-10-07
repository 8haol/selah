## What

<!-- One or two sentences: what changes for a visitor or a developer. -->

## Why

<!-- The problem or goal behind it. -->

## How to check

<!-- Pages to open, things to try, screenshots or a short clip for visual changes. -->

## Checklist

- [ ] `pnpm typecheck && pnpm test && pnpm --filter @selah/web lint && pnpm --filter @selah/web build` pass locally
- [ ] Works with `prefers-reduced-motion` and on a phone-width screen (for UI changes)
- [ ] No secrets, personal data or debug leftovers
