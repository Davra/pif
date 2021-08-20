/* global AmCharts, moment */
// chartOccupancy
$(function () {
    function getPoiValue () {
        var key = 'poi'
        var value = decodeURIComponent(window.location.search.replace(new RegExp('^(?:.*[&\\?]' + key + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'))
        return value ? JSON.parse(value) : null
    }
    var poi = getPoiValue()
    var type = (poi && poi.user_data.title.substr(poi.user_data.title.length - 1)) || '1'
    $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/sign1.jpg'
    $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/sign1-2.jpg'
    $('.meeting-room-details .status span').text('ONLINE')
    $('.meeting-room-details .status span').addClass('online')
    $('.meeting-room-details .sync span').text('YES')
    $('.meeting-room-details .sync span').addClass('online')
    var deviceId = (poi && poi.user_data.twitter) || '' // twitter account is the deviceId
    if (type > '1') {
        $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/sign2.jpg'
        $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/sign2-2.jpg'
        $('.meeting-room-details .status span').text('OFFLINE')
        $('.meeting-room-details .status span').toggleClass('online offline')
        $('.meeting-room-details .sync span').text('NO')
        $('.meeting-room-details .sync span').toggleClass('online offline')
    }
    doCards(poi, deviceId)
    doUptime(poi, deviceId)
    doOutages(poi, deviceId)
})
function roundTo2 (num) {
    return Math.round(num * 100) / 100
}
function doCards (poi, deviceId) {
    if (deviceId) { // get data
    }
    else { // mockup data
        var data = []
        var now = new Date()
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
        for (var i = 0, n = 30; i < n; i++) {
            var fire = i === 23 ? roundTo2(10 + Math.random() * 10) : 0
            var birthdays = (i === 3 || i === 5 || i === 7 || i === 11 || i === 13 || i === 17 || i === 23 || i === 29) ? 12 : 0
            var idle = roundTo2(Math.random() * 20)
            var events = roundTo2(100 - (fire + birthdays + idle))
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
                return '<span style="display: none">' + ('' + value).padStart(12, '0') + '</span>' + formatDuration(value)
            },
            width: '35%'
        }
    ]
    if (deviceId) { // get data
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
    }
    else { // mockup data
        AmCharts.makeChart('chartUptime', chartUptimeConfig)
    }
    var width = $(window).width() * 0.98
    var height = $(window).height() * 0.98
    $('#chartUptime').width(width).height(height)
}
function formatDuration (num) {
    var days = Math.floor(num / (24 * 60 * 60 * 1000))
    num -= days * 24 * 60 * 60 * 1000
    var hours = Math.floor(num / (60 * 60 * 1000))
    num -= hours * 60 * 60 * 1000
    var minutes = Math.floor(num / (60 * 1000))
    num -= minutes * 60 * 1000
    var seconds = Math.floor(num / 1000)
    var daysText = days > 1 ? 'days ' : 'day '
    var hoursText = hours > 1 ? 'hrs ' : 'hr '
    var minutesText = minutes > 1 ? 'mins ' : 'min '
    var secondsText = seconds > 1 ? 'secs ' : 'sec '
    if (days) return days + daysText + (hours ? hours + hoursText : '')
    if (hours) return hours + hoursText + (minutes ? minutes + minutesText : '')
    if (minutes) return minutes + 'mins ' + (seconds ? seconds + secondsText : '')
    return seconds + secondsText
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
