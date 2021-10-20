const axios = require('axios')
const express = require('express')
const security = require('./security.js')
const utils = require('./utils.js')
// const uuidv4 = require('uuid/v4')
var config
const embrava = { prefix: 'h' }
exports.init = async function (app) {
    config = app.get('config')
    app.post('/api/embrava/event', express.json(), async (req, res) => {
        const body = req.body
        console.log('embrava event received:', JSON.stringify(body))
        return res.send({ success: true, message: 'Received OK' })
    })
    app.get('/desk/capability/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const data = await deskCapability(id)
        if (data) return res.send({ success: true, data: data })
        res.send({ success: false, message: 'Desk capability error' })
    })
    app.get('/desk/status/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const status = await deskStatus(id)
        res.send({ success: true, status: status })
    })
    app.get('/desk/sync', async (req, res) => {
        const count = await deskSync()
        return res.send({ success: true, data: count })
    })
    app.get('/desk/usage/start', async (req, res) => {
        deskUsageStart()
        res.send({ success: true, message: 'Desk usage started' })
    })
    app.get('/desk/usage/stop', async (req, res) => {
        deskUsageStop()
        console.log('Desk usage stopping...')
        res.send({ success: true, message: 'Desk usage stopping...' })
    })
    await deskRefresh()
    if (config.davra.env === 'live') deskUsageStart()
}
// function getUserId (req, config) {
//     var userId = req.headers['x-user-id'] || ''
//     if (!userId && config.davra.env === 'dev') userId = 'admin' // default to admin for testing
//     return userId
// }
async function deskCapability (id) {
    console.log('Desk ID:', id)
    if (id.startsWith(embrava.prefix)) id = id.substr(1)
    try {
        const response = await axios({
            method: 'post',
            url: 'http://aspnetappswave.azurewebsites.net/WorkSpaceHook',
            headers: {
                secret: 'vDHxfe7eYLyYRklQpMQH99'
            },
            data: { DeskSignId: id }
        })
        if (!response.data) return null
        return response.data
    }
    catch (err) {
        console.error('Desk capabilities error:', err)
        return null
    }
}
async function deskConnect (desk, event, timestamp) {
    if (event.state === 'Offline') {
        await utils.sendIotData(config, embrava.prefix + event.embravaId, 'desk.outage.count', timestamp, 1, {})
    }
    if (desk.state === event.state) return
    if (event.state === 'Offline') {
        if (!desk.disconnectTime) {
            desk.disconnectTime = timestamp
            desk.state = event.state
        }
        return
    }
    // any state other than Offline means a reconnect
    desk.state = event.state
    if (!desk.disconnectTime) return // ignore connect without a previous disconnect
    const startDate = desk.disconnectTime
    const endDate = timestamp
    var duration = endDate - startDate
    desk.disconnectTime = 0
    if (duration === 0) return
    console.log('Desk outage:', desk.disconnectTime, event.embravaId, startDate, endDate, duration)
    if (!await utils.sendIotData(config, embrava.prefix + event.embravaId, 'desk.outage', startDate, duration, {
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
        console.log('Desk outage timeslice:', event.embravaId, bucketDate, timeslice)
        if (!await utils.sendIotData(config, embrava.prefix + event.embravaId, 'desk.outage.timeslice', bucketDate, timeslice, {
            // eventTypeId: event.event_type_id.code,
            // eventTypeName: eventType.name
        })) {
            return
        }
        duration -= timeslice
        bucketDate += bucket
    }
}
async function deskCheckin (desk, event, timestamp) {
    if (desk.state === event.state) return
    if (event.state === 'Checked In') {
        if (!desk.checkinTime) {
            desk.checkinTime = timestamp
            desk.state = event.state
        }
        return
    }
    // any state other than Checked In means a checkout
    desk.state = event.state
    if (!desk.checkinTime) return // ignore checkout without a previous checkin
    const startDate = desk.checkinTime
    const endDate = timestamp
    var duration = endDate - startDate
    desk.checkinTime = 0
    if (duration === 0) return
    console.log('Desk usage:', desk.checkinTime, event.embravaId, startDate, endDate, duration)
    if (!await utils.sendIotData(config, embrava.prefix + event.embravaId, 'desk.usage', startDate, duration, {
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
        console.log('Desk usage timeslice:', event.embravaId, bucketDate, timeslice)
        if (!await utils.sendIotData(config, embrava.prefix + event.embravaId, 'desk.usage.timeslice', bucketDate, timeslice, {
            // eventTypeId: event.event_type_id.code,
            // eventTypeName: eventType.name
        })) {
            return
        }
        duration -= timeslice
        bucketDate += bucket
    }
}
async function deskList () {
    console.log('deskList running...')
    const token = await security.getEmbravaToken()
    try {
        const response = await axios({
            method: 'get',
            url: config.embrava.url + '/api/device/devices?page=1&perPage=2000&embravaId=&state=&area=&firmware=&orderByDeviceName=&orderByDeviceId=',
            headers: {
                Authorization: 'Bearer ' + token
            }
        })
        if (!response.data || !response.data.status) {
            console.error('No desks returned')
            return []
        }
        console.log('Desks:', response.data.result.devices.length)
        return response.data.result.devices
    }
    catch (err) {
        console.error('Desk list error:', err)
    }
}
async function deskRefresh () {
    embrava.desks = {}
    for (const desk of await deskList()) {
        embrava.desks[desk.embravaId] = desk
    }
}
async function deskStatus (id) {
    console.log('Desk ID:', id)
    if (id.startsWith(embrava.prefix)) id = id.substr(1)
    const desk = embrava.desks ? embrava.desks[id] : null
    const status = desk ? desk.state : 'Offline'
    return status
}
async function deskSync () {
    console.log('deskSync running...')
    var counts = { added: 0, changed: 0 }
    const devices = {}
    for (const device of await utils.deviceList(config, 'desk')) {
        devices[device.serialNumber] = device
    }
    for (const desk of await deskList()) {
        const deskId = embrava.prefix + desk.embravaId
        const deskName = desk.neighborhood + ' ' + desk.embravaId
        const device = devices[deskId]
        if (device) {
            var doc = {}
            if (device.name !== deskName) doc.name = deskName
            if (device.serialNumber !== deskId) doc.serialNumber = deskId
            if (!device.labels || !device.labels.type) doc.labels = { type: 'desk' }
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
                    console.log('deskSync changed:', device.UUID, device.serialNumber, doc)
                }
                catch (err) {
                    console.error('deskSync error:', err)
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
                        serialNumber: deskId,
                        name: deskName,
                        labels: { type: 'desk' }
                    }
                })
                counts.added++
                console.log('deskSync added:', deskId, deskName)
            }
            catch (err) {
                console.error('deskSync error:', err)
            }
        }
    }
    console.log('deskSync totals:', counts)
    return counts
}
async function deskUsageStart () {
    embrava.stop = false
    deskUsage()
    return true
}
async function deskUsageStop () {
    embrava.stop = true
    return true
}
async function deskUsage () {
    if (embrava.stop) return
    console.log('deskUsage running...')
    var count = 0
    // if (!embrava.hooks) await hookList()
    // if (!embrava.eventTypes) {
    //     embrava.eventTypes = {}
    //     for (const eventType of await eventTypeList()) {
    //         embrava.eventTypes[eventType.code] = eventType
    //     }
    // }
    // if (!config.embrava.startTime) {
    //     config.embrava.startTime = '2021-01-01T00:00:00.000Z'
    // }
    const timestamp = new Date().getTime()
    for (const event of await eventList()) {
        // if (event.datetime > config.embrava.startTime) config.embrava.startTime = event.datetime
        const desk = embrava.desks[event.embravaId]
        if (!desk) continue
        // runWebhooks(eventType.name, event)
        await deskConnect(desk, event, timestamp)
        await deskCheckin(desk, event, timestamp)
        count++
    }
    console.log('deskUsage total:', count)
    // console.log(path.join(__dirname, '/../config/config.json'))
    // fs.writeFileSync(path.join(__dirname, '/../config/config.json'), JSON.stringify(config, null, 4))
    // updateConfig('embrava.startTime', config.embrava.startTime)
    const interval = config.embrava.deskUsageInterval
    if (interval && !embrava.stop) setTimeout(deskUsage, interval)
    return count
}
async function eventList () {
    // this is currently the same as deskList - we're using this pattern to allow for a real event log in future
    console.log('desk event list running...')
    var list = await deskList()
    return list
}
