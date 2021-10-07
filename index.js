process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const axios = require('axios')
const express = require('express')
const fs = require('fs')
const path = require('path')
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
    require('./routes/security.js').init(app) // initialise security first
    require('./routes/desks.js').init(app)
    require('./routes/doors.js').init(app)
    require('./routes/hayyaks.js').init(app)
    require('./routes/signs.js').init(app)
}).catch(function (err) {
    console.error('Runtime config error:', err)
    process.exit(1)
})
process.on('unhandledRejection', (err, promise) => {
    console.error('**************************************************************')
    console.error('****************** Unhandled rejection ***********************')
    console.error('**************************************************************')
    console.error('Reason: ', err)
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
// intervals.doorUsage = setInterval(doors.doorUsage, 10 * 1000)
// doors.doorUsage()
// doors.doorCreate()
