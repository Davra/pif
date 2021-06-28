'use strict'

const http = require('http')
const httpProxy = require('http-proxy')
// const prom = require('prom-client')
const port = 8080

const proxy = httpProxy.createProxyServer({})
proxy.on('error', function (err, req, res) {
    console.error(err)
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    })
    res.end('Something went wrong: ' + err)
})
proxy.on('proxyReq', function (proxyReq, req, res, options) {
    console.log('BioStar request:', req.url)
})
proxy.on('proxyRes', function (proxyRes, req, res) {
    console.log('BioStar response status:', proxyRes.statusMessage)
})

/// ////////////////////////////////////////////////////////////////////////////
//
// Davra Secure Proxy for microservices
//
/// ////////////////////////////////////////////////////////////////////////////
/*
var proxy = httpProxy.createProxyServer();

const proxyLookupTime = new prom.Summary({
    name: 'davra_api_microservice_proxy_lookup_time',
    help: 'A summary of the time taken to lookup the microservice route to proxy requests',
    maxAgeSeconds: 900,
    ageBuckets: 4,
    percentiles: [0.25, 0.50, 0.75, 0.9, 0.95, 0.99],
    labelNames: ['tenantId', 'microserviceUUID', 'microserviceName']
});

const proxyResponseTime = new prom.Summary({
    name: 'davra_api_microservice_proxy_response_time',
    help: 'A summary of the time taken for the downstream microservice to complete the response (this does not include the time to lookup the downstream microservice)',
    maxAgeSeconds: 900,
    ageBuckets: 4,
    percentiles: [0.25, 0.50, 0.75, 0.9, 0.95, 0.99],
    labelNames: ['tenantId', 'microserviceUUID', 'microserviceName', 'method', 'statusCode']
});

const proxyCount = new prom.Counter({
    name: 'davra_api_microservice_proxy_count',
    help: 'A count of proxy calls to microservices',
    labelNames: ['tenantId', 'microserviceUUID', 'microserviceName', 'method', 'statusCode']
});

const proxyErrorCount = new prom.Counter({
    name: 'davra_api_microservice_proxy_error_count',
    help: 'A count of errors when proxying calls to microservices',
    labelNames: ['tenantId', 'microserviceUUID', 'microserviceName']
});

const proxyRequestSize = new prom.Summary({
    name: 'davra_api_microservice_proxy_request_size',
    help: 'A summary of the quest sizes for proxy calls to microservices',
    maxAgeSeconds: 900,
    ageBuckets: 4,
    labelNames: ['tenantId', 'microserviceUUID', 'microserviceName', 'method', 'statusCode'],
    percentiles: [0.25, 0.50, 0.75, 0.9, 0.95, 0.99]
});

const proxyResponseSize = new prom.Summary({
    name: 'davra_api_microservice_proxy_response_size',
    help: 'A summary of the response sizes for proxy calls to microservices',
    maxAgeSeconds: 900,
    ageBuckets: 4,
    labelNames: ['tenantId', 'microserviceUUID', 'microserviceName', 'method', 'statusCode'],
    percentiles: [0.25, 0.50, 0.75, 0.9, 0.95, 0.99]
});

function doProxy (req, res, svc, prefix) {
    const startTime = Date.now();

    var target = util.format('http://%s:%d%s', svc.ip, svc.port, req.url);

    var opts = { target: target, ignorePath: true };
    if (req.user) {
        opts.headers = {
            'x-user-id': req.user.id || req.user.UUID,
            'x-user-uuid': req.user.UUID
        };
    }

    // record proxy metrics when response is finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        proxyResponseTime.labels(svc.tenantId, svc.microserviceUUID, svc.microserviceName, req.method, res.statusCode).observe(duration);
        proxyCount.labels(svc.tenantId, svc.microserviceUUID, svc.microserviceName, req.method, res.statusCode).inc();
        proxyRequestSize.labels(svc.tenantId, svc.microserviceUUID, svc.microserviceName, req.method, res.statusCode).observe(req.socket.bytesRead);
        proxyResponseSize.labels(svc.tenantId, svc.microserviceUUID, svc.microserviceName, req.method, res.statusCode).observe(req.socket.bytesWritten);
    });

    proxy.web(req, res, opts, function (err) {
        if (err) {
            console.error(err);
            proxyErrorCount.labels(svc.tenantId, svc.microserviceUUID, svc.microserviceName).inc();
        }
        try {
            res.status(202).json({ status: 'error', message: 'Failed to forward request' });
        } catch (ex) {
            console.error(ex);
        }
    });
}
*/

const server = http.createServer(function (req, res) {
    // https://10.0.33.35/api/login
    proxy.web(req, res, {
        changeOrigin: true,
        target: 'https://10.0.33.35'
    })
})
console.log(`BioStar proxy listening on port ${port}`)
server.listen(port)
