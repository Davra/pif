const http = require('http')
const httpProxy = require('http-proxy')
const port = 8080

const proxy = httpProxy.createProxyServer({})
proxy.on('error', function (err, req, res) {
    console.error(err)
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    })
    res.end('Something went wrong: ' + err);
})
proxy.on('proxyReq', function(proxyReq, req, res, options) {
    console.log('Embrava request:', req.url)
})
proxy.on('proxyRes', function (proxyRes, req, res) {
    console.log('Embrava response status:', proxyRes.statusMessage)
})
const server = http.createServer(function(req, res) {
    // https://eusfuncapp01.azurewebsites.net/api/Authentication
    // https://pif.davra.com/microservices/wrld3d/api/Authentication
    proxy.web(req, res, {
        changeOrigin: true,
        target: 'https://eusfuncapp01.azurewebsites.net'
    })
})
console.log(`Embrava proxy listening on port ${port}`)
server.listen(port)
