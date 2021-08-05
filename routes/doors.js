const axios = require('axios')
const express = require('express')
const security = require('./security.js')
const uuidv4 = require('uuid/v4')
var config
const biostar = {}
exports.init = async function (app) {
    config = app.get('config')
    app.get('/api/biostar/hooks', (req, res) => {
        const userId = getUserId(req, config)
        if (!userId) return res.send({ success: false, message: 'Not signed on' })
        const userHooks = biostar.hooks[userId] || []
        if (userHooks.length === 0) return res.send({ success: false, message: 'No hooks defined' })
        return res.send({ success: true, data: userHooks })
    })
    app.get('/api/biostar/hooks/:id', (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const userId = getUserId(req, config)
        if (!userId) return res.send({ success: false, message: 'Not logged in' })
        const userHooks = biostar.hooks[userId] || []
        if (userHooks.length === 0) return res.send({ success: false, message: 'No hooks defined' })
        for (const hook of userHooks) {
            if (hook.id === id) return res.send({ success: true, data: hook })
        }
        res.send({ success: false, message: `Hook ${id} not found` })
    })
    app.delete('/api/biostar/hooks/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const userId = getUserId(req, config)
        if (!userId) return res.send({ success: false, message: 'Not logged in' })
        const userHooks = biostar.hooks[userId] || []
        if (userHooks.length === 0) return res.send({ success: false, message: 'No hooks defined' })
        var i = 0
        for (const hook of userHooks) {
            if (hook.id === id) {
                userHooks.splice(i, 1)
                await updateHooks(userId, userHooks)
                console.log(`Hook ${id} deleted for user ${userId}`)
                return res.send({ success: true, message: `Hook ${id} deleted`, data: hook })
            }
            i++
        }
        res.send({ success: false, message: `Hook ${id} not found` })
    })
    app.put('/api/biostar/hooks/:id', express.json(), async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const userId = getUserId(req, config)
        if (!userId) return res.send({ success: false, message: 'Not logged in' })
        const userHooks = biostar.hooks[userId] || []
        const newHook = req.body
        if (!newHook.url || !newHook.type) {
            return res.send({ success: false, message: 'URL and type required for webhook' })
        }
        for (const hook of userHooks) {
            if (hook.id === id) {
                for (const attr in newHook) { if (attr !== 'id') hook[attr] = newHook[attr] }
                await updateHooks(userId, userHooks)
                console.log(`Hook ${id} updated for user ${userId}`)
                return res.send({ success: true, message: `Hook ${id} updated`, data: hook })
            }
        }
        res.send({ success: false, message: `Hook ${id} not found` })
    })
    app.post('/api/biostar/hooks', express.json(), async (req, res) => {
        const userId = getUserId(req, config)
        if (!userId) return res.send({ success: false, message: 'Not logged in' })
        if (!biostar.hooks[userId]) biostar.hooks[userId] = []
        const userHooks = biostar.hooks[userId]
        const newHook = req.body
        if (!newHook.url || !newHook.type) {
            return res.send({ success: false, message: 'URL and type required for webhook' })
        }
        newHook.id = uuidv4()
        userHooks.push(newHook)
        await updateHooks(userId, userHooks)
        console.log(`Hook ${newHook.id} created for user ${userId}`)
        return res.send({ success: true, message: `Hook ${newHook.id} created`, data: newHook })
    })
    app.post('/api/biostar/hooksTest', express.json(), async (req, res) => {
        const userId = getUserId(req, config)
        if (!userId) return res.send({ success: false, message: 'Not logged in' })
        runWebhooks(req.body.name, req.body.event)
        return res.send({ success: true, message: 'Running webhooks' })
    })
    app.get('/door/create', async (req, res) => {
        const count = await doorCreate()
        return res.send({ success: true, data: count })
    })
    app.get('/door/capability/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const data = await doorCapability(id)
        if (data) return res.send({ success: true, data: data })
        res.send({ success: false, message: 'Door capability error' })
    })
    app.get('/door/status/:id', async (req, res) => {
        const id = decodeURIComponent(req.params.id)
        const status = await doorStatus(id)
        res.send({ success: true, status: status })
    })
    app.get('/door/usage/start', async (req, res) => {
        doorUsageStart()
        res.send({ success: true, message: 'Door usage started' })
    })
    app.get('/door/usage/stop', async (req, res) => {
        doorUsageStop()
        console.log('Door usage stopping...')
        res.send({ success: true, message: 'Door usage stopping...' })
    })
    doorUsageStart()
}
function getUserId (req, config) {
    var userId = req.headers['x-user-id'] || ''
    if (!userId && config.davra.env === 'dev') userId = 'admin' // default to admin for testing
    return userId
}
async function doorCapability (id) {
    console.log('Door ID: ' + id)
    try {
        const response = await axios({
            method: 'get',
            url: config.biostar.url + '/api/devices/capability',
            headers: {
                'bs-session-id': await security.getBioStarSessionId()
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
async function doorCreate () {
    console.log('doorCreate running...')
    var count = 0
    for (const door of await doorList()) {
        try {
            const response = await axios({
                method: 'post',
                url: config.davra.url + '/api/v1/devices',
                headers: {
                    Authorization: 'Bearer ' + config.davra.token
                },
                data: {
                    serialNumber: door.id,
                    name: door.name
                }
            })
            if (response.status !== 200) {
                console.error('doorCreate error: ', response.status, JSON.stringify(response.data))
                continue
            }
            count++
            console.log('doorCreate: ' + door.name)
        }
        catch (err) {
            console.error('doorCreate error: ' + err)
        }
    }
    console.log('doorCreate total: ' + count)
    return count
}
async function doorConnect (door, event, eventType) {
    if (eventType.name.indexOf('_DISCONNECT') >= 0) { // DEVICE_, LINK_, RS485_, TCP_
        if (!door.disconnectTime) {
            door.disconnectTime = event.datetime
            door.status = '0'
        }
        return
    }
    if (eventType.name.indexOf('_CONNECT') >= 0) { // LINK_, RS485_, TCP_
        if (!door.disconnectTime) return // ignore connect without a previous disconnect
        const startDate = Date.parse(door.disconnectTime)
        const endDate = Date.parse(event.datetime)
        var duration = endDate - startDate
        if (duration === 0) return
        console.log('Door outage:', door.disconnectTime, event.device_id.id, startDate, endDate, duration)
        door.disconnectTime = ''
        door.status = '1'
        if (!await sendIotData(event.device_id.id, 'door.outage', startDate, duration, {
            eventTypeId: event.event_type_id.code,
            eventTypeName: eventType.name
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
            console.log('Door outage timeslice:', event.device_id.id, bucketDate, timeslice)
            if (!await sendIotData(event.device_id.id, 'door.outage.timeslice', bucketDate, timeslice, {
                eventTypeId: event.event_type_id.code,
                eventTypeName: eventType.name
            })) {
                return
            }
            duration -= timeslice
            bucketDate += bucket
        }
    }
}
async function doorList () {
    console.log('doorList running...')
    try {
        const response = await axios({
            method: 'get',
            url: config.biostar.url + '/api/devices?monitoring_permission=false',
            headers: {
                'bs-session-id': await security.getBioStarSessionId()
            }
        })
        if (!response.data || !response.data.DeviceCollection || !response.data.DeviceCollection.rows) {
            console.error('No doors returned')
            return []
        }
        console.log('Doors: ' + response.data.DeviceCollection.rows.length)
        return response.data.DeviceCollection.rows
    }
    catch (err) {
        console.error('Door list error: ' + err)
    }
}
async function doorStatus (id) {
    console.log('Door ID: ' + id)
    const door = biostar.doors ? biostar.doors[id] : null
    const status = door ? door.status : '0'
    return status
}
async function doorUsageStart () {
    biostar.stop = false
    doorUsage()
    return true
}
async function doorUsageStop () {
    biostar.stop = true
    return true
}
async function doorUsage () {
    console.log('doorUsage running...')
    var count = 0
    if (!biostar.hooks) await hookList()
    if (!biostar.doors) {
        biostar.doors = {}
        for (const door of await doorList()) {
            biostar.doors[door.id] = door
        }
    }
    if (!biostar.eventTypes) {
        biostar.eventTypes = {}
        for (const eventType of await eventTypeList()) {
            biostar.eventTypes[eventType.code] = eventType
        }
    }
    if (!config.biostar.startTime) {
        config.biostar.startTime = '2021-01-01T00:00:00.000Z'
    }
    for (const event of await eventList()) {
        if (biostar.stop) break
        if (event.datetime > config.biostar.startTime) config.biostar.startTime = event.datetime
        const door = biostar.doors[event.device_id.id]
        if (!door) continue
        const eventType = biostar.eventTypes[event.event_type_id.code]
        if (!eventType) continue
        runWebhooks(eventType.name, event)
        if (['DELETE_SUCCESS', 'ENROLL_SUCCESS', 'UPDATE_SUCCESS'].indexOf(eventType.name) >= 0) continue
        if (eventType.name.indexOf('CONNECT') >= 0) { // could be connect or disconnect
            // metricName = 'door.connect'
            await doorConnect(door, event, eventType)
            continue
        }
        if (!await sendIotData(event.device_id.id, 'door.access', Date.parse(event.datetime), 1, {
            eventTypeId: event.event_type_id.code,
            eventTypeName: eventType.name
        })) {
            continue
        }
        count++
        console.log('doorUsage: ', event.datetime, event.id, event.event_type_id.code, eventType.name)
    }
    console.log('doorUsage total: ' + count)
    // console.log(path.join(__dirname, '/../config/config.json'))
    // fs.writeFileSync(path.join(__dirname, '/../config/config.json'), JSON.stringify(config, null, 4))
    updateConfig('biostar.startTime', config.biostar.startTime)
    const interval = config.biostar.doorUsageInterval
    if (interval && !biostar.stop) setTimeout(doorUsage, interval)
    return count
}
async function eventTypeList () {
    console.log('eventTypeList running...')
    try {
        const response = await axios({
            method: 'get',
            url: config.biostar.url + '/api/event_types?is_break_glass=false&setting_alert=false&setting_all=true',
            headers: {
                'bs-session-id': await security.getBioStarSessionId()
            }
        })
        if (!response.data || !response.data.EventTypeCollection || !response.data.EventTypeCollection.rows) {
            console.error('No eventTypes returned')
            return []
        }
        console.log('EventTypes: ' + response.data.EventTypeCollection.rows.length)
        return response.data.EventTypeCollection.rows
    }
    catch (err) {
        console.error('EventType list error: ' + err)
    }
}
async function eventList () {
    console.log('eventList running...')
    try {
        const response = await axios({
            method: 'post',
            url: config.biostar.url + '/api/events/search',
            headers: {
                'bs-session-id': await security.getBioStarSessionId()
            },
            data: {
                Query: {
                    limit: 1000,
                    conditions: [{
                        column: 'datetime',
                        operator: 5,
                        values: [
                            config.biostar.startTime
                        ]
                    }],
                    orders: [{
                        column: 'datetime',
                        descending: false
                    }]
                }
            }
        })
        if (!response.data || !response.data.EventCollection || !response.data.EventCollection.rows) {
            console.error('No events returned')
            return []
        }
        console.log('Events: ' + response.data.EventCollection.rows.length)
        return response.data.EventCollection.rows
    }
    catch (err) {
        console.error('Event list error: ' + err)
    }
}
async function hookList () {
    console.log('hookList running...')
    try {
        const response = await axios({
            method: 'get',
            url: config.davra.url + '/api/v1/features?name=hooks&labels.type=biostar',
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            },
            validateStatus: status => status === 200
        })
        biostar.hooksUuid = response.data[0].UUID
        biostar.hooks = response.data[0].customAttributes
        console.log('hookList OK')
        updateHooksLookup()
    }
    catch (err) {
        console.error('hookList error: ' + err)
        process.exit(1)
    }
}
function runWebhooks (name, event) {
    var type = ''
    if (name.indexOf('_DISCONNECT') >= 0) type = 'disconnect' // DEVICE_, LINK_, RS485_, TCP_
    else if (name === 'ENROLL_SUCCESS' || name === 'UPDATE_SUCCESS') type = 'enroll'
    else if (name.indexOf('VERIFY_SUCCESS') >= 0) type = 'verify'
    if (!type) return
    const hooks = biostar.hooksLookup[type]
    if (!hooks) return
    for (const hook of hooks) {
        const doc = { method: 'post', url: hook.url, data: event }
        if (hook.secret) doc.headers = { Authorization: 'Bearer ' + hook.secret }
        console.log('Running webhook:', hook.id, hook.url)
        axios(doc).then(response => {
            console.log('Response from webhook', hook.url, response.status, JSON.stringify(response.data))
        }).catch(function (err) {
            console.error('Run webhook error:', err, hook.id, hook.url)
        })
    }
}
async function sendIotData (deviceId, metricName, timestamp, value, tags) {
    try {
        const response = await axios({
            method: 'put',
            url: config.davra.url + '/api/v1/iotdata',
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            },
            data: [{
                UUID: deviceId,
                timestamp: timestamp,
                name: metricName,
                value: value,
                msg_type: 'datum',
                tags: tags
            }]
        })
        if (response.status !== 200) {
            console.error('sendIotData error: ', response.status, JSON.stringify(response.data))
            return false
        }
    }
    catch (err) {
        console.error('sendIotData error: ' + err)
        return false
    }
    return true
}
async function updateConfig (key, value) {
    const data = {}
    data[key] = value
    try {
        await axios({
            method: 'patch',
            url: config.davra.url + '/api/v1/features/' + config.uuid + '/attributes',
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            },
            data: data,
            validateStatus: status => status === 200
        })
        console.log('updateConfig:', config.uuid, key, value)
    }
    catch (err) {
        console.error('updateConfig error: ' + err)
    }
}
async function updateHooksLookup () {
    biostar.hooksLookup = {}
    for (const userId in biostar.hooks) {
        const userHooks = biostar.hooks[userId]
        for (const hook of userHooks) {
            if (!biostar.hooksLookup[hook.type]) biostar.hooksLookup[hook.type] = []
            biostar.hooksLookup[hook.type].push(hook)
        }
    }
}
async function updateHooks (userId, hooks) {
    const data = {}
    data[userId] = hooks
    try {
        await axios({
            method: 'patch',
            url: config.davra.url + '/api/v1/features/' + biostar.hooksUuid + '/attributes',
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            },
            data: data,
            validateStatus: status => status === 200
        })
        console.log('updateHooks:', biostar.hooksUuid, userId, hooks)
        updateHooksLookup()
    }
    catch (err) {
        console.error('updateHooks error: ' + err)
    }
}
