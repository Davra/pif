/* global AmCharts, d3, moment */
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
    // var type = (poi && poi.user_data.title.substr(poi.user_data.title.length - 1)) || '1'
    var deviceId = ''
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
                    $('.meeting-room-details .address').html(location.room + '<br>' + location.floor)
                }
            }
            else {
                console.error('Desk status not found')
            }
        })
    }
    $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/reserved.jpg'
    doMetrics(poi, deviceId)
    doOccupancy(poi, deviceId)
    doUptime(poi, deviceId)
    doOutages(poi, deviceId)
})
function chartOccupancy (data) {
    var margin = { top: 40, right: 0, bottom: 100, left: 30 }
    var width = 600 - margin.left - margin.right
    var height = 270 - margin.top - margin.bottom
    var gridSize = Math.floor(width / 24)
    // var legendElementWidth = gridSize * 2,
    var legendElementWidth = gridSize * 1.33
    var buckets = 10
    // var colors = ['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58'] // alternatively colorbrewer.YlGnBu[9].
    var colors = ['#0bff00', '#70ed00', '#99db00', '#b6c700', '#cdb200', '#df9b00', '#ee8200', '#f86600', '#fe4400', '#ff0000'] // See https://colordesigner.io/gradient-generator (green to red)
    var days = ['Su', 'Mo', 'Tu', 'We', 'Th']
    // var times = ['1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a', '12a', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p', '12p']
    var times = ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18']
    var svg = d3.select('#chartOccupancy').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    svg.selectAll('.dayLabel')
        .data(days)
        .enter().append('text')
        .text(function (d) { return d })
        .attr('x', 0)
        .attr('y', function (d, i) { return i * gridSize })
        .style('text-anchor', 'end')
        .attr('transform', 'translate(-6,' + gridSize / 1.5 + ')')
        .attr('class', function (d, i) { return ((i >= 0 && i <= 4) ? 'dayLabel mono axis axis-workweek' : 'dayLabel mono axis') })
    svg.selectAll('.timeLabel')
        .data(times)
        .enter().append('text')
        .text(function (d) { return d })
        .attr('x', function (d, i) { return i * gridSize })
        .attr('y', 0)
        .style('text-anchor', 'middle')
        .attr('transform', 'translate(' + gridSize / 2 + ', -6)')
        // .attr('class', function(d, i) { return ((i >= 7 && i <= 16) ? 'timeLabel mono axis axis-worktime' : 'timeLabel mono axis') })
        .attr('class', function (d, i) { return ((i >= 2 && i <= 11) ? 'timeLabel mono axis axis-worktime' : 'timeLabel mono axis') })
    var colorScale = d3.scale.quantile()
        .domain([0, buckets - 1, d3.max(data, function (d) { return d.value })])
        .range(colors)
    var cards = svg.selectAll('.hour')
        .data(data, function (d) { return d.day + ':' + d.hour })
    cards.append('title')
    cards.enter().append('rect')
        .attr('x', function (d) { return (d.hour - 1) * gridSize })
        .attr('y', function (d) { return (d.day - 1) * gridSize })
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('class', 'hour bordered')
        .attr('width', gridSize)
        .attr('height', gridSize)
        .style('fill', colors[0])
    cards.transition().duration(1000)
        .style('fill', function (d) { return colorScale(d.value) })
    cards.select('title').text(function (d) { return d.value })
    cards.exit().remove()
    var legend = svg.selectAll('.legend')
        .data([0].concat(colorScale.quantiles()), function (d) { return d })
    legend.enter().append('g')
        .attr('class', 'legend')
    legend.append('rect')
        .attr('x', function (d, i) { return legendElementWidth * i })
        .attr('y', height)
        .attr('width', legendElementWidth)
        .attr('height', gridSize / 2)
        .style('fill', function (d, i) { return colors[i] })
    legend.append('text')
        .attr('class', 'mono')
        .text(function (d, i) {
            // console.log(d, i)
            // return '= ' + Math.round(d)
            return 100 - (i * 10) + '%'
        })
        .attr('x', function (d, i) { return legendElementWidth * i })
        .attr('y', height + gridSize)
    legend.exit().remove()
}
function doMetrics (poi, deviceId) {
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
            start_absolute: endDate - (30 * 24 * 60 * 60 * 1000),
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
function doOccupancy (poi, deviceId) {
    var dataset = []
    if (deviceId) { // get data
        var oneYearAgo = new Date(); oneYearAgo.setDate(oneYearAgo.getDate() - (52 * 7)); oneYearAgo = oneYearAgo.getTime()
        var installDate = new Date(2021, 8, 17).getTime()
        if (installDate > oneYearAgo) oneYearAgo = installDate
        var numberOfWeeks = Math.floor((new Date().getTime() - oneYearAgo) / (7 * 24 * 60 * 60 * 1000)) || 1
        var data = {
            metrics: [
                {
                    name: 'hayyak.usage',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    }
                    // aggregators: [{
                    //     name: 'avg',
                    //     sampling: {
                    //         value: '1',
                    //         unit: 'hours'
                    //     }
                    // }]
                }
            ],
            start_absolute: oneYearAgo
        }
        $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(data), function (result) {
            console.log(result)
            var values = result.queries[0].results[0].values
            var day, hour, datapoint
            var datapoints = {}
            for (var i = 0, n = values.length; i < n; i++) {
                var date = new Date(values[i][0])
                var value = values[i][1]
                day = date.getDay()
                hour = date.getHours()
                datapoint = datapoints[day + '.' + hour]
                if (datapoint) {
                    datapoint.value += value
                }
                else {
                    datapoint = { day: day, hour: hour, value: value }
                    datapoints[datapoint.day + '.' + datapoint.hour] = datapoint
                }
            }
            for (day = 0; day < 5; day++) {
                for (hour = 6; hour < 19; hour++) {
                    datapoint = datapoints[day + '.' + hour]
                    if (!datapoint) datapoint = { day: day, hour: hour, value: 0 }
                    var perc = utils.roundTo2((datapoint.value * 100) / (numberOfWeeks * 60 * 60 * 1000))
                    dataset.push({ day: day + 1, hour: hour - 5, value: utils.roundTo2(100 - perc) })
                }
            }
            chartOccupancy(dataset)
        })
    }
    else { // mockup data
        for (var day = 1; day < 6; day++) {
            for (var hour = 1; hour < 14; hour++) {
                var datapoint = {}
                datapoint.day = day
                datapoint.hour = hour
                // weighted to the afternoon?
                if (hour >= 8 && hour <= 12) {
                    datapoint.value = 0 + parseInt(Math.random() * 10)
                }
                else {
                    datapoint.value = parseInt(Math.random() * 100)
                }
                dataset.push(datapoint)
            }
        }
        chartOccupancy(dataset)
    }
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
                name: 'hayyak.outage',
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
                data.push({ timestamp: value[0], description: 'Contact lost', duration: value[1], userId: '' })
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
    if (deviceId) {
        // get data
        var now = new Date().getTime()
        var oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1); oneDayAgo = oneDayAgo.getTime()
        var oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); oneWeekAgo = oneWeekAgo.getTime()
        var oneMonthAgo = new Date(); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1); oneMonthAgo = oneMonthAgo.getTime()
        var oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1); oneYearAgo = oneYearAgo.getTime()
        var data = {
            metrics: [
                {
                    name: 'hayyak.outage.timeslice',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'sum',
                        sampling: {
                            value: 1,
                            unit: 'days'
                        }
                    }]
                }
            ],
            start_absolute: oneYearAgo
        }
        $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(data), function (result) {
            console.log(result)
            var values = result.queries[0].results[0].values || []
            var value1 = 0
            var value2 = 0
            var value3 = 0
            var value4 = 0
            for (var i = values.length - 1; i >= 0; i--) {
                var date = values[i][0]
                var value = values[i][1]
                if (date >= oneDayAgo) value1 += value
                if (date >= oneWeekAgo) value2 += value
                if (date >= oneMonthAgo) value3 += value
                if (date >= oneYearAgo) value4 += value
            }
            var perc1 = utils.roundTo2((value1 * 100) / (now - oneDayAgo))
            var perc2 = utils.roundTo2((value2 * 100) / (now - oneWeekAgo))
            var perc3 = utils.roundTo2((value3 * 100) / (now - oneMonthAgo))
            var perc4 = utils.roundTo2((value4 * 100) / (now - oneYearAgo))
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
    return result + (key === 'cpu' ? '%' : '\u00B0' + 'C')
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
        title: 'Temp' + '\u00B0' + 'C',
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
