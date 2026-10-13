// Pós-build do modo standalone: embute JS, CSS e ícone no HTML e gera um único
// dist-standalone/Nexo.html, que abre com duplo clique (file://), sem servidor.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'

const dir = new URL('../dist-standalone/', import.meta.url)
const read = (rel) => readFileSync(new URL(rel.replace(/^\.\//, ''), dir), 'utf8')
let html = read('index.html')

html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`)
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const code = read(src).replace(/<\/script/gi, '<\\/script')
  return `<script type="module">${code}</script>`
})
const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url))
html = html.replace(/href="[^"]*favicon\.svg"/, `href="data:image/svg+xml;base64,${svg.toString('base64')}"`)
// a mensagem de ajuda do index.html não se aplica a esta versão
html = html.replace(/<div class="boot__help"[\s\S]*?<\/ul>\s*<\/div>/, '<div class="boot__help" role="status"><h1>Carregando o Nexo…</h1></div>')

if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)) throw new Error('Ainda há recursos externos no HTML.')
writeFileSync(new URL('Nexo.html', dir), html)
rmSync(new URL('index.html', dir))
rmSync(new URL('assets/', dir), { recursive: true, force: true })
console.log(`dist-standalone/Nexo.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`)
