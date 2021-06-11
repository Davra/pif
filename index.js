const express = require('express')
const path = require('path')
const app = express()
const port = 8080

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/beacon/:id', (req, res) => {
    var id = decodeURIComponent(req.params.id)
    console.log('Beacon ID: ' + id)
    var html = []
    html.push('<html><head></head><body>')
    html.push('<div>Beacon ID: ' + id + '</div>')
    html.push('</body></html>')
    res.set({
        'Content-Type': 'text/html'
    })
    res.send(html.join(''))
})
app.listen(port, () => {
    console.log(`Davra PIF server listening on port ${port}`)
})
