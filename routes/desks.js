const axios = require('axios')
const express = require('express')
const security = require('./security.js')
const utils = require('./utils.js')
var config
const embrava = { prefix: 'h' }
const installDate = Date.UTC(2021, 8, 15, 19, 0, 0) // Sept 15
exports.init = async function (app) {
    config = app.get('config')
    // config.davra.url = 'https://10.0.32.121'
    // config.davra.token = 'jSJhuyjo8FMfxpruFlJacQh5lZR0qIgKHzLik5edB6NRsgOM'
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
    app.get('/desk/convert', async (req, res) => {
        deskConvert()
        return res.send({ success: true, message: 'Desk convert started' })
    })
    app.get('/desk/setup', async (req, res) => {
        deskSetup()
        return res.send({ success: true, message: 'Desk setup started' })
    })
    app.get('/desk/status/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const data = await deskStatus(id)
        res.send({ success: true, data: data })
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
    const deviceId = embrava.prefix + event.embravaId
    if (event.embravaId === '3206200485') return // this is a duplicate desk
    if (event.state === 'Offline') {
        await utils.sendIotData(config, deviceId, 'desk.outage.count', timestamp, 1, {})
    }
    if (desk.state === event.state) return
    desk.state = event.state
    const incident = (await utils.getStatefulIncidents(config, deviceId, { 'customAttributes.endDate': 0 }))[0]
    if (event.state === 'Offline') {
        if (!desk.disconnectTime) {
            desk.disconnectTime = timestamp
            if (!incident) {
                const labels = { status: 'open', type: 'desk', id: deviceId }
                const customAttributes = { floor: '2', startDate: timestamp, endDate: 0 }
                await utils.addStatefulIncident(config, 'Desk outage', 'Outage ' + 'Desk_' + desk.deskName, labels, customAttributes)
            }
        }
        return
    }
    // any state other than Offline means a reconnect
    if (!desk.disconnectTime) return // ignore connect without a previous disconnect
    const startDate = desk.disconnectTime
    const endDate = timestamp
    var duration = endDate - startDate
    desk.disconnectTime = 0
    if (duration === 0) return
    console.log('Desk outage:', startDate, deviceId, startDate, endDate, duration)
    if (incident) {
        const body = { customAttributes: incident.customAttributes }
        body.customAttributes.endDate = endDate
        await utils.changeStatefulIncident(config, incident.UUID, body)
    }
    if (!await utils.sendIotData(config, deviceId, 'desk.outage', startDate, duration, {
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
        console.log('Desk outage timeslice:', deviceId, bucketDate, timeslice)
        if (!await utils.sendIotData(config, deviceId, 'desk.outage.timeslice', bucketDate, timeslice, {
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
    const deviceId = embrava.prefix + event.embravaId
    if (event.state === 'Checked In') {
        await utils.sendIotData(config, deviceId, 'desk.usage.count', timestamp, 1, {})
    }
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
    console.log('Desk usage:', desk.checkinTime, deviceId, startDate, endDate, duration)
    if (!await utils.sendIotData(config, deviceId, 'desk.usage', startDate, duration, {
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
        console.log('Desk usage timeslice:', deviceId, bucketDate, timeslice)
        if (!await utils.sendIotData(config, deviceId, 'desk.usage.timeslice', bucketDate, timeslice, {
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
    embrava.devices = {}
    var count = 0
    for (const desk of await deskList()) {
        embrava.desks[desk.embravaId] = desk
        if (desk.state === 'Offline') {
            console.log('Desk offline:', desk.deskName)
            count++
        }
    }
    console.log('Desks offline:', count)
    for (const device of await utils.deviceList(config, 'desk')) {
        embrava.devices[device.serialNumber.substr(1)] = device
    }
}
async function deskSetup () {
    // converts desk.outage to stateful incidents, one time job
    console.log('deskSetup running...')
    const counts = { added: 0, changed: 0 }
    var data, result
    for (const desk of await deskList()) {
        const deviceId = embrava.prefix + desk.embravaId
        const deviceName = 'Desk_' + desk.deskName
        result = await utils.getStatefulIncidents(config, deviceId, { 'customAttributes.createdBy': 'setup' })
        if (result.length > 0) continue // device already setup
        data = {
            metrics: [
                {
                    name: 'desk.outage',
                    tags: {
                        serialNumber: deviceId
                    }
                }
            ],
            start_absolute: installDate
        }
        result = await utils.getTimeseriesData(config, data)
        const outages = (result && result.queries[0].results[0].values) || []
        data = {
            metrics: [
                {
                    name: 'desk.outage.count',
                    tags: {
                        serialNumber: deviceId
                    }
                }
            ],
            start_absolute: installDate
        }
        result = await utils.getTimeseriesData(config, data)
        const outageCounts = (result && result.queries[0].results[0].values) || []
        // if offline now, add one open stateful incident to cover from the start, ongoing
        // start is the date of the first outage count, defaulting to the installDate
        var startDate = installDate
        if (outageCounts.length) startDate = outageCounts[0][0]
        if (desk.state === 'Offline') {
            const labels = { status: 'open', type: 'desk', id: deviceId }
            const customAttributes = { createdBy: 'setup', floor: '2', startDate: startDate, endDate: 0 }
            console.log('deskSetup sending open stateful incident:', deviceId, deviceName)
            await utils.addStatefulIncident(config, 'Desk outage', 'Outage ' + deviceName, labels, customAttributes)
            counts.added++
        }
        // add closed stateful incident for each outage
        for (const outage of outages) {
            const labels = { status: 'closed', type: 'desk', id: deviceId }
            // set endDate to start plus duration
            const customAttributes = { createdBy: 'setup', floor: '2', startDate: outage[0], endDate: (outage[0] + outage[1]) }
            console.log('deskSetup sending closed stateful incident:', deviceId, deviceName)
            await utils.addStatefulIncident(config, 'Desk outage', 'Outage ' + deviceName, labels, customAttributes)
            counts.added++
        }
    }
    console.log('deskSetup stateful incident totals:', counts)
    return counts
}
async function deskStatus (id) {
    console.log('Desk ID:', id)
    if (id.startsWith(embrava.prefix)) id = id.substr(1)
    const desk = embrava.desks ? embrava.desks[id] : null
    const device = embrava.devices ? embrava.devices[id] : null
    const status = desk ? desk.state : 'Offline'
    const address = device ? device.customTags.address || [] : []
    return { status: status, address: address }
}
async function deskSync () {
    console.log('deskSync running...')
    const counts = { added: 0, changed: 0 }
    const devices = {}
    for (const device of await utils.deviceList(config, 'desk')) {
        devices[device.serialNumber] = device
    }
    for (const desk of await deskList()) {
        const deviceId = embrava.prefix + desk.embravaId
        // const deskName = desk.neighborhood + ' ' + desk.embravaId
        const deviceName = 'Desk_' + desk.deskName
        const floor = desk.deskName.substr(2, 1)
        const address = [desk.neighborhood, 'Floor ' + floor]
        const device = devices[deviceId]
        if (device) {
            var doc = {}
            if (device.name !== deviceName) doc.name = deviceName
            if (device.serialNumber !== deviceId) doc.serialNumber = deviceId
            if (!device.labels || !device.labels.type || !device.labels.floor) doc.labels = { type: 'desk', floor: floor }
            if (!device.customTags || !device.customTags.address) doc.customTags = { address: address }
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
                        serialNumber: deviceId,
                        name: deviceName,
                        labels: { type: 'desk', floor: floor },
                        customTags: { address: address }
                    }
                })
                counts.added++
                console.log('deskSync added:', deviceId, deviceName)
            }
            catch (err) {
                console.error('deskSync error:', err)
            }
        }
    }
    console.log('deskSync totals:', counts)
    return counts
}
async function deskConvert () {
    // converts desk.usage.timeslice to desk.usage.count metrics, one time job
    var result
    for (const desk of await deskList()) {
        const deviceId = embrava.prefix + desk.embravaId
        const data = {
            metrics: [
                {
                    name: 'desk.usage.timeslice',
                    tags: {
                        serialNumber: deviceId
                    }
                }
            ],
            start_absolute: installDate
        }
        result = await utils.getTimeseriesData(config, data)
        const timeslices = (result && result.queries[0].results[0].values) || []
        const array = []
        for (const value of timeslices) {
            var count = Math.ceil(value[1] / 60000)
            array.push({
                UUID: deviceId,
                timestamp: value[0],
                name: 'desk.usage.count',
                value: count,
                msg_type: 'datum',
                tags: {}
            })
        }
        if (array.length) {
            console.log('deskConvert:', deviceId, array.length)
            await utils.sendIotDataArray(config, array)
        }
    }
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
