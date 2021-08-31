const axios = require('axios')
const express = require('express')
const security = require('./security.js')
// const uuidv4 = require('uuid/v4')
var config
const appspace = {}
exports.init = async function (app) {
    config = app.get('config')
    // app.get('/api/appspace/hooks', (req, res) => {
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not signed on' })
    //     const userHooks = appspace.hooks[userId] || []
    //     if (userHooks.length === 0) return res.send({ success: false, message: 'No hooks defined' })
    //     return res.send({ success: true, data: userHooks })
    // })
    // app.get('/api/appspace/hooks/:id', (req, res) => {
    //     const id = decodeURIComponent(req.params.id)
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     const userHooks = appspace.hooks[userId] || []
    //     if (userHooks.length === 0) return res.send({ success: false, message: 'No hooks defined' })
    //     for (const hook of userHooks) {
    //         if (hook.id === id) return res.send({ success: true, data: hook })
    //     }
    //     res.send({ success: false, message: `Hook ${id} not found` })
    // })
    // app.delete('/api/appspace/hooks/:id', async (req, res) => {
    //     const id = decodeURIComponent(req.params.id)
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     const userHooks = appspace.hooks[userId] || []
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
    // app.put('/api/appspace/hooks/:id', express.json(), async (req, res) => {
    //     const id = decodeURIComponent(req.params.id)
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     const userHooks = appspace.hooks[userId] || []
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
    // app.post('/api/appspace/hooks', express.json(), async (req, res) => {
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     if (!appspace.hooks[userId]) appspace.hooks[userId] = []
    //     const userHooks = appspace.hooks[userId]
    //     const newHook = editWebhook(req, res)
    //     if (!newHook) return
    //     newHook.id = uuidv4()
    //     userHooks.push(newHook)
    //     await updateHooks(userId, userHooks)
    //     console.log(`Hook ${newHook.id} created for user ${userId}`)
    //     return res.send({ success: true, message: `Hook ${newHook.id} created`, data: newHook })
    // })
    // app.post('/api/appspace/hooksTest', express.json(), async (req, res) => {
    //     const userId = getUserId(req, config)
    //     if (!userId) return res.send({ success: false, message: 'Not logged in' })
    //     runWebhooks(req.body.name, req.body.event)
    //     return res.send({ success: true, message: 'Running webhooks' })
    // })
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
async function deviceList (type) {
    try {
        const response = await axios({
            method: 'get',
            url: config.davra.url + '/api/v1/devices' + (type ? '?labels.type=' + type : ''),
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            }
        })
        return response.data.records
    }
    catch (err) {
        console.error('deviceList error:', err.response)
        return null
    }
}
async function signCapability (id) {
    console.log('Sign ID:', id)
    if (id.startsWith('s')) id = id.substr(1)
    const connection = await security.getAppspaceConnection()
    const result = await connection.execute('SELECT * FROM node N LEFT OUTER JOIN nodeprop NP ON N._id = NP._nodeId WHERE N._id = ?', [id])
    // console.log(result)
    return (result[0] || [])
}
async function signConnect (sign, event, timestamp) {
    if (event.status > 0) { // status not OK
        if (!sign.disconnectTime) {
            sign.disconnectTime = timestamp
            sign.status = event.status
        }
        return
    }
    if (event.status === 0) { // status OK
        if (!sign.disconnectTime) return // ignore connect without a previous disconnect
        const startDate = sign.disconnectTime
        const endDate = timestamp
        var duration = endDate - startDate
        if (duration === 0) return
        console.log('Sign outage:', sign.disconnectTime, event._id, startDate, endDate, duration)
        sign.disconnectTime = 0
        sign.status = event.status
        if (!await sendIotData('s' + event._id, 'sign.outage', startDate, duration, {
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
            if (!await sendIotData('s' + event._id, 'sign.outage.timeslice', bucketDate, timeslice, {
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
    // console.log(result)
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
    if (id.startsWith('s')) id = id.substr(1)
    const sign = appspace.signs[id]
    const data = sign ? { status: sign.Status, sync: sign.SyncStatus } : null
    return data
}
async function signSync () {
    console.log('signSync running...')
    var counts = { added: 0, changed: 0 }
    const devices = {}
    for (const device of await deviceList('sign')) {
        devices[device.serialNumber] = device
    }
    for (const sign of await signList()) {
        const signId = 's' + sign._id
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
                    console.error('signSync error:', err.response)
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
                console.error('signSync error:', err.response)
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
        if (appspace.stop) break
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
        // if (!await sendIotData('s' + event._id, 'sign.access', Date.parse(event.datetime), 1, {
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
// async function hookList () {
//     console.log('hookList running...')
//     try {
//         const response = await axios({
//             method: 'get',
//             url: config.davra.url + '/api/v1/features?name=hooks&labels.type=appspace',
//             headers: {
//                 Authorization: 'Bearer ' + config.davra.token
//             },
//             validateStatus: status => status === 200
//         })
//         appspace.hooksUuid = response.data[0].UUID
//         appspace.hooks = response.data[0].customAttributes
//         console.log('hookList OK')
//         updateHooksLookup()
//     }
//     catch (err) {
//         console.error('hookList error:', err.response)
//         process.exit(1)
//     }
// }
// function runWebhooks (name, event) {
//     var type = ''
//     if (name.indexOf('_DISCONNECT') >= 0) type = 'disconnect' // DEVICE_, LINK_, RS485_, TCP_
//     else if (name === 'ENROLL_SUCCESS' || name === 'UPDATE_SUCCESS') type = 'enroll'
//     else if (name.indexOf('IDENTIFY_SUCCESS') >= 0 || name.indexOf('VERIFY_SUCCESS') >= 0) type = 'verify'
//     if (!type) return
//     const hooks = appspace.hooksLookup[type]
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
async function sendIotData (deviceId, metricName, timestamp, value, tags) {
    try {
        await axios({
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
    }
    catch (err) {
        console.error('sendIotData error:', err.response)
        return false
    }
    return true
}
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
//         console.error('updateConfig error:', err.response)
//     }
// }
// async function updateHooksLookup () {
//     appspace.hooksLookup = {}
//     for (const userId in appspace.hooks) {
//         const userHooks = appspace.hooks[userId]
//         for (const hook of userHooks) {
//             if (!appspace.hooksLookup[hook.type]) appspace.hooksLookup[hook.type] = []
//             appspace.hooksLookup[hook.type].push(hook)
//         }
//     }
// }
// async function updateHooks (userId, hooks) {
//     const data = {}
//     data[userId] = hooks
//     try {
//         await axios({
//             method: 'patch',
//             url: config.davra.url + '/api/v1/features/' + appspace.hooksUuid + '/attributes',
//             headers: {
//                 Authorization: 'Bearer ' + config.davra.token
//             },
//             data: data
//         })
//         console.log('updateHooks:', appspace.hooksUuid, userId, hooks)
//         updateHooksLookup()
//     }
//     catch (err) {
//         console.error('updateHooks error:', err.response)
//     }
// }
