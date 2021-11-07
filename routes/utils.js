const axios = require('axios')
exports.deviceList = async function (config, type) {
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
exports.getTimeseriesData = async function (config, data, callback) {
    try {
        const response = await axios({
            method: 'post',
            url: config.davra.url + '/api/v2/timeseriesData',
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            },
            data: data
        })
        if (callback) return callback(response.data)
        return response.data
    }
    catch (err) {
        console.error('getTimeseriesData error:', err.response)
        if (callback) return callback(null)
        return null
    }
}
exports.sendIotData = async function (config, deviceId, metricName, timestamp, value, tags) {
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
exports.sendIotDataArray = async function (config, arr) {
    try {
        await axios({
            method: 'put',
            url: config.davra.url + '/api/v1/iotdata',
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            },
            data: arr
        })
    }
    catch (err) {
        console.error('sendIotDataArray error:', err.response)
        return false
    }
    return true
}
exports.getStatefulIncidents = async function (config, deviceId, tags, callback) {
    try {
        var url = config.davra.url + '/api/v1/twins?digitalTwinTypeName=stateful_incident&labels.id=' + deviceId
        if (tags) {
            for (const key in tags) {
                url += '&key=' + tags[key]
            }
        }
        const response = await axios({
            method: 'get',
            url: url,
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            }
        })
        if (callback) return callback(response.data)
        return response.data
    }
    catch (err) {
        console.error('getStatefulIncidents error:', err.response)
        if (callback) return callback(null)
        return []
    }
}
exports.changeStatefulIncident = async function (config, uuid, data) {
    try {
        await axios({
            method: 'put',
            url: config.davra.url + '/api/v1/twins/' + uuid,
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            },
            data: data
        })
    }
    catch (err) {
        console.error('updateStatefulIncident error:', err.response)
        return false
    }
    return true
}

exports.addStatefulIncident = async function (config, name, description, labels, customAttributes) {
    try {
        await axios({
            method: 'post',
            url: config.davra.url + '/api/v1/twins',
            headers: {
                Authorization: 'Bearer ' + config.davra.token
            },
            data: {
                name: name,
                description: description,
                labels: labels,
                digitalTwinTypeName: 'stateful_incident',
                customAttributes: customAttributes || {}
            }
        })
    }
    catch (err) {
        console.error('addStatefulIncident error:', err.response)
        return false
    }
    return true
}
