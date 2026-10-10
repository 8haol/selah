import { slideText, type DeckEdits, type Slide } from '@selah/slide-engine'

/**
 * The 总览's operations on a setlist's slide edits. Each takes a slide as
 * `applyDeckEdits` returned it (so it carries `key` and `edit`) and returns the
 * edits to save; the input is never changed.
 */

const addedId = (key: string) => (key.startsWith('add/') ? key.slice(4) : null)

/** The text the generated slide showed: what a removal or rewrite is made against. */
function originalText(edits: DeckEdits, slide: Slide): string {
  return edits.rewritten?.find((r) => r.key === slide.key)?.was ?? slideText(slide).join('\n')
}

export function removeSlide(edits: DeckEdits, slide: Slide): DeckEdits {
  const id = addedId(slide.key!)
  if (id) {
    // slides added after this one move up to where it was
    const gone = edits.added?.find((a) => a.id === id)
    return {
      ...edits,
      added: (edits.added ?? []).filter((a) => a.id !== id).map((a) => (a.after === slide.key ? { ...a, after: gone?.after ?? '' } : a)),
    }
  }
  const removed = (edits.removed ?? []).filter((r) => r.key !== slide.key)
  return { ...edits, removed: [...removed, { key: slide.key!, was: originalText(edits, slide) }] }
}

export function restoreSlide(edits: DeckEdits, slide: Slide): DeckEdits {
  return { ...edits, removed: (edits.removed ?? []).filter((r) => r.key !== slide.key) }
}

/** New text for a slide. Writing back exactly what the song says drops the rewrite. */
export function rewriteSlide(edits: DeckEdits, slide: Slide, lines: string[]): DeckEdits {
  const id = addedId(slide.key!)
  if (id) return { ...edits, added: (edits.added ?? []).map((a) => (a.id === id ? { ...a, lines } : a)) }
  const was = originalText(edits, slide)
  const rewritten = (edits.rewritten ?? []).filter((r) => r.key !== slide.key)
  return { ...edits, rewritten: lines.join('\n') === was ? rewritten : [...rewritten, { key: slide.key!, was, lines }] }
}

/** Back to the song's own text. */
export function revertSlide(edits: DeckEdits, slide: Slide): DeckEdits {
  return { ...edits, rewritten: (edits.rewritten ?? []).filter((r) => r.key !== slide.key) }
}

/** A free-text slide right after `after` (a slide key, or '' for the very start). */
export function addSlide(edits: DeckEdits, after: string, lines: string[], id: string): DeckEdits {
  // whatever followed that slide now follows the new one
  const moved = (edits.added ?? []).map((a) => (a.after === after ? { ...a, after: `add/${id}` } : a))
  return { ...edits, added: [...moved, { id, after, lines }] }
}

export function editCount(edits: DeckEdits | undefined): number {
  return (edits?.removed?.length ?? 0) + (edits?.rewritten?.length ?? 0) + (edits?.added?.length ?? 0)
}
