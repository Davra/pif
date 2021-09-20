const axios = require('axios')
const express = require('express')
const security = require('./security.js')
const utils = require('./utils.js')
// const uuidv4 = require('uuid/v4')
var config
const embrava = { prefix: 'h' }
exports.init = async function (app) {
    config = app.get('config')
    // app.get('/api/embrava/hooks', (req, res) => {
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not signed on' })
    //     const userHooks = embrava.hooks[userId] || []
    //     if (userHooks.length === 0) return res.send({ success: false, message: 'No hooks defined' })
    //     return res.send({ success: true, data: userHooks })
    // })
    // app.get('/api/embrava/hooks/:id', (req, res) => {
    //     const id = decodeURIComponent(req.params.id)
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     const userHooks = embrava.hooks[userId] || []
    //     if (userHooks.length === 0) return res.send({ success: false, message: 'No hooks defined' })
    //     for (const hook of userHooks) {
    //         if (hook.id === id) return res.send({ success: true, data: hook })
    //     }
    //     res.send({ success: false, message: `Hook ${id} not found` })
    // })
    // app.delete('/api/embrava/hooks/:id', async (req, res) => {
    //     const id = decodeURIComponent(req.params.id)
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     const userHooks = embrava.hooks[userId] || []
    //     if (userHooks.length === 0) return res.send({ success: false, message: 'No hooks defined' })
    //     var i = 0
    //     for (const hook of userHooks) {
    //         if (hook.id === id) {
    //             userHooks.splice(i, 1)
    //             await updateHooks(userId, userHooks)
    //             console.log(`Hook ${id} deleted for user ${userId}`)
    //             return res.send({ success: true, message: `Hook ${id} deleted`, data: hook })
    //         }
    //         i++
    //     }
    //     res.send({ success: false, message: `Hook ${id} not found` })
    // })
    // function editWebhook (req, res) {
    //     const hook = { url: req.body.url, type: req.body.type }
    //     if (!hook.url || !hook.type) {
    //         res.send({ success: false, message: 'URL and type required for webhook' })
    //         return null
    //     }
    //     if (hook.type !== 'disconnect' && hook.type !== 'enroll' && hook.type !== 'verify') {
    //         res.send({ success: false, message: 'Type must be disconnect, enroll or verify' })
    //         return null
    //     }
    //     return hook
    // }
    // app.put('/api/embrava/hooks/:id', express.json(), async (req, res) => {
    //     const id = decodeURIComponent(req.params.id)
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     const userHooks = embrava.hooks[userId] || []
    //     const newHook = editWebhook(req, res)
    //     if (!newHook) return
    //     for (const hook of userHooks) {
    //         if (hook.id === id) {
    //             for (const attr in newHook) { if (attr !== 'id') hook[attr] = newHook[attr] }
    //             await updateHooks(userId, userHooks)
    //             console.log(`Hook ${id} updated for user ${userId}`)
    //             return res.send({ success: true, message: `Hook ${id} updated`, data: hook })
    //         }
    //     }
    //     res.send({ success: false, message: `Hook ${id} not found` })
    // })
    // app.post('/api/embrava/hooks', express.json(), async (req, res) => {
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     if (!embrava.hooks[userId]) embrava.hooks[userId] = []
    //     const userHooks = embrava.hooks[userId]
    //     const newHook = editWebhook(req, res)
    //     if (!newHook) return
    //     newHook.id = uuidv4()
    //     userHooks.push(newHook)
    //     await updateHooks(userId, userHooks)
    //     console.log(`Hook ${newHook.id} created for user ${userId}`)
    //     return res.send({ success: true, message: `Hook ${newHook.id} created`, data: newHook })
    // })
    // app.post('/api/embrava/hooksTest', express.json(), async (req, res) => {
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     runWebhooks(req.body.name, req.body.event)
    //     return res.send({ success: true, message: 'Running webhooks' })
    // })
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
        if (desk.state === event.state) continue
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
// async function hookList () {
//     console.log('hookList running...')
//     try {
//         const response = await axios({
//             method: 'get',
//             url: config.davra.url + '/api/v1/features?name=hooks&labels.type=embrava',
//             headers: {
//                 Authorization: 'Bearer ' + config.davra.token
//             },
//             validateStatus: status => status === 200
//         })
//         embrava.hooksUuid = response.data[0].UUID
//         embrava.hooks = response.data[0].customAttributes
//         console.log('hookList OK')
//         updateHooksLookup()
//     }
//     catch (err) {
//         console.error('hookList error:', err)
//         process.exit(1)
//     }
// }
// function runWebhooks (name, event) {
//     var type = ''
//     if (name.indexOf('_DISCONNECT') >= 0) type = 'disconnect' // DEVICE_, LINK_, RS485_, TCP_
//     else if (name === 'ENROLL_SUCCESS' || name === 'UPDATE_SUCCESS') type = 'enroll'
//     else if (name.indexOf('IDENTIFY_SUCCESS') >= 0 || name.indexOf('VERIFY_SUCCESS') >= 0) type = 'verify'
//     if (!type) return
//     const hooks = embrava.hooksLookup[type]
//     if (!hooks) return
//     for (const hook of hooks) {
//         const doc = { method: 'post', url: hook.url, data: event }
//         if (hook.secret) doc.headers = { Authorization: 'Bearer ' + hook.secret }
//         console.log('Running webhook:', hook.id, hook.url)
//         axios(doc).then(response => {
//             console.log('Response from webhook', hook.url, response.status, JSON.stringify(response.data))
//         }).catch(function (err) {
//             console.error('Run webhook error:', err, hook.id, hook.url)
//         })
//     }
// }
// async function updateConfig (key, value) {
//     const data = {}
//     data[key] = value
//     try {
//         await axios({
//             method: 'patch',
//             url: config.davra.url + '/api/v1/features/' + config.uuid + '/attributes',
//             headers: {
//                 Authorization: 'Bearer ' + config.davra.token
//             },
//             data: data
//         })
//         console.log('updateConfig:', config.uuid, key, value)
//     }
//     catch (err) {
//         console.error('updateConfig error:', err)
//     }
// }
// async function updateHooksLookup () {
//     embrava.hooksLookup = {}
//     for (const userId in embrava.hooks) {
//         const userHooks = embrava.hooks[userId]
//         for (const hook of userHooks) {
//             if (!embrava.hooksLookup[hook.type]) embrava.hooksLookup[hook.type] = []
//             embrava.hooksLookup[hook.type].push(hook)
//         }
//     }
// }
// async function updateHooks (userId, hooks) {
//     const data = {}
//     data[userId] = hooks
//     try {
//         await axios({
//             method: 'patch',
//             url: config.davra.url + '/api/v1/features/' + embrava.hooksUuid + '/attributes',
//             headers: {
//                 Authorization: 'Bearer ' + config.davra.token
//             },
//             data: data
//         })
//         console.log('updateHooks:', embrava.hooksUuid, userId, hooks)
//         updateHooksLookup()
//     }
//     catch (err) {
//         console.error('updateHooks error:', err)
//     }
// }
