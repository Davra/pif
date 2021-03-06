const axios = require('axios')
const mysql = require('mysql2/promise')
var config
const appspace = { expiryInterval: 8 * 60 * 60 * 1000 }
const biostar = { expiryInterval: 60 * 60 * 1000 }
const embrava = { expiryInterval: 60 * 60 * 1000 }
const hayyak = { expiryInterval: 150 * 60 * 1000 }
exports.init = function (app) {
    config = app.get('config')
}
// no need for this now that we have scheduled jobs
// async function renewSession () {
//     biostar.renewCount++
//     console.log('Renewing sessionId ', biostar.sessionId, biostar.renewCount)
//     // use dummy device ID just to extend the session
//     await getCapability('*renewSession', biostar.sessionId)
//     var currentTimeMillis = new Date().getTime()
//     biostar.expiryTime = currentTimeMillis + biostar.expiryInterval
//     biostar.timeout = setTimeout(renewSession, biostar.expiryInterval - 10 * 1000) // allow 10 seconds grace
// }
exports.getAppspaceConnection = async function () {
    var currentTimeMillis = new Date().getTime()
    if (appspace.connection) {
        if (currentTimeMillis < (appspace.expiryTime - (10 * 1000))) {
        // if (currentTimeMillis < appspace.expiryTime) {
            console.log('Reusing Appspace connection')
            appspace.expiryTime = currentTimeMillis + appspace.expiryInterval
            return appspace.connection
        }
    }
    const connection = await mysql.createConnection({
        host: config.appspace.url,
        user: config.appspace.userId,
        password: config.appspace.password,
        database: 'webman'
    })
    console.log('getAppspaceConnection connected as id ' + connection.threadId)
    appspace.connection = connection
    appspace.expiryTime = currentTimeMillis + appspace.expiryInterval
    return appspace.connection
}
exports.getBioStarSessionId = async function () {
    // if (biostar.timeout !== undefined) clearTimeout(biostar.timeout)
    // biostar.timeout = setTimeout(renewSession, biostar.expiryInterval - 10 * 1000) // allow 10 seconds grace
    var currentTimeMillis = new Date().getTime()
    if (biostar.sessionId) {
        // if (currentTimeMillis < (biostar.expiryTime - (10 * 1000))) {
        if (currentTimeMillis < biostar.expiryTime) {
            console.log('Reusing BioStar sessionId: ' + biostar.sessionId)
            biostar.expiryTime = currentTimeMillis + biostar.expiryInterval
            return biostar.sessionId
        }
    }
    try {
        const response = await axios({
            method: 'post',
            url: config.biostar.url + '/api/login',
            data: {
                User: {
                    login_id: config.biostar.userId,
                    password: config.biostar.password
                }
            }
        })
        biostar.sessionId = response.headers['bs-session-id']
        biostar.expiryTime = currentTimeMillis + biostar.expiryInterval
        // biostar.renewCount = 0
        console.log('BioStar new sessionId: ' + biostar.sessionId)
        return biostar.sessionId
    }
    catch (err) {
        console.error('getBioStarSessionId error:', err)
        return null
    }
}
exports.getEmbravaToken = async function () {
    var currentTimeMillis = new Date().getTime()
    if (embrava.token) {
        // if (currentTimeMillis < (embrava.expiryTime - (10 * 1000))) {
        if (currentTimeMillis < embrava.expiryTime) {
            console.log('Reusing Embrava token: ' + embrava.token)
            embrava.expiryTime = currentTimeMillis + embrava.expiryInterval
            return embrava.token
        }
    }
    try {
        const response = await axios({
            method: 'post',
            url: config.embrava.url + '/api/account/authenticate',
            data: {
                Email: config.embrava.userId,
                Password: config.embrava.password,
                RememberMe: false
            }
        })
        if (!response.data.status) {
            console.error('getEmbravaToken error: ' + response.data.message)
            return null
        }
        embrava.token = response.data.result.token
        embrava.expiryTime = currentTimeMillis + embrava.expiryInterval
        // embrava.renewCount = 0
        console.log('Embrava new token: ' + embrava.token)
        return embrava.token
    }
    catch (err) {
        console.error('getEmbravaToken error:', err)
        return null
    }
}
exports.getHayyakToken = async function () {
    var currentTimeMillis = new Date().getTime()
    if (hayyak.token) {
        if (currentTimeMillis < (hayyak.expiryTime - (10 * 1000))) {
        // if (currentTimeMillis < hayyak.expiryTime) {
            console.log('Reusing Hayyak token: ' + hayyak.token)
            // do not extend - expiry time is not extended by usage
            // hayyak.expiryTime = currentTimeMillis + hayyak.expiryInterval
            return hayyak // return token and customerId
        }
    }
    try {
        var response = await axios({
            method: 'post',
            url: config.hayyak.url + '/api/auth/login',
            data: {
                username: config.hayyak.userId,
                password: config.hayyak.password
            }
        })
        hayyak.token = response.data.token
        hayyak.expiryTime = currentTimeMillis + hayyak.expiryInterval
        // hayyak.renewCount = 0
        console.log('Hayyak new token: ' + hayyak.token)
        response = await axios({
            method: 'get',
            url: config.hayyak.url + '/api/auth/user',
            headers: {
                'X-Authorization': 'Bearer ' + hayyak.token
            }
        })
        hayyak.customerId = response.data.customerId.id
        return hayyak // return token and customerId
    }
    catch (err) {
        console.error('getHayyakToken error:', err)
        return null
    }
}
