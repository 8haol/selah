import JSZip from 'jszip'

/**
 * PowerPoint's own "start automatically / loop until stopped / muted / hide while
 * not playing" timing tree, as PowerPoint 365 writes it. `{SPID}` is the
 * `<p:cNvPr id>` of the `<p:pic>` holding the video; `{DUR}` is its length in ms.
 */
const TIMING = `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="withEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="6" dur="{DUR}" fill="hold"/><p:tgtEl><p:spTgt spid="{SPID}"/></p:tgtEl></p:cBhvr></p:cmd></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq><p:video><p:cMediaNode vol="0" mute="1" showWhenStopped="0"><p:cTn id="7" repeatCount="indefinite" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:endCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst></p:cTn><p:tgtEl><p:spTgt spid="{SPID}"/></p:tgtEl></p:cMediaNode></p:video></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`

const SLIDE_RE = /^ppt\/slides\/slide\d+\.xml$/
const RELS_RE = /^ppt\/.*_rels\/.+\.rels$/
const MEDIA_IMAGE_RE = /^ppt\/media\/.+\.(png|jpg|jpeg|gif)$/i

/** The `<p:cNvPr id>` of the `<p:pic>` that carries the embedded video, if any. */
function videoShapeId(slideXml: string): number | null {
  for (const pic of slideXml.match(/<p:pic>[\s\S]*?<\/p:pic>/g) ?? []) {
    if (!pic.includes('<a:videoFile')) continue
    const id = pic.match(/<p:cNvPr\s+id="(\d+)"/)
    if (id) return Number(id[1])
  }
  return null
}

/**
 * Collapse the media pptxgenjs duplicates. It stores a private copy of every
 * `addMedia` mp4 and of every background image, once per slide, so a deck would
 * otherwise be ~N× larger than it needs to be.
 *
 * Every slide ends up pointing at the single kept mp4, and byte-identical
 * images collapse onto their first copy.
 */
export async function dedupeMedia(zip: JSZip): Promise<void> {
  const names = Object.keys(zip.files)
  const rename = new Map<string, string>()

  // one mp4 for the whole deck
  const videos = names.filter((n) => /^ppt\/media\/.+\.mp4$/i.test(n)).sort()
  const keptVideo = videos[0]
  if (keptVideo) for (const name of videos.slice(1)) rename.set(name, keptVideo)

  // one copy of each distinct poster / background image
  const firstByContent = new Map<string, string>()
  for (const name of names.filter((n) => MEDIA_IMAGE_RE.test(n)).sort()) {
    const content = await zip.file(name)!.async('base64')
    const first = firstByContent.get(content)
    if (first === undefined) firstByContent.set(content, name)
    else rename.set(name, first)
  }
  if (rename.size === 0) return

  // every .rels under ppt/, not just the slides', so nothing is left pointing at a removed part
  for (const relsName of names.filter((n) => RELS_RE.test(n))) {
    const rels = await zip.file(relsName)!.async('string')
    let next = rels
    for (const [from, to] of rename) {
      next = next.split(`Target="../media/${from.slice('ppt/media/'.length)}"`).join(`Target="../media/${to.slice('ppt/media/'.length)}"`)
    }
    if (next !== rels) zip.file(relsName, next)
  }
  for (const name of rename.keys()) zip.remove(name)
}

/**
 * Give every slide holding a video the PowerPoint timing tree that starts it
 * automatically, loops it until the slide is left, mutes it and hides it when
 * stopped. pptxgenjs writes no timing at all, so the clip would need a click.
 */
export async function injectVideoTiming(zip: JSZip, durationMs: number): Promise<void> {
  for (const slideName of Object.keys(zip.files).filter((n) => SLIDE_RE.test(n))) {
    const xml = await zip.file(slideName)!.async('string')
    const spid = videoShapeId(xml)
    if (spid === null) continue
    const timing = TIMING.replaceAll('{SPID}', String(spid)).replaceAll('{DUR}', String(durationMs))
    const stripped = xml.replace(/<p:timing>[\s\S]*?<\/p:timing>/, '')
    zip.file(slideName, stripped.replace('</p:sld>', `${timing}</p:sld>`))
  }
}
