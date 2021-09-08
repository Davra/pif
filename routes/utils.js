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
