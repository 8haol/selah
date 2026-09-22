// Dump the parts of a PPTX that matter for the spike: media files, and the
// XML of any slide containing a video (to see what pptxgenjs emits for
// timing/autoplay so we know what to patch).
import fs from 'node:fs'
import JSZip from 'jszip'

const file = process.argv[2] ?? 'out/spike.pptx'
const zip = await JSZip.loadAsync(fs.readFileSync(file))

console.log('== media parts ==')
for (const name of Object.keys(zip.files).filter((n) => n.startsWith('ppt/media/') && !zip.files[n].dir)) {
  const buf = await zip.file(name).async('nodebuffer')
  console.log(`${name}  ${(buf.length / 1024).toFixed(0)} KB`)
}

console.log('\n== slides with video ==')
for (const name of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
  const xml = await zip.file(name).async('string')
  if (!xml.includes('videoFile') && !xml.includes('<p:timing')) continue
  console.log(`\n--- ${name} (${xml.length} chars) ---`)
  const pic = xml.match(/<p:pic>[\s\S]*?<\/p:pic>/)?.[0]
  if (pic) console.log('[p:pic]\n' + pic.replace(/></g, '>\n<').slice(0, 2500))
  const timing = xml.match(/<p:timing>[\s\S]*?<\/p:timing>/)?.[0]
  console.log(timing ? '[p:timing]\n' + timing.replace(/></g, '>\n<') : '[p:timing] NONE')
  const rels = await zip.file(name.replace('slides/', 'slides/_rels/') + '.rels').async('string')
  console.log('[rels]\n' + rels.replace(/></g, '>\n<'))
}
