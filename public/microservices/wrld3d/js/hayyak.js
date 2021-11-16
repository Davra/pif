/* global AmCharts, moment */
var installDate = Date.UTC(2021, 9, 13, 15, 58, 10) // Oct 13
var poi
var deviceId = ''
$(function () {
    poi = utils.getPoiValue()
    poi.davraUrl = ''
    poi.davraMs = ''
    if (window.location.hostname === 'localhost') {
        var davraToken = localStorage.getItem('davraToken')
        $.ajaxSetup({ headers: { Authorization: 'Bearer ' + davraToken } })
        // poi.davraUrl = 'https://pif.davra.com'
        poi.davraUrl = 'https://platform.pif-stc.davra.com'
    }
    else {
        poi.davraMs = '/microservices/wrld3d'
    }
    // var type = (poi && poi.user_data.title.substr(poi.user_data.title.length - 1)) || '1'
    // twitter account is the deviceId
    if (window.location.hostname !== 'pif.davra.com' && poi && poi.user_data.twitter) deviceId = 'y' + poi.user_data.twitter
    if (deviceId) {
        $.get(poi.davraMs + '/hayyak/status/' + encodeURIComponent(deviceId), function (result) {
            if (result.success) {
                console.log('Desk status', result.data.status)
                if (result.data.status === 'Offline') {
                    $('.meeting-room-details .status span').removeClass('online').addClass('offline')
                    $('.meeting-room-details .status span').text('OFFLINE')
                }
                else {
                    $('.meeting-room-details .status span').removeClass('offline').addClass('online')
                    $('.meeting-room-details .status span').text('ONLINE')
                }
                var location = result.data.location
                if (location.room) {
                    $('.meeting-room-details .address').html(location.room + '<br>' + 'Floor ' + location.floor)
                }
            }
            else {
                console.error('Desk status not found')
            }
        })
    }
    $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/hayyak.png'
    doMetrics(deviceId)
    doOccupancy(deviceId, false)
    // utils.doUptime(deviceId)
    doIncidents(deviceId)
    digsig.doAnomaly(deviceId)
})
$('#tabOccupancyPanel .allHours').on('click', function () {
    var $button = $(this)
    $('#chartOccupancy').html('')
    if ($button.hasClass('showAll')) {
        $button.removeClass('showAll')
        $button.find('i').removeClass('fas fa-compress').addClass('fas fa-expand')
        $button.attr('title', 'Show all hours')
        doOccupancy(deviceId, false)
    }
    else {
        $button.addClass('showAll')
        $button.find('i').removeClass('fas fa-expand').addClass('fas fa-compress')
        $button.attr('title', 'Show working hours')
        doOccupancy(deviceId, true)
    }
})
function doMetrics (deviceId) {
    if (deviceId) { // get data
        var endDate = new Date().getTime()
        var data = {
            metrics: [
                {
                    name: 'hayyak.cpu',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'avg',
                        sampling: {
                            value: '1',
                            unit: 'days'
                        }
                    }]
                },
                {
                    name: 'hayyak.temp',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'avg',
                        sampling: {
                            value: '1',
                            unit: 'days'
                        }
                    }]
                }
            ],
            start_absolute: endDate - (60 * 24 * 60 * 60 * 1000),
            end_absolute: endDate
        }
        $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(data), function (result) {
            console.log(result)
            var values1 = result.queries[0].results[0].values
            var values2 = result.queries[1].results[0].values
            var dataset = []
            for (var i = 0, n = values1.length; i < n; i++) {
                var date = new Date(values1[i][0])
                var cpu = values1[i][1]
                var temp = values2[i] ? values2[i][1] || 0 : 0
                dataset.push({ date: utils.formatDate(date, { dateFormat: 'dm', dateSeparator: '/' }), cpu: cpu, temp: temp })
            }
            chartMetricsConfig.dataProvider = dataset
            AmCharts.makeChart('chartMetrics', chartMetricsConfig)
        })
    }
    else { // mockup data
        AmCharts.makeChart('chartMetrics', chartMetricsConfig)
    }
}
function doOccupancy (deviceId, allHours) {
    var dataset = []
    if (deviceId) { // get data
        var oneYearAgo = new Date(); oneYearAgo.setDate(oneYearAgo.getDate() - (52 * 7)); oneYearAgo = oneYearAgo.getTime()
        if (installDate > oneYearAgo) oneYearAgo = installDate
        var numberOfWeeks = Math.floor((new Date().getTime() - oneYearAgo) / (7 * 24 * 60 * 60 * 1000)) || 1
        var data = {
            metrics: [
                {
                    name: 'hayyak.usage',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'sum',
                        align_sampling: true,
                        sampling: {
                            value: '1',
                            unit: 'hours'
                        }
                    }]
                }
            ],
            start_absolute: oneYearAgo
        }
        $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(data), function (result) {
            console.log(result)
            var values = result.queries[0].results[0].values
            var day, hour, datapoint
            var datapoints = {}
            for (day = 0; day < (allHours ? 7 : 5); day++) {
                for (hour = (allHours ? 0 : 6); hour < (allHours ? 24 : 19); hour++) {
                    datapoint = { day: day + 0, hour: hour - (allHours ? 0 : 6), count: 0, value: 0 }
                    dataset.push(datapoint)
                    datapoints[day + '.' + hour] = datapoint
                }
            }
            var i, n
            for (i = 0, n = values.length; i < n; i++) {
                var value = values[i]
                var date = new Date(value[0])
                var count = value[1]
                day = date.getUTCDay()
                hour = date.getUTCHours() + 3 // Riyadh is always UTC + 3 with no daylight savings
                if (hour >= 24) {
                    hour -= 24
                    day += 1
                    if (day >= 7) day -= 7
                }
                if (!allHours) {
                    if (day === 5 || day === 6) continue // skip Friday/Saturday
                    if (hour < 6 || hour >= 19) continue // skip non-office hours (Saudi time)
                }
                datapoints[day + '.' + hour].count += count
            }
            for (i = 0, n = dataset.length; i < n; i++) {
                datapoint = dataset[i]
                datapoint.value = datapoint.count / numberOfWeeks
            }
            utils.chartOccupancyQuantile(dataset, allHours)
        })
    }
    else { // mockup data
        var day, hour, datapoint
        for (day = 0; day < (allHours ? 7 : 5); day++) {
            for (hour = 0; hour < (allHours ? 24 : 13); hour++) {
                datapoint = {}
                datapoint.day = day
                datapoint.hour = hour
                // weighted to the afternoon?
                if (hour >= (allHours ? 14 : 8) && hour <= (allHours ? 17 : 11)) {
                    datapoint.value = 70 + parseInt(Math.random() * 30)
                }
                else {
                    datapoint.value = parseInt(Math.random() * 100)
                }
                dataset.push(datapoint)
            }
        }
        utils.chartOccupancyThreshold(dataset, allHours)
    }
}
function doIncidents (deviceId) {
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
        // {
        //     title: 'Type',
        //     data: 'description',
        //     width: '35%'
        // },
        {
            title: 'Duration',
            data: 'duration',
            render: function (value, type, record) {
                return value ? ('<span style="display: none">' + ('' + value).padStart(12, '0') + '</span>' + utils.formatDuration(value)) : ''
            },
            width: '50%'
        }
    ]
    if (deviceId) { // get data
        // var endDate = new Date().getTime()
        $.get(poi.davraUrl + '/api/v1/twins?digitalTwinTypeName=stateful_incident&labels.id=' + deviceId, function (incidents) {
            var i, n, incident, attrs, duration
            for (i = 0, n = incidents.length; i < n; i++) {
                incident = incidents[i]
                attrs = incident.customAttributes
                duration = attrs.endDate ? attrs.endDate - attrs.startDate : 0
                data.push({ timestamp: attrs.startDate, description: incident.description, duration: duration, userId: '' })
            }
            initTable('#table', tableColumns, data)
            utils.doUptime(deviceId, incidents, installDate)
        })
        /*
        var query = {
            metrics: [{
                name: 'hayyak.outage',
                limit: 100000,
                tags: {
                    serialNumber: deviceId
                }
            // },
            // {
            //     name: 'davra.digitalSignatures.Hayyak',
            //     limit: 100000,
            //     tags: {
            //         serialNumber: deviceId
            //     }
            }],
            start_absolute: endDate - (60 * 24 * 60 * 60 * 1000),
            end_absolute: endDate
        }
        $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(query), function (result) {
            console.log(result)
            var values1 = result.queries[0].results[0].values
            data = []
            var i, n, value
            for (i = 0, n = values1.length; i < n; i++) {
                value = values1[i]
                data.push({ timestamp: value[0], description: 'Contact lost', duration: value[1], userId: '' })
            }
            initTable('#table', tableColumns, data)
        })
        */
    }
    else { // mockup data
        data = [
            { timestamp: 1624312564770, description: 'Contact lost', duration: 170440000, userId: 'ABC123' },
            { timestamp: 1624208954770, description: 'Contact lost', duration: 11000, userId: 'D45678' },
            { timestamp: 1624305344770, description: 'Contact lost', duration: 33000, userId: 'X566489' },
            { timestamp: 1624101734770, description: 'Contact lost', duration: 22000, userId: 'AYS5412' }
        ]
        initTable('#table', tableColumns, data)
        utils.doUptime()
    }
}
function initTable (tableId, tableColumns, data) {
    var dataTableConfig = {
        dom: 'Bfrtip',
        bDestroy: true,
        pageLength: 8,
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
    $(tableId).dataTable().fnClearTable()
    if (data.length) $(tableId).dataTable().fnAddData(data)
}
var balloonFunction = function (item, graph) {
    var result = ''
    var key = graph.balloonText
    if (Object.prototype.hasOwnProperty.call(item.dataContext, key) && !isNaN(item.dataContext[key])) {
        // console.log(item.dataContext[key] + ', ' + chartMetricsConfig.precision + ', ' + key)
        var formatted = AmCharts.formatNumber(item.dataContext[key], {
            precision: chartMetricsConfig.precision
            // decimalSeparator: chartMetricsConfig.decimalSeparator,
            // thousandsSeparator: chartMetricsConfig.thousandsSeparator
        }, 0)
        result = formatted
    }
    return result + (key === 'cpu' ? '%' : '\u00B0' + 'F')
}
var chartMetricsConfig = {
    theme: 'connecthing',
    type: 'serial',
    categoryField: 'date',
    precision: 1,
    categoryAxis: {
        parseDates: false,
        dashLength: 1,
        minorGridEnabled: true,
        minPeriod: 'ss'
    },
    graphs: [{
        valueField: 'cpu',
        type: 'line',
        bullet: 'round',
        title: 'CPU%',
        balloonText: 'cpu',
        balloonFunction: balloonFunction
    },
    {
        valueField: 'temp',
        type: 'line',
        bullet: 'round',
        title: 'Temp' + '\u00B0' + 'F',
        balloonText: 'temp',
        balloonFunction: balloonFunction
    }],
    chartScrollbar: {
        autoGridCount: true,
        scrollbarHeight: 40,
        oppositeAxis: false,
        offset: 30
    },
    chartCursor: {
        cursorPosition: 'mouse',
        categoryBalloonEnabled: false
    },
    valueAxes: [
        {
            // title: ''
        }
    ],
    legend: {
        position: 'bottom'
    },
    export: {
        enabled: true
    },
    dataProvider: [
        { date: 2003, cpu: 87, temp: 65 },
        { date: 2004, cpu: 67, temp: 68.3 },
        { date: 2005, cpu: 77, temp: 69 },
        { date: 2006, cpu: 30, temp: 64 },
        { date: 2007, cpu: 60, temp: 69 },
        { date: 2008, cpu: 83, temp: 72 },
        { date: 2009, cpu: 91, temp: 73 },
        { date: 2010, cpu: 98, temp: 68 },
        { date: 2011, cpu: 75, temp: 66 },
        { date: 2012, cpu: 46, temp: 64 },
        { date: 2013, cpu: 68, temp: 63 },
        { date: 2014, cpu: 63, temp: 63 },
        { date: 2015, cpu: 99, temp: 62 },
        { date: 2016, cpu: 70, temp: 71 },
        { date: 2017, cpu: 65, temp: 73 },
        { date: 2018, cpu: 45, temp: 71 },
        { date: 2019, cpu: 63, temp: 70 },
        { date: 2020, cpu: 80, temp: 78 },
        { date: 2021, cpu: 59, temp: 77 }
    ]
}
