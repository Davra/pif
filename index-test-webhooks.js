// run using: screen -dm bash -c "./script.sh"
// #!/bin/bash
// cd /home/ger/davra
// node index.js &>> output.log
// everything will be logged to nohup.out
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
    console.log('davra ok: ' + count)
    res.send('davra ok: ' + count)
})
app.get('/davra/end', (req, res) => {
    console.log('davra ended ok: ' + count)
    res.send('davra ended ok: ' + count)
    process.exit(0)
})
app.post('/davra', (req, res) => {
    count++
    // const date = new Date().toISOString()
    console.log(`{ "count": ${count}, "date": "${new Date().toISOString()}", "data": ${JSON.stringify(req.body)} }`)
    res.send('davra ok: ' + count)
})
app.post('/biostar', (req, res) => {
    console.log('biostar webhook callback:')
    console.log(`data: ${JSON.stringify(req.body)}`)
    res.send({ success: true })
})

app.listen(port, () => console.log(`listening on port ${port}`))
