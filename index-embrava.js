'use strict'

const http = require('http')
const httpProxy = require('http-proxy')
const prom = require('prom-client')
const port = 8080
const svc = { tenantId: 'pif', microserviceName: 'embrava' }
prom.collectDefaultMetrics()
const proxyCount = new prom.Counter({
    name: 'davra_api_microservice_proxy_count',
    help: 'A count of proxy calls to microservices',
    labelNames: ['tenantId', 'microserviceName', 'method', 'statusCode']
})
const proxyErrorCount = new prom.Counter({
    name: 'davra_api_microservice_proxy_error_count',
    help: 'A count of errors when proxying calls to microservices',
    labelNames: ['tenantId', 'microserviceName']
})
const proxyRequestSize = new prom.Summary({
    name: 'davra_api_microservice_proxy_request_size',
    help: 'A summary of the request sizes for proxy calls to microservices',
    maxAgeSeconds: 900,
    ageBuckets: 4,
    labelNames: ['tenantId', 'microserviceName', 'method', 'statusCode'],
    percentiles: [0.25, 0.50, 0.75, 0.9, 0.95, 0.99]
})
const proxyResponseSize = new prom.Summary({
    name: 'davra_api_microservice_proxy_response_size',
    help: 'A summary of the response sizes for proxy calls to microservices',
    maxAgeSeconds: 900,
    ageBuckets: 4,
    labelNames: ['tenantId', 'microserviceName', 'method', 'statusCode'],
    percentiles: [0.25, 0.50, 0.75, 0.9, 0.95, 0.99]
})
const proxyResponseTime = new prom.Summary({
    name: 'davra_api_microservice_proxy_response_time',
    help: 'A summary of the time taken for the microservice to complete the response',
    maxAgeSeconds: 900,
    ageBuckets: 4,
    percentiles: [0.25, 0.50, 0.75, 0.9, 0.95, 0.99],
    labelNames: ['tenantId', 'microserviceName', 'method', 'statusCode']
})
const proxy = httpProxy.createProxyServer({})
proxy.on('error', function (err, req, res) {
    console.error(err)
    proxyErrorCount.labels(svc.tenantId, svc.microserviceName).inc()
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    })
    res.end('Something went wrong: ' + err)
})
proxy.on('proxyReq', function (proxyReq, req, res, options) {
    req.davraStartTime = Date.now()
    console.log('Embrava request:', req.url)
})
proxy.on('proxyRes', function (proxyRes, req, res) {
    const duration = Date.now() - req.davraStartTime
    proxyResponseTime.labels(svc.tenantId, svc.microserviceName, req.method, res.statusCode).observe(duration)
    proxyCount.labels(svc.tenantId, svc.microserviceName, req.method, res.statusCode).inc()
    proxyRequestSize.labels(svc.tenantId, svc.microserviceName, req.method, res.statusCode).observe(req.socket.bytesRead)
    proxyResponseSize.labels(svc.tenantId, svc.microserviceName, req.method, res.statusCode).observe(req.socket.bytesWritten)
    console.log('Embrava response status:', proxyRes.statusCode, proxyRes.statusMessage)
})
const server = http.createServer(async function (req, res) {
    if (req.method === 'GET' && req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': prom.register.contentType })
        res.end(await prom.register.metrics())
    }
    else if (req.method === 'GET' && req.url === '/favicon.ico') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('')
    }
    else {
        // https://eusfuncapp01.azurewebsites.net/api/Authentication
        // https://pif.davra.com/microservices/wrld3d/api/Authentication
        proxy.web(req, res, {
            changeOrigin: true,
            target: 'https://eusfuncapp01.azurewebsites.net',
            secure: false
        })
    }
})
console.log(`Embrava proxy listening on port ${port}`)
server.listen(port)
