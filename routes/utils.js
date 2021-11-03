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
exports.sendStatefulIncident = async function (config, name, description, type, tags) {
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
                labels: { status: 'open', type: type },
                digitalTwinTypeName: 'stateful_incident',
                customAttributes: tags
            }
        })
    }
    catch (err) {
        console.error('sendStatefulIncident error:', err.response)
        return false
    }
    return true
}
