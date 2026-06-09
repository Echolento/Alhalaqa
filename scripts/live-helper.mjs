import http from 'node:http'

let currentIntent = null
let currentPickId = 0

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:8400')
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return }

  if (url.pathname === '/intent' && req.method === 'POST') {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      try {
        currentIntent = JSON.parse(body)
        currentIntent.id = ++currentPickId
        currentIntent.timestamp = Date.now()
        console.log('[live] Intent:', currentIntent.intent, 'on', currentIntent.selector)
        res.writeHead(200, cors)
        res.end(JSON.stringify({ ok: true, id: currentPickId }))
      } catch (e) {
        res.writeHead(400, cors)
        res.end(JSON.stringify({ error: 'bad json' }))
      }
    })
    return
  }

  if (url.pathname === '/intent' && req.method === 'GET') {
    res.writeHead(200, cors)
    res.end(JSON.stringify(currentIntent || { empty: true }))
    return
  }

  res.writeHead(404, cors)
  res.end('not found')
})

const PORT = 8400
server.listen(PORT, () => {
  console.log(`[live] Helper on http://localhost:${PORT}`)
})
