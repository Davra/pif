process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const axios = require('axios')
// const config = require('./config/config.js')
const express = require('express')
const fs = require('fs')
const path = require('path')
const scripts = require('./utils/scripts')
const security = require('./utils/security')
const app = express()
const port = 8080

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '/config/config.json')))
axios({
    method: 'get',
    url: config.davra.url + '/api/v1/features?name=config',
    headers: {
        Authorization: 'Bearer ' + config.davra.token
    }
}).then(function (response) {
    config.uuid = response.data[0].UUID
    const runtimeConfig = response.data[0].customAttributes
    for (const attr in runtimeConfig) { config[attr] = runtimeConfig[attr] }
    app.set('config', config)
    app.set('security', security)
    security.init(app)
    scripts.init(app)
}).catch(function (err) {
    console.error('Runtime config error: ' + err)
    process.exit(1)
})
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/alerts', async (req, res) => {
    console.log('Alerts')
    try {
        const response = await axios({
            method: 'get',
            url: config.davra.url + '/api/v1/twins?digitalTwinTypeName=stateful_incident&labels.stateful_status=open',
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            }
        })
        res.send({ success: true, alerts: response.data })
    }
    catch (err) {
        console.error('Alerts error: ' + err)
        return res.send({ success: false, message: 'Alerts error' })
    }
})
app.get('/api/webhooks', (req, res) => {
})
app.get('/api/webhooks/:id', (req, res) => {
})
app.delete('/api/webhooks/:id', (req, res) => {
})
app.put('/api/webhooks/:id', (req, res) => {
})
app.post('/api/webhooks', (req, res) => {
})
app.get('/beacon/:id', (req, res) => {
    const id = decodeURIComponent(req.params.id)
    console.log('Beacon ID: ' + id)
    const html = []
    html.push('<html><head></head><body>')
    html.push('<div>Beacon ID: ' + id + '</div>')
    html.push('</body></html>')
    res.set({
        'Content-Type': 'text/html'
    })
    res.send(html.join(''))
})
app.get('/door/create', async (req, res) => {
    const count = await scripts.doorCreate()
    return res.send({ success: true, data: count })
})
app.get('/door/capability/:id', async (req, res) => {
    const id = decodeURIComponent(req.params.id)
    const data = await scripts.doorCapability(id)
    if (data) return res.send({ success: true, data: data })
    res.send({ success: false, message: 'Door capability error' })
})
app.get('/door/status/:id', async (req, res) => {
    const id = decodeURIComponent(req.params.id)
    const status = await scripts.doorStatus(id)
    res.send({ success: true, status: status })
})
app.get('/door/usage/start', async (req, res) => {
    scripts.doorUsageStart()
    res.send({ success: true, message: 'Door usage started' })
})
app.get('/door/usage/stop', async (req, res) => {
    scripts.doorUsageStop()
    res.send({ success: true, message: 'Door usage stopping...' })
})
app.post('/bounce', express.urlencoded({ extended: true }), (req, res) => {
    const bounceString = req.body.bounceString
    const bounce = JSON.parse(bounceString)
    res.set(bounce.headers)
    res.send(bounce.data)
})
app.listen(port, () => {
    console.log(`Davra PIF server listening on port ${port}`)
})
// security.getBioStarSessionId()
// const intervals = {}
// intervals.doorUsage = setInterval(scripts.doorUsage, 10 * 1000)
// scripts.doorUsage()
// scripts.doorCreate()
