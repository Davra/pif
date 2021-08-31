/* global AmCharts, moment */
// chartOccupancy
$(function () {
    function getPoiValue () {
        var key = 'poi'
        var value = decodeURIComponent(window.location.search.replace(new RegExp('^(?:.*[&\\?]' + key + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'))
        return value ? JSON.parse(value) : null
    }
    var poi = getPoiValue()
    poi.davraUrl = ''
    poi.davraMs = ''
    if (window.location.hostname === 'localhost') {
        var davraToken = localStorage.getItem('davraToken')
        $.ajaxSetup({ headers: { Authorization: 'Bearer ' + davraToken } })
        poi.davraUrl = 'https://pif.davra.com'
    }
    else {
        poi.davraMs = '/microservices/wrld3d'
    }
    var type = (poi && poi.user_data.title.substr(poi.user_data.title.length - 1)) || '1'
    $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/sign1.jpg'
    $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/sign1-2.jpg'
    $('.meeting-room-details .status span').text('ONLINE')
    $('.meeting-room-details .status span').addClass('online')
    $('.meeting-room-details .sync span').text('YES')
    $('.meeting-room-details .sync span').addClass('online')
    var deviceId = ''
    // twitter account is the deviceId
    if (window.location.hostname !== 'pif.davra.com' && poi && poi.user_data.twitter) deviceId = 's' + poi.user_data.twitter
    if (deviceId) {
        $.get(poi.davraMs + '/sign/status/' + encodeURIComponent(deviceId), function (result) {
            if (result.success) {
                console.log('Sign status data', result.data)
                if (result.data.status === 0) {
                    $('.meeting-room-details .status span').removeClass('offline').addClass('online')
                    $('.meeting-room-details .status span').text('ONLINE')
                }
                else {
                    $('.meeting-room-details .status span').removeClass('online').addClass('offline')
                    $('.meeting-room-details .status span').text('OFFLINE')
                }
                if (result.data.sync) { // boolean
                    $('.meeting-room-details .sync span').removeClass('offline').addClass('online')
                    $('.meeting-room-details .sync span').text('YES')
                }
                else {
                    $('.meeting-room-details .sync span').removeClass('online').addClass('offline')
                    $('.meeting-room-details .sync span').text('NO')
                }
            }
            else {
                console.error('Sign status not found')
            }
        })
        // facebook account is the device type
        type = poi.user_data.facebook
        if (type > '1') {
            $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/sign2.jpg'
            $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/sign2-2.jpg'
        }
    }
    else if (type > '1') {
        $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/sign2.jpg'
        $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/sign2-2.jpg'
        $('.meeting-room-details .status span').text('OFFLINE')
        $('.meeting-room-details .status span').toggleClass('online offline')
        $('.meeting-room-details .sync span').text('NO')
        $('.meeting-room-details .sync span').toggleClass('online offline')
    }
    doProps(poi, deviceId)
    doCards(poi, deviceId)
    doUptime(poi, deviceId)
    doOutages(poi, deviceId)
})
function doProps (poi, deviceId) {
    var data = []
    var tableColumns = [
        { title: 'Key', data: 'Property', width: '50%' },
        { title: 'Value', data: 'value', width: '50%' }
    ]
    if (deviceId) { // get data
        $.get(poi.davraMs + '/sign/capability/' + encodeURIComponent(deviceId), function (result) {
            if (result.success) {
                data = result.data
                console.log('Sign capability', result.data)
            }
            else {
                console.error('Sign capability failed: ' + result.message)
            }
            initTable('#propsTable', tableColumns, data)
        })
    }
    else { // mockup data
        data = [
            { Property: 'Player.Model.Name', value: 'CRESTRON' },
            { Property: 'Player.Software.Version', value: '2.27.0' }
        ]
        initTable('#propsTable', tableColumns, data)
    }
}
// #tabCards is non-display pending redesign
function doCards (poi, deviceId) {
    if (deviceId) { // get data
    }
    else { // mockup data
        var data = []
        var now = new Date()
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
        for (var i = 0, n = 30; i < n; i++) {
            var fire = i === 23 ? utils.roundTo2(10 + Math.random() * 10) : 0
            var birthdays = (i === 3 || i === 5 || i === 7 || i === 11 || i === 13 || i === 17 || i === 23 || i === 29) ? 12 : 0
            var idle = utils.roundTo2(Math.random() * 20)
            var events = utils.roundTo2(100 - (fire + birthdays + idle))
            // console.log(d.getDate() + '/' + (d.getMonth() + 1), fire, idle, events, birthdays)
            data.push({ date: d.getDate() + '/' + (d.getMonth() + 1), fire: fire, idle: idle, events: events, birthdays: birthdays })
            d.setDate(d.getDate() + 1)
        }
        chartCardsConfig.dataProvider = data
        AmCharts.makeChart('chartCards', chartCardsConfig)
    }
    var width = $(window).width() * 0.98
    var height = $(window).height() * 0.98
    $('#chartCards').width(width).height(height)
}
function doOutages (poi, deviceId) {
    var data = []
    var tableColumns = [
        {
            title: 'Time',
            data: 'timestamp',
            render: function (value, type, record) {
                return '<span style="display: none">' + value + '</span>' + moment(value).format('YYYY-MM-DD HH:mm')
            },
            width: '50%'
        },
        {
            title: 'Duration',
            data: 'duration',
            render: function (value, type, record) {
                return '<span style="display: none">' + ('' + value).padStart(12, '0') + '</span>' + utils.formatDuration(value)
            },
            width: '35%'
        }
    ]
    if (deviceId) { // get data
        var endDate = new Date().getTime()
        var query = {
            metrics: [{
                name: 'sign.outage',
                limit: 100000,
                tags: {
                    serialNumber: deviceId
                }
            }],
            start_absolute: endDate - (30 * 24 * 60 * 60 * 1000),
            end_absolute: endDate
        }
        $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(query), function (result) {
            console.log(result)
            var values = result.queries[0].results[0].values
            data = []
            var i, n
            for (i = 0, n = values.length; i < n; i++) {
                var value = values[i]
                data.push({ timestamp: value[0], description: 'Contact lost', duration: value[1] })
            }
            initTable('#table', tableColumns, data)
        })
    }
    else { // mockup data
        data = [
            { timestamp: 1624312564770, description: 'Contact lost', duration: 170440000, userId: 'ABC123' },
            { timestamp: 1624208954770, description: 'Contact lost', duration: 11000, userId: 'D45678' },
            { timestamp: 1624305344770, description: 'Contact lost', duration: 33000, userId: 'X566489' },
            { timestamp: 1624101734770, description: 'Contact lost', duration: 22000, userId: 'AYS5412' }
        ]
        initTable('#table', tableColumns, data)
    }
}
function doUptime (poi, deviceId) {
    if (deviceId) { // get data
        var endDate = new Date().getTime()
        var data = {
            metrics: [
                {
                    name: 'sign.outage.timeslice',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'sum',
                        sampling: {
                            value: '1',
                            unit: 'days'
                        }
                    }]
                },
                {
                    name: 'sign.outage.timeslice',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'sum',
                        sampling: {
                            value: '7',
                            unit: 'days'
                        }
                    }]
                },
                {
                    name: 'sign.outage.timeslice',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'sum',
                        sampling: {
                            value: '1',
                            unit: 'months'
                        }
                    }]
                },
                {
                    name: 'sign.outage.timeslice',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'sum',
                        sampling: {
                            value: '1',
                            unit: 'years'
                        }
                    }]
                }
            ],
            start_absolute: endDate - (365 * 24 * 60 * 60 * 1000),
            end_absolute: endDate
        }
        $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(data), function (result) {
            console.log(result)
            var values1 = result.queries[0].results[0].values
            var values2 = result.queries[1].results[0].values
            var values3 = result.queries[2].results[0].values
            var values4 = result.queries[3].results[0].values
            var value1 = values1.length ? values1[values1.length - 1][1] : 0
            var value2 = values2.length ? values2[values2.length - 1][1] : 0
            var value3 = values3.length ? values3[values3.length - 1][1] : 0
            var value4 = values4.length ? values4[values4.length - 1][1] : 0
            var perc1 = utils.roundTo2((value1 * 100) / (1 * 24 * 60 * 60 * 1000))
            var perc2 = utils.roundTo2((value2 * 100) / (7 * 24 * 60 * 60 * 1000))
            var perc3 = utils.roundTo2((value3 * 100) / (30 * 24 * 60 * 60 * 1000))
            var perc4 = utils.roundTo2((value4 * 100) / (365 * 24 * 60 * 60 * 1000))
            chartUptimeConfig.dataProvider[0].uptime = utils.roundTo2(100 - perc1)
            chartUptimeConfig.dataProvider[1].uptime = utils.roundTo2(100 - perc2)
            chartUptimeConfig.dataProvider[2].uptime = utils.roundTo2(100 - perc3)
            chartUptimeConfig.dataProvider[3].uptime = utils.roundTo2(100 - perc4)
            chartUptimeConfig.dataProvider[0].downtime = perc1
            chartUptimeConfig.dataProvider[1].downtime = perc2
            chartUptimeConfig.dataProvider[2].downtime = perc3
            chartUptimeConfig.dataProvider[3].downtime = perc4
            AmCharts.makeChart('chartUptime', chartUptimeConfig)
        })
    }
    else { // mockup data
        AmCharts.makeChart('chartUptime', chartUptimeConfig)
    }
    var width = $(window).width() * 0.98
    var height = $(window).height() * 0.98
    $('#chartUptime').width(width).height(height)
}
function initTable (tableId, tableColumns, data) {
    var dataTableConfig = {
        dom: 'Bfrtip',
        bDestroy: true,
        pageLength: 5,
        pagingType: 'simple',
        info: true,
        paging: true,
        select: false,
        columns: tableColumns,
        autoWidth: false,
        order: [[0, 'desc']],
        language: {
            paginate: { previous: '<', next: '>' }
        }
    }
    $(tableId).DataTable(dataTableConfig)
    if (data) {
        $(tableId).dataTable().fnClearTable()
        $(tableId).dataTable().fnAddData(data)
    }
}
var chartCardsConfig = {
    type: 'serial',
    theme: 'light',
    legend: {
        horizontalGap: 10,
        verticalGap: 3,
        maxColumns: 2,
        position: 'top',
        useGraphSettings: true,
        markerSize: 10,
        labelWidth: 60,
        valueWidth: 20
    },
    dataProvider: [],
    valueAxes: [{
        stackType: '100%',
        axisAlpha: 0.5,
        gridAlpha: 0
    }],
    graphs: [{
        balloonText: '<b>[[title]]</b><br><span style="font-size:14px">[[category]]: <b>[[value]]%</b></span>',
        fillColors: '#ff0000',
        fillAlpha: 1,
        fillAlphas: 0.8,
        labelText: '[[value]]',
        lineAlpha: 0.3,
        title: 'Fire',
        type: 'column',
        color: '#000000',
        valueField: 'fire'
    }, {
        balloonText: '<b>[[title]]</b><br><span style="font-size:14px">[[category]]: <b>[[value]]%</b></span>',
        fillColors: '#cccccc',
        fillAlpha: 1,
        fillAlphas: 0.8,
        labelText: '[[value]]',
        lineAlpha: 0.3,
        title: 'Idle',
        type: 'column',
        color: '#000000',
        valueField: 'idle'
    }, {
        balloonText: '<b>[[title]]</b><br><span style="font-size:14px">[[category]]: <b>[[value]]%</b></span>',
        fillColors: '#0000ff',
        fillAlpha: 1,
        fillAlphas: 0.8,
        labelText: '[[value]]',
        lineAlpha: 0.3,
        title: 'Events',
        type: 'column',
        color: '#000000',
        valueField: 'events'
    }, {
        balloonText: '<b>[[title]]</b><br><span style="font-size:14px">[[category]]: <b>[[value]]%</b></span>',
        fillColors: '#ffff00',
        fillAlpha: 1,
        fillAlphas: 0.8,
        labelText: '[[value]]',
        lineAlpha: 0.3,
        title: 'Birthdays',
        type: 'column',
        color: '#000000',
        valueField: 'birthdays'
    }],
    rotate: false,
    categoryField: 'date',
    categoryAxis: {
        gridPosition: 'start',
        axisAlpha: 0,
        gridAlpha: 0,
        position: 'left'
    },
    export: {
        enabled: true
    }
}
var chartUptimeConfig = {
    type: 'serial',
    theme: 'light',
    legend: {
        horizontalGap: 10,
        verticalGap: 3,
        maxColumns: 2,
        position: 'top',
        useGraphSettings: true,
        markerSize: 10
    },
    fillColors: ['green', 'red'],
    dataProvider: [
        { year: 'Last day', uptime: 99.0, downtime: 1.0 },
        { year: 'Last week', uptime: 99.9, downtime: 0.1 },
        { year: 'Last month', uptime: 97.5, downtime: 2.5 },
        { year: 'Last year', uptime: 99.9, downtime: 0.1 }
    ],
    valueAxes: [{
        stackType: '100%',
        axisAlpha: 0.5,
        gridAlpha: 0
    }],
    graphs: [{
        balloonText: '<b>[[title]]</b><br><span style="font-size:14px">[[category]]: <b>[[value]]%</b></span>',
        fillColors: '#008800',
        fillAlpha: 1,
        // "pattern": {
        //     "url": "https://www.amcharts.com/lib/3/patterns/black/pattern8.png",
        //     "width": 4,
        //     "height": 4
        // },
        fillAlphas: 0.8,
        labelText: '[[value]]',
        lineAlpha: 0.3,
        title: 'Uptime',
        type: 'column',
        color: '#000000',
        valueField: 'uptime'
    }, {
        balloonText: '<b>[[title]]</b><br><span style="font-size:14px">[[category]]: <b>[[value]]%</b></span>',
        fillColors: '#ff0000',
        fillAlpha: 1,
        fillAlphas: 0.8,
        labelText: '[[value]]',
        lineAlpha: 0.3,
        title: 'Downtime',
        type: 'column',
        color: '#000000',
        valueField: 'downtime'
    }],
    rotate: true,
    categoryField: 'year',
    categoryAxis: {
        gridPosition: 'start',
        axisAlpha: 0,
        gridAlpha: 0,
        position: 'left'
    },
    export: {
        enabled: true
    }
}
