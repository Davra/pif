const axios = require('axios')
var config
const session = {}
const expiryInterval = 60 * 60 * 1000
exports.init = function (app) {
    config = app.get('config')
}
// no need for this now that we have scheduled jobs
// async function renewSession () {
//     session.renewCount++
//     console.log('Renewing sessionId ', session.sessionId, session.renewCount)
//     // use dummy device ID just to extend the session
//     await getCapability('*renewSession', session.sessionId)
//     var currentTimeMillis = new Date().getTime()
//     session.expiryTime = currentTimeMillis + expiryInterval
//     session.timeout = setTimeout(renewSession, expiryInterval - 10 * 1000) // allow 10 seconds grace
// }
async function getBioStarSessionId () {
    // if (session.timeout !== undefined) clearTimeout(session.timeout)
    // session.timeout = setTimeout(renewSession, expiryInterval - 10 * 1000) // allow 10 seconds grace
    var currentTimeMillis = new Date().getTime()
    if (session.sessionId) {
        // if (currentTimeMillis < (session.expiryTime - (10 * 1000))) {
        if (currentTimeMillis < session.expiryTime) {
            console.log('Reusing BioStar sessionId: ' + session.sessionId)
            session.expiryTime = currentTimeMillis + expiryInterval
            return session.sessionId
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
        if (response.status !== 200) {
            console.error('getBioStarSessionId error: ', response.status, JSON.stringify(response.data))
            return null
        }
        session.sessionId = response.headers['bs-session-id']
        session.expiryTime = currentTimeMillis + expiryInterval
        session.renewCount = 0
        console.log('BioStar new sessionId: ' + session.sessionId)
        return session.sessionId
    }
    catch (err) {
        console.error('getBioStarSessionId error: ' + err)
        return null
    }
}
exports.getBioStarSessionId = getBioStarSessionId
