const axios = require('axios')
const express = require('express')
const security = require('./security.js')
const utils = require('./utils.js')
// const uuidv4 = require('uuid/v4')
var config
const appspace = { prefix: 's' }
exports.init = async function (app) {
    config = app.get('config')
    app.post('/api/appspace/event', express.json(), async (req, res) => {
        const body = req.body
        console.log('appspace event received:', JSON.stringify(body))
        return res.send({ success: true, message: 'Received OK' })
    })
    app.get('/sign/capability/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const data = await signCapability(id)
        if (data) return res.send({ success: true, data: data })
        res.send({ success: false, message: 'Sign capability error' })
    })
    app.get('/sign/status/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const data = await signStatus(id)
        if (data) return res.send({ success: true, data: data })
        res.send({ success: false, message: 'Sign status error' })
    })
    app.get('/sign/sync', async (req, res) => {
        const count = await signSync()
        return res.send({ success: true, data: count })
    })
    app.get('/sign/usage/start', async (req, res) => {
        signUsageStart()
        res.send({ success: true, message: 'Sign usage started' })
    })
    app.get('/sign/usage/stop', async (req, res) => {
        signUsageStop()
        console.log('Sign usage stopping...')
        res.send({ success: true, message: 'Sign usage stopping...' })
    })
    await signRefresh()
    if (config.davra.env === 'live') signUsageStart()
}
// function getUserId (req, config) {
//     var userId = req.headers['x-user-id'] || ''
//     if (!userId && config.davra.env === 'dev') userId = 'admin' // default to admin for testing
//     return userId
// }
async function signCapability (id) {
    console.log('Sign ID:', id)
    if (id.startsWith(appspace.prefix)) id = id.substr(1)
    const connection = await security.getAppspaceConnection()
    const result = await connection.execute('SELECT * FROM node N LEFT OUTER JOIN nodeprop NP ON N._id = NP._nodeId WHERE N._id = ?', [id])
    // console.log(result)
    return (result[0] || [])
}
async function signConnect (sign, event, timestamp) {
    if (event.status > 0) {
        await utils.sendIotData(config, appspace.prefix + event._id, 'sign.outage.count', timestamp, 1, {})
    }
    if (sign.status === event.status) return
    sign.status = event.status
    if (event.status > 0) { // status not OK
        if (!sign.disconnectTime) {
            sign.disconnectTime = timestamp
        }
        return
    }
    if (event.status === 0) { // status OK
        if (!sign.disconnectTime) return // ignore connect without a previous disconnect
        const startDate = sign.disconnectTime
        const endDate = timestamp
        var duration = endDate - startDate
        sign.disconnectTime = 0
        if (duration === 0) return
        console.log('Sign outage:', sign.disconnectTime, event._id, startDate, endDate, duration)
        if (!await utils.sendIotData(config, appspace.prefix + event._id, 'sign.outage', startDate, duration, {
            // eventTypeId: event.event_type_id.code,
            // eventTypeName: eventType.name
        })) {
            return
        }
        var bucketDate = new Date(startDate).setUTCMinutes(0, 0, 0) // normalise to hour boundary
        const bucket = 60 * 60 * 1000
        var initialSlice = (bucketDate + bucket) - startDate // millis to next hour boundary
        if (initialSlice > duration) initialSlice = duration
        while (duration > 0) {
            const timeslice = initialSlice || (duration > bucket ? bucket : duration)
            initialSlice = 0
            console.log('Sign outage timeslice:', event._id, bucketDate, timeslice)
            if (!await utils.sendIotData(config, appspace.prefix + event._id, 'sign.outage.timeslice', bucketDate, timeslice, {
                // eventTypeId: event.event_type_id.code,
                // eventTypeName: eventType.name
            })) {
                return
            }
            duration -= timeslice
            bucketDate += bucket
        }
    }
}
async function signList () {
    console.log('signList running...')
    const connection = await security.getAppspaceConnection()
    const result = await connection.execute('SELECT * FROM node N LEFT OUTER JOIN nodestatus NS ON N._id=NS._id LEFT OUTER JOIN appspaceid A ON  N._id=A.ResourceId AND A.ResourceType=2')
    console.log('Signs:', (result[0] || []).length)
    return (result[0] || [])
}
async function signRefresh () {
    appspace.signs = {}
    for (const sign of await signList()) {
        appspace.signs[sign._id] = sign
    }
}
async function signStatus (id) {
    console.log('Sign ID:', id)
    if (id.startsWith(appspace.prefix)) id = id.substr(1)
    const sign = appspace.signs[id]
    // maybe SyncStatus is not needed as it seems to be included in the Status field
    // 0 as status is Sync-Online, 1 is Offline, 2 Online - Out of Sync, 3 is Communication lost
    const data = sign ? { status: sign.Status, sync: sign.SyncStatus } : null
    return data
}
async function signSync () {
    console.log('signSync running...')
    var counts = { added: 0, changed: 0 }
    const devices = {}
    for (const device of await utils.deviceList(config, 'sign')) {
        devices[device.serialNumber] = device
    }
    for (const sign of await signList()) {
        const signId = appspace.prefix + sign._id
        const signName = sign.Name + ' ' + sign._id
        const device = devices[signId]
        if (device) {
            var doc = {}
            if (device.name !== signName) doc.name = signName
            if (device.serialNumber !== signId) doc.serialNumber = signId
            if (!device.labels || !device.labels.type) doc.labels = { type: 'sign' }
            if (Object.keys(doc).length > 0) {
                try {
                    await axios({
                        method: 'put',
                        url: config.davra.url + '/api/v1/devices/' + device.UUID,
                        headers: {
                            Authorization: 'Bearer ' + config.davra.token
                        },
                        data: doc
                    })
                    counts.changed++
                    console.log('signSync changed:', device.UUID, device.serialNumber, doc)
                }
                catch (err) {
                    console.error('signSync error:', err)
                }
            }
        }
        else {
            try {
                await axios({
                    method: 'post',
                    url: config.davra.url + '/api/v1/devices',
                    headers: {
                        Authorization: 'Bearer ' + config.davra.token
                    },
                    data: {
                        serialNumber: signId,
                        name: signName,
                        labels: { type: 'sign' }
                    }
                })
                counts.added++
                console.log('signSync added:', signId, signName)
            }
            catch (err) {
                console.error('signSync error:', err)
            }
        }
    }
    console.log('signSync totals:', counts)
    return counts
}
async function signUsageStart () {
    appspace.stop = false
    signUsage()
    return true
}
async function signUsageStop () {
    appspace.stop = true
    return true
}
async function signUsage () {
    if (appspace.stop) return
    console.log('signUsage running...')
    var count = 0
    // if (!appspace.hooks) await hookList()
    // if (!appspace.eventTypes) {
    //     appspace.eventTypes = {}
    //     for (const eventType of await eventTypeList()) {
    //         appspace.eventTypes[eventType.code] = eventType
    //     }
    // }
    // if (!config.appspace.startTime) {
    //     config.appspace.startTime = '2021-07-01T00:00:00.000Z'
    // }
    const timestamp = new Date().getTime()
    for (const event of await eventList()) {
        // if (event.datetime > config.appspace.startTime) config.appspace.startTime = event.datetime
        const sign = appspace.signs[event._id]
        if (!sign) continue
        // const eventType = appspace.eventTypes[event.event_type_id.code]
        // if (!eventType) continue
        // runWebhooks(eventType.name, event)
        // if (['DELETE_SUCCESS', 'ENROLL_SUCCESS', 'UPDATE_SUCCESS'].indexOf(eventType.name) >= 0) continue
        // if (eventType.name.indexOf('CONNECT') >= 0) { // could be connect or disconnect
        //     // metricName = 'sign.connect'
        //     await signConnect(sign, event, eventType)
        //     continue
        // }
        // if (!await utils.sendIotData(config, appspace.prefix + event._id, 'sign.access', Date.parse(event.datetime), 1, {
        //     eventTypeId: event.event_type_id.code,
        //     eventTypeName: eventType.name
        // })) {
        //     continue
        // }
        await signConnect(sign, event, timestamp)
        count++
        // console.log('signUsage:', event.datetime, event.id, event.event_type_id.code, eventType.name)
    }
    console.log('signUsage total:', count)
    // console.log(path.join(__dirname, '/../config/config.json'))
    // fs.writeFileSync(path.join(__dirname, '/../config/config.json'), JSON.stringify(config, null, 4))
    // updateConfig('appspace.startTime', config.appspace.startTime)
    const interval = config.appspace.signUsageInterval
    if (interval && !appspace.stop) setTimeout(signUsage, interval)
    return count
}
async function eventList () {
    // this is currently the same as signList - we're using this pattern to allow for a real event log in future
    console.log('sign event list running...')
    const connection = await security.getAppspaceConnection()
    const result = await connection.execute('SELECT * FROM node N LEFT OUTER JOIN nodestatus NS ON N._id=NS._id LEFT OUTER JOIN appspaceid A ON  N._id=A.ResourceId AND A.ResourceType=2')
    // console.log(result)
    return (result[0] || [])
}
