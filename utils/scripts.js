const axios = require('axios')
const fs = require('fs')
const path = require('path')
var config, security
const biostar = {}
exports.init = function (app) {
    config = app.get('config')
    security = app.get('security')
}
exports.doorCapability = async function (id) {
    console.log('Door ID: ' + id)
    try {
        const response = await axios({
            method: 'post',
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
exports.doorCreate = async function () {
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
exports.doorStatus = async function (id) {
    console.log('Door ID: ' + id)
    const door = biostar.doors ? biostar.doors[id] : null
    const status = door ? door.status : '0'
    return status
}
exports.doorUsageStart = async function () {
    biostar.stop = false
    doorUsage()
    return true
}
exports.doorUsageStop = async function () {
    biostar.stop = true
    return true
}
async function doorUsage () {
    console.log('doorUsage running...')
    var count = 0
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
    console.log(path.join(__dirname, '/../config/config.json'))
    fs.writeFileSync(path.join(__dirname, '/../config/config.json'), JSON.stringify(config, null, 4))
    const interval = config.biostar.doorUsageInterval
    if (interval && !biostar.stop) setTimeout(doorUsage, interval)
    return count
}
exports.doorUsage = doorUsage
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
