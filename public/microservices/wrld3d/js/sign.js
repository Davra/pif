/* global AmCharts, moment */
var installDate = Date.UTC(2021, 9, 30) // Oct 30
var poi
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
    doProps(deviceId)
    doCards(deviceId)
    // utils.doUptime(deviceId)
    doIncidents(deviceId)
    digsig.doAnomaly(deviceId)
})
function doProps (deviceId) {
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
function doCards (deviceId) {
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
                name: 'sign.outage',
                limit: 100000,
                tags: {
                    serialNumber: deviceId
                }
            // },
            // {
            //     name: 'davra.digitalSignatures.Sign',
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
                data.push({ timestamp: value[0], description: 'Contact lost', duration: value[1] })
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
