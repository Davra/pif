const express = require('express')
const app = express()
const port = 3456
var count = 0

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.get('/', (req, res) => {
    res.send('davra says hello')
})
app.get('/davra', (req, res) => {
    // if (count++ % 100 === 0) console.log(`count: ${count}`)
    console.log(`count: ${++count}`)
    res.send('davra ok')
})
var timeout = null
app.post('/davra', (req, res) => {
    count++
    if (count % 100 === 0) console.log(`count: ${count} data: ${JSON.stringify(req.body)}`)
    // console.log(`count: ${count} data: ${JSON.stringify(req.body)}`)
    res.send('davra ok')
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(printTotal, 3000)
})
app.post('/biostar', (req, res) => {
    console.log('biostar webhook callback:')
    console.log(`data: ${JSON.stringify(req.body)}`)
    res.send({ success: true })
})
function printTotal () {
    console.log('Total received: ' + count)
    count = 0
}

app.listen(port, () => console.log(`listening on port ${port}`))
