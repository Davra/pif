const axios = require('axios')
const bodyParser = require('body-parser')
const express = require('express')
const path = require('path')
// const qs = require('qs')
const app = express()
const port = 8080

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/alerts', async (req, res) => {
    console.log('Alerts')
    try {
        const response = await axios({
            method: 'get',
            url: 'https://pif.davra.com/api/v1/twins?digitalTwinTypeName=stateful_incident&labels.stateful_status=open',
            headers: {
                'Authorization': 'Bearer EEgkMVI9hbF1fpYKlcrbCHGlBKcZ6gtSTPML7Ost3mgmABwy'
            }
        })
        res.send({ success: true, alerts: response.data })
    }
    catch (err) {
        console.error('Alerts error: ' + err)
        return res.send({ success: false, message: 'Alerts error' })
    }
})
app.get('/beacon/:id', (req, res) => {
    const id = decodeURIComponent(req.params.id)
    console.log('Beacon ID: ' + id)
    const html = []
    html.push('<html><head></head><body>')
    html.push('<div>Beacon ID: ' + id + '</div>')
    html.push('</body></html>')
    res.set({
        'Content-Type': 'text/html'
    })
    res.send(html.join(''))
})
app.post('/bounce', bodyParser.urlencoded({ extended: true }), (req, res) => {
    const bounceString = req.body.bounceString
    const bounce = JSON.parse(bounceString)
    res.set(bounce.headers)
    res.send(bounce.data)
})
app.listen(port, () => {
    console.log(`Davra PIF server listening on port ${port}`)
})
