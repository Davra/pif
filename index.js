'use strict'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const axios = require('axios')
const express = require('express')
const path = require('path')
const app = express()
const port = 8080
const baseUrl = 'https://10.0.33.35'
const session = {}
const expiryInterval = 60 * 60 * 1000

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/alerts', async (req, res) => {
    console.log('Alerts')
    try {
        const response = await axios({
            method: 'get',
            url: 'https://pif.davra.com/api/v1/twins?digitalTwinTypeName=stateful_incident&labels.stateful_status=open',
            headers: {
                Authorization: 'Bearer EEgkMVI9hbF1fpYKlcrbCHGlBKcZ6gtSTPML7Ost3mgmABwy'
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
app.get('/door/capability/:id', async (req, res) => {
    const id = decodeURIComponent(req.params.id)
    const data = await getCapability(id, await getSessionId())
    if (data) return res.send({ success: true, data: data })
    return res.send({ success: false, message: 'Door capabilities error' })
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
async function getCapability (id, sessionId) {
    console.log('Door ID: ' + id)
    try {
        const response = await axios({
            method: 'post',
            url: baseUrl + '/api/devices/capability',
            headers: {
                'bs-session-id': sessionId
            },
            data: { DeviceCollection: { rows: [{ id: id }] } }
        })
        if (!response.data || !response.data.DeviceTypeCollection || !response.data.DeviceTypeCollection.rows.length) return null
        return response.data.DeviceTypeCollection.rows[0]
    }
    catch (err) {
        console.error('Door capabilities error: ' + err)
        return null
    }
}
async function renewSession () {
    session.renewCount++
    console.log('Renewing sessionId ', session.sessionId, session.renewCount)
    // use dummy device ID just to extend the session
    await getCapability('*renewSession', session.sessionId)
    var currentTimeMillis = new Date().getTime()
    session.expiryTime = currentTimeMillis + expiryInterval
    session.timeout = setTimeout(renewSession, expiryInterval - 10 * 1000) // allow 10 seconds grace
}
async function getSessionId () {
    if (session.timeout !== undefined) clearTimeout(session.timeout)
    session.timeout = setTimeout(renewSession, expiryInterval - 10 * 1000) // allow 10 seconds grace
    var currentTimeMillis = new Date().getTime()
    if (session.sessionId) {
        // if (currentTimeMillis < (session.expiryTime - (10 * 1000))) {
        if (currentTimeMillis < session.expiryTime) {
            console.log('Reusing sessionId: ' + session.sessionId)
            return session.sessionId
        }
    }
    try {
        const response = await axios({
            method: 'post',
            url: baseUrl + '/api/login',
            data: {
                User: {
                    login_id: 'admin',
                    password: 'admin1234!'
                }
            }
        })
        if (response.status !== 200) {
            console.error('BioStar getSessionId error: ', response.status, JSON.stringify(response.data))
            return null
        }
        session.sessionId = response.headers['bs-session-id']
        session.expiryTime = currentTimeMillis + expiryInterval
        session.renewCount = 0
        console.log('BioStar new sessionId: ' + session.sessionId)
        return session.sessionId
    }
    catch (err) {
        console.error('BioStar getSessionId error: ' + err)
        return null
    }
}
getSessionId()
