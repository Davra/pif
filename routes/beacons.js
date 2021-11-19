const axios = require('axios')
const express = require('express')
const fs = require('fs')
const security = require('./security.js')
const utils = require('./utils.js')
// const uuidv4 = require('uuid/v4')
var config
const beacon = { prefix: 'b', stop: false, timeout: null }
exports.init = async function (app) {
    config = app.get('config')
    app.post('/api/beacon/event', express.json(), async (req, res) => {
        const body = req.body
        console.log('beacon event received:', JSON.stringify(body))
        fs.appendFileSync('beaconEvents.log', JSON.stringify(body) + '\n')
        return res.send({ success: true, message: 'Received OK' })
    })
    app.get('/beacon/capability/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const data = await deviceCapability(id)
        if (data) return res.send({ success: true, data: data })
        res.send({ success: false, message: 'Beacon capability error' })
    })
    app.get('/beacon/status/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const status = await deviceStatus(id)
        res.send({ success: true, status: status })
    })
    app.get('/beacon/sync', async (req, res) => {
        const count = await deviceSync()
        return res.send({ success: true, data: count })
    })
    app.get('/beacon/usage/start', async (req, res) => {
        deviceUsageStart()
        res.send({ success: true, message: 'Beacon usage started' })
    })
    app.get('/beacon/usage/stop', async (req, res) => {
        deviceUsageStop()
        console.log('Beacon usage stopping...')
        res.send({ success: true, message: 'Beacon usage stopping...' })
    })
    // FIX ME!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // await deviceRefresh()
    // if (config.davra.env === 'live') deviceUsageStart()
}
async function deviceCapability (id) {
    console.log('Beacon ID:', id)
    if (id.startsWith(beacon.prefix)) id = id.substr(1)
    try {
        const response = await axios({
            method: 'post',
            url: 'http://aspnetappswave.azurewebsites.net/WorkSpaceHook',
            headers: {
                secret: 'vDHxfe7eYLyYRklQpMQH99'
            },
            data: { BeaconSignId: id }
        })
        if (!response.data) return null
        return response.data
    }
    catch (err) {
        console.error('Beacon capabilities error:', err)
        return null
    }
}
async function deviceConnect (device, event, timestamp) {
    if (event.state === 'Offline') {
        await utils.sendIotData(config, beacon.prefix + event.embravaId, 'beacon.outage.count', timestamp, 1, {})
    }
    if (device.state === event.state) return
    if (event.state === 'Offline') {
        if (!device.disconnectTime) {
            device.disconnectTime = timestamp
            const labels = { status: 'open', type: 'beacon', event: 'outage', id: beacon.prefix + event.embravaId }
            const customAttributes = { floor: '3', startDate: timestamp, endDate: 0 }
            await utils.addStatefulIncident(config, 'Beacon outage', 'Outage ' + 'Beacon_' + device.name, labels, customAttributes)
            device.state = event.state
        }
        return
    }
    // any state other than Offline means a reconnect
    device.state = event.state
    if (!device.disconnectTime) return // ignore connect without a previous disconnect
    const startDate = device.disconnectTime
    const endDate = timestamp
    var duration = endDate - startDate
    device.disconnectTime = 0
    if (duration === 0) return
    console.log('Beacon outage:', device.disconnectTime, event.embravaId, startDate, endDate, duration)
    if (!await utils.sendIotData(config, beacon.prefix + event.embravaId, 'beacon.outage', startDate, duration, {
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
        console.log('Beacon outage timeslice:', event.embravaId, bucketDate, timeslice)
        if (!await utils.sendIotData(config, beacon.prefix + event.embravaId, 'beacon.outage.timeslice', bucketDate, timeslice, {
            // eventTypeId: event.event_type_id.code,
            // eventTypeName: eventType.name
        })) {
            return
        }
        duration -= timeslice
        bucketDate += bucket
    }
}
async function deviceCheckin (device, event, timestamp) {
    if (event.state === 'Checked In') {
        await utils.sendIotData(config, beacon.prefix + event.embravaId, 'beacon.usage.count', timestamp, 1, {})
    }
    if (device.state === event.state) return
    if (event.state === 'Checked In') {
        if (!device.checkinTime) {
            device.checkinTime = timestamp
            device.state = event.state
        }
        return
    }
    // any state other than Checked In means a checkout
    device.state = event.state
    if (!device.checkinTime) return // ignore checkout without a previous checkin
    const startDate = device.checkinTime
    const endDate = timestamp
    var duration = endDate - startDate
    device.checkinTime = 0
    if (duration === 0) return
    console.log('Beacon usage:', device.checkinTime, event.embravaId, startDate, endDate, duration)
    if (!await utils.sendIotData(config, beacon.prefix + event.embravaId, 'beacon.usage', startDate, duration, {
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
        console.log('Beacon usage timeslice:', event.embravaId, bucketDate, timeslice)
        if (!await utils.sendIotData(config, beacon.prefix + event.embravaId, 'beacon.usage.timeslice', bucketDate, timeslice, {
            // eventTypeId: event.event_type_id.code,
            // eventTypeName: eventType.name
        })) {
            return
        }
        duration -= timeslice
        bucketDate += bucket
    }
}
async function deviceList () {
    console.log('beaconList running...')
    const token = await security.getEmbravaToken()
    try {
        const response = await axios({
            method: 'get',
            url: config.beacon.url + '/api/device/devices?page=1&perPage=2000&embravaId=&state=&area=&firmware=&orderByDeviceName=&orderByDeviceId=',
            headers: {
                Authorization: 'Bearer ' + token
            }
        })
        if (!response.data || !response.data.status) {
            console.error('No beacons returned')
            return []
        }
        console.log('Beacons:', response.data.result.devices.length)
        return response.data.result.devices
    }
    catch (err) {
        console.error('Beacon list error:', err)
    }
}
async function deviceRefresh () {
    beacon.devices = {}
    var count = 0
    for (const e of await deviceList()) {
        beacon.devices[e.embravaId] = e
        if (beacon.state === 'Offline') count++
    }
    console.log('Beacons offline:', count)
}
async function deviceStatus (id) {
    console.log('Beacon ID:', id)
    if (id.startsWith(beacon.prefix)) id = id.substr(1)
    const device = beacon.devices ? beacon.devices[id] : null
    const status = device ? device.state : 'Offline'
    return status
}
async function deviceSync () {
    console.log('beaconSync running...')
    const counts = { added: 0, changed: 0 }
    const devices = {}
    for (const device of await utils.deviceList(config, 'beacon')) {
        devices[device.serialNumber] = device
    }
    for (const e of await deviceList()) {
        const deviceId = beacon.prefix + e.embravaId
        const deviceName = 'Beacon_' + e.name
        const device = devices[deviceId]
        if (device) {
            var doc = {}
            if (device.name !== deviceName) doc.name = deviceName
            if (device.serialNumber !== deviceId) doc.serialNumber = deviceId
            if (!device.labels || !device.labels.type) doc.labels = { type: 'beacon' }
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
                    console.log('beaconSync changed:', device.UUID, device.serialNumber, doc)
                }
                catch (err) {
                    console.error('beaconSync error:', err)
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
                        labels: { type: 'beacon' }
                    }
                })
                counts.added++
                console.log('beaconSync added:', deviceId, deviceName)
            }
            catch (err) {
                console.error('beaconSync error:', err)
            }
        }
    }
    console.log('beaconSync totals:', counts)
    return counts
}
async function deviceUsageStart () {
    beacon.stop = false
    if (!beacon.timeout) deviceUsage()
    return true
}
async function deviceUsageStop () {
    beacon.stop = true
    clearTimeout(beacon.timeout)
    beacon.timeout = null
    return true
}
async function deviceUsage () {
    if (beacon.stop) return
    console.log('beaconUsage running...')
    var count = 0
    const timestamp = new Date().getTime()
    for (const event of await eventList()) {
        const device = beacon.devices[event.embravaId]
        if (!device) continue
        await deviceConnect(device, event, timestamp)
        await deviceCheckin(device, event, timestamp)
        count++
    }
    console.log('beaconUsage total:', count)
    const interval = config.beacon.beaconUsageInterval
    if (interval && !beacon.stop) beacon.timeout = setTimeout(deviceUsage, interval)
    return count
}
async function eventList () {
    // this is currently the same as deviceList - we're using this pattern to allow for a real event log in future
    console.log('beacon event list running...')
    var list = await deviceList()
    return list
}
