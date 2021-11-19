const axios = require('axios')
const security = require('./security.js')
const utils = require('./utils.js')
var config
const hayyak = { prefix: 'y', stop: false, timeout: null }
const installDate = Date.UTC(2021, 9, 13, 15, 58, 10) // Oct 13
exports.init = async function (app) {
    config = app.get('config')
    app.get('/hayyak/status/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const data = await deviceStatus(id)
        res.send({ success: true, data: data })
    })
    app.get('/hayyak/setup', async (req, res) => {
        deviceSetup()
        return res.send({ success: true, message: 'Hayyak setup started' })
    })
    app.get('/hayyak/sync', async (req, res) => {
        const count = await deviceSync()
        return res.send({ success: true, data: count })
    })
    app.get('/hayyak/usage/start', async (req, res) => {
        deviceUsageStart()
        res.send({ success: true, message: 'Hayyak usage started' })
    })
    app.get('/hayyak/usage/stop', async (req, res) => {
        deviceUsageStop()
        console.log('Hayyak usage stopping...')
        res.send({ success: true, message: 'Hayyak usage stopping...' })
    })
    await deviceRefresh()
    if (config.davra.env === 'live') deviceUsageStart()
}
async function deviceEvent (device, event, timestamp) {
    const deviceId = hayyak.prefix + event.id
    if (event.status === 'Offline') {
        await utils.sendIotData(config, deviceId, 'hayyak.outage.count', timestamp, 1, {})
    }
    else {
        await utils.sendIotData(config, deviceId, 'hayyak.cpu', timestamp, event.cpu, {})
        await utils.sendIotData(config, deviceId, 'hayyak.temp', timestamp, event.temp, {})
        await utils.sendIotData(config, deviceId, 'hayyak.usage', timestamp, event.wakeword, {})
    }
    if (device.status === event.status) return
    device.status = event.status
    const incident = (await utils.getStatefulIncidents(config, deviceId, { 'customAttributes.endDate': 0 }))[0]
    if (event.status === 'Offline') {
        if (!device.disconnectTime) {
            device.disconnectTime = timestamp
            if (!incident) {
                const labels = { status: 'open', type: 'hayyak', event: 'outage', id: deviceId }
                const customAttributes = { floor: '3', startDate: timestamp, endDate: 0 }
                await utils.addStatefulIncident(config, 'Hayyak outage', 'Outage ' + device.name, labels, customAttributes)
            }
        }
        return
    }
    // any status other than Offline means a reconnect
    const startDate = event.lastDisconnectTime
    const endDate = event.lastConnectTime
    var duration = endDate - startDate
    device.disconnectTime = 0
    if (duration === 0) return
    console.log('Hayyak outage:', startDate, deviceId, startDate, endDate, duration)
    if (incident) {
        const body = { customAttributes: incident.customAttributes }
        body.customAttributes.endDate = endDate
        await utils.changeStatefulIncident(config, incident.UUID, body)
    }
    await utils.sendIotData(config, deviceId, 'hayyak.outage', startDate, duration, {})
    var bucketDate = new Date(startDate).setUTCMinutes(0, 0, 0) // normalise to hour boundary
    const bucket = 60 * 60 * 1000
    var initialSlice = (bucketDate + bucket) - startDate // millis to next hour boundary
    if (initialSlice > duration) initialSlice = duration
    while (duration > 0) {
        const timeslice = initialSlice || (duration > bucket ? bucket : duration)
        initialSlice = 0
        console.log('Hayyak outage timeslice:', deviceId, bucketDate, timeslice)
        await utils.sendIotData(config, deviceId, 'hayyak.outage.timeslice', bucketDate, timeslice, {})
        duration -= timeslice
        bucketDate += bucket
    }
}
async function deviceList () {
    console.log('hayyakList running...')
    const token = await security.getHayyakToken()
    try {
        const response = await axios({
            method: 'get',
            url: config.hayyak.url + '/api/customer/' + token.customerId + '/deviceInfos?pageSize=2000&page=0',
            headers: {
                'X-Authorization': 'Bearer ' + token.token
            }
        })
        console.log('Hayyaks:', response.data.data.length)
        const devices = []
        for (const e of response.data.data) {
            const device = { id: e.id.id, name: e.name }
            devices.push(device)
        }
        return devices
    }
    catch (err) {
        console.error('hayyakList error:', err)
    }
}
async function setInfo (obj) {
    console.log('hayyakInfo running for:', obj.id)
    const token = await security.getHayyakToken()
    try {
        const response = await axios({
            method: 'get',
            url: config.hayyak.url + '/api/plugins/telemetry/DEVICE/' + obj.id + '/values/attributes/SERVER_SCOPE',
            headers: {
                'X-Authorization': 'Bearer ' + token.token
            }
        })
        console.log('hayyakInfo:', response.data.length)
        for (const e of response.data) {
            if (e.key === 'inactivityAlarmTime') obj.inactivityAlarmTime = e.value
            else if (e.key === 'lastActivityTime') obj.lastActivityTime = e.value
            else if (e.key === 'active') obj.active = e.value
            else if (e.key === 'lastDisconnectTime') obj.lastDisconnectTime = e.value
            else if (e.key === 'lastConnectTime') obj.lastConnectTime = e.value
            if (obj.lastConnectTime > obj.lastDisconnectTime || !obj.lastDisconnectTime) obj.status = 'Online'
            else obj.status = 'Offline'
        }
        return response.data
    }
    catch (err) {
        console.error('hayyakInfo error:', err)
    }
}
async function setLocation (obj) {
    console.log('hayyakLocation running for:', obj.id)
    const token = await security.getHayyakToken()
    try {
        const response = await axios({
            method: 'get',
            url: config.hayyak.url + '/api/plugins/telemetry/DEVICE/' + obj.id + '/values/attributes/SHARED_SCOPE',
            headers: {
                'X-Authorization': 'Bearer ' + token.token
            }
        })
        console.log('hayyakLocation:', response.data.length)
        obj.location = { floor: '', room: '', roomType: '' }
        for (const e of response.data) {
            if (e.key === 'Floor') obj.location.floor = e.value || ''
            else if (e.key === 'Room') obj.location.room = e.value || ''
            else if (e.key === 'Room type') obj.location.roomType = e.value || ''
        }
        return response.data
    }
    catch (err) {
        console.error('hayyakLocation error:', err)
    }
}
async function setTelemetry (obj) {
    console.log('hayyakTelemetry running for:', obj.id)
    const token = await security.getHayyakToken()
    const end = new Date().getTime()
    const start = end - config.hayyak.usageInterval
    try {
        const response = await axios({
            method: 'get',
            url: config.hayyak.url + '/api/plugins/telemetry/DEVICE/' + obj.id + '/values/timeseries?keys=cpu_usage,temperature,wakeword&startTs=' + start + '&endTs=' + end,
            headers: {
                'X-Authorization': 'Bearer ' + token.token
            }
        })
        obj.cpu = (response.data.cpu_usage && response.data.cpu_usage.length) ? parseFloat(response.data.cpu_usage[0].value) : 0
        obj.temp = (response.data.temperature && response.data.temperature.length) ? parseFloat(response.data.temperature[0].value) : 0
        obj.wakeword = response.data.wakeword ? parseFloat(response.data.wakeword.length) : 0
        console.log('hayyakTelemetry:', obj)
        return response.data
    }
    catch (err) {
        console.error('hayyakTelemetry error:', err)
    }
}
async function deviceRefresh () {
    hayyak.devices = {}
    var count = 0
    for (const e of await deviceList()) {
        hayyak.devices[e.id] = e
        await setInfo(e)
        await setLocation(e)
        // await setTelemetry(device)
        if (e.status === 'Offline') count++
    }
    console.log('Hayyaks offline:', count)
}
async function deviceSetup () {
    // converts hayyak.outage to stateful incidents, one time job
    console.log('hayyakSetup running...')
    const counts = { added: 0, changed: 0 }
    var data, result
    for (const e of await deviceList()) {
        const deviceId = hayyak.prefix + e.id
        const deviceName = e.name
        await setInfo(e)
        result = await utils.getStatefulIncidents(config, deviceId, { 'customAttributes.createdBy': 'setup' })
        if (result.length > 0) continue // device already setup
        data = {
            metrics: [
                {
                    name: 'hayyak.outage',
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
                    name: 'hayyak.outage.count',
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
        if (e.status === 'Offline') {
            const labels = { status: 'open', type: 'hayyak', event: 'outage', id: deviceId }
            const customAttributes = { createdBy: 'setup', floor: '3', startDate: startDate, endDate: 0 }
            console.log('hayyakSetup sending open stateful incident:', deviceId, deviceName)
            await utils.addStatefulIncident(config, 'Hayyak outage', 'Outage ' + deviceName, labels, customAttributes)
            counts.added++
        }
        // add closed stateful incident for each outage
        for (const outage of outages) {
            const labels = { status: 'closed', type: 'hayyak', event: 'outage', id: deviceId }
            // set endDate to start plus duration
            const customAttributes = { createdBy: 'setup', floor: '3', startDate: outage[0], endDate: (outage[0] + outage[1]) }
            console.log('hayyakSetup sending closed stateful incident:', deviceId, deviceName)
            await utils.addStatefulIncident(config, 'Hayyak outage', 'Outage ' + deviceName, labels, customAttributes)
            counts.added++
        }
        // add closed stateful incident if Online and no outages
        if (e.status === 'Online' && outages.length === 0 && outageCounts.length) {
            const labels = { status: 'closed', type: 'hayyak', event: 'outage', id: deviceId }
            const endDate = outageCounts[outageCounts.length - 1][0]
            const customAttributes = { createdBy: 'setup', floor: '3', startDate: startDate, endDate: endDate }
            console.log('hayyakSetup sending closed stateful incident:', deviceId, deviceName)
            await utils.addStatefulIncident(config, 'Hayyak outage', 'Outage ' + deviceName, labels, customAttributes)
            counts.added++
        }
    }
    console.log('hayyakSetup stateful incident totals:', counts)
    return counts
}
async function deviceStatus (id) {
    console.log('Hayyak ID:', id)
    if (id.startsWith(hayyak.prefix)) id = id.substr(1)
    const device = hayyak.devices ? hayyak.devices[id] : null
    const status = device ? device.status : 'Offline'
    const location = device ? device.location : {}
    return { status: status, location: location }
}
async function deviceSync () {
    console.log('hayyakSync running...')
    const counts = { added: 0, changed: 0 }
    const devices = {}
    for (const e of await utils.deviceList(config, 'hayyak')) {
        devices[e.serialNumber] = e
    }
    for (const e of await deviceList()) {
        const deviceId = hayyak.prefix + e.id
        const deviceName = e.name
        const device = devices[deviceId]
        if (device) {
            var doc = {}
            if (device.name !== deviceName) doc.name = deviceName
            if (device.serialNumber !== deviceId) doc.serialNumber = deviceId
            if (!device.labels || !device.labels.type) doc.labels = { type: 'hayyak' }
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
                    console.log('hayyakSync changed:', device.UUID, device.serialNumber, doc)
                }
                catch (err) {
                    console.error('hayyakSync error:', err)
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
                        labels: { type: 'hayyak' }
                    }
                })
                counts.added++
                console.log('hayyakSync added:', deviceId, deviceName)
            }
            catch (err) {
                console.error('hayyakSync error:', err)
            }
        }
    }
    console.log('hayyakSync totals:', counts)
    return counts
}
async function deviceUsageStart () {
    hayyak.stop = false
    if (!hayyak.timeout) deviceUsage()
    return true
}
async function deviceUsageStop () {
    hayyak.stop = true
    clearTimeout(hayyak.timeout)
    hayyak.timeout = null
    return true
}
async function deviceUsage () {
    if (hayyak.stop) return
    console.log('hayyakUsage running...')
    var count = 0
    const timestamp = new Date().getTime()
    for (const event of await eventList()) {
        const device = hayyak.devices[event.id]
        if (!device) continue
        await deviceEvent(device, event, timestamp)
        count++
    }
    console.log('hayyakUsage total:', count)
    const interval = config.hayyak.usageInterval
    if (interval && !hayyak.stop) hayyak.timeout = setTimeout(deviceUsage, interval)
    return count
}
async function eventList () {
    // this is currently the same as deviceList - we're using this pattern to allow for a real event log in future
    console.log('Hayyak event list running...')
    var list = await deviceList()
    for (const e of list) {
        await setInfo(e)
        // await setLocation(e)
        if (e.status === 'Online') await setTelemetry(e)
    }
    return list
}
