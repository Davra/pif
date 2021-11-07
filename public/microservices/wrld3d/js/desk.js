/* global moment */
var installDate = Date.UTC(2021, 8, 15, 19, 0, 0) // Sept 15
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
    var deviceId = ''
    // twitter account is the deviceId
    if (window.location.hostname !== 'pif.davra.com' && poi && poi.user_data.twitter) deviceId = 'h' + poi.user_data.twitter
    if (deviceId) {
        $.get(poi.davraMs + '/desk/status/' + encodeURIComponent(deviceId), function (result) {
            if (result.success) {
                console.log('Desk status', result.data)
                $('.meeting-room-details .status span').removeClass('offline online checked-in')
                if (result.data.status === 'Available') {
                    $('.meeting-room-details .status span').addClass('online')
                    $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/available.jpg'
                }
                else if (result.data.status === 'Checked In') {
                    $('.meeting-room-details .status span').addClass('checked-in')
                    $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/checked-in.jpg'
                }
                else {
                    $('.meeting-room-details .status span').addClass('offline')
                    $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/reserved.jpg'
                }
                $('.meeting-room-details .status span').text(result.data.status)
                $('.meeting-room-details .address').html(result.data.address.join('<br>'))
            }
            else {
                console.error('Desk status not found')
            }
        })
    }
    else if (type === '1') $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/available.jpg'
    else if (type === '2') $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/checked-in.jpg'
    else $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/reserved.jpg'
    doOccupancy(deviceId)
    // utils.doUptime(deviceId)
    doIncidents(deviceId)
    digsig.doAnomaly(deviceId)
})
function doOccupancy (deviceId) {
    var dataset = []
    if (deviceId) { // get data
        var oneYearAgo = new Date(); oneYearAgo.setDate(oneYearAgo.getDate() - (52 * 7)); oneYearAgo = oneYearAgo.getTime()
        if (installDate > oneYearAgo) oneYearAgo = installDate
        var numberOfWeeks = Math.floor((new Date().getTime() - oneYearAgo) / (7 * 24 * 60 * 60 * 1000)) || 1
        var data = {
            metrics: [
                {
                    name: 'desk.usage.count',
                    limit: 100000,
                    tags: {
                        serialNumber: deviceId
                    },
                    aggregators: [{
                        name: 'sum',
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
            for (var i = 0, n = values.length; i < n; i++) {
                var date = new Date(values[i][0])
                var value = values[i][1] * 60 * 1000
                day = date.getUTCDay()
                hour = date.getUTCHours() + 3 // Riyadh is always UTC + 3 with no daylight savings
                if (hour > 23) {
                    hour -= 24
                    day += 1
                }
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
                    dataset.push({ day: day + 1, hour: hour - 5, value: perc })
                }
            }
            utils.chartOccupancyThreshold(dataset)
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
                    datapoint.value = 70 + parseInt(Math.random() * 30)
                }
                else {
                    datapoint.value = parseInt(Math.random() * 100)
                }
                dataset.push(datapoint)
            }
        }
        utils.chartOccupancyThreshold(dataset)
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
        // { title: 'User', data: 'userId', width: '25%' }
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
                name: 'desk.outage',
                limit: 100000,
                tags: {
                    serialNumber: deviceId
                }
            // },
            // {
            //     name: 'davra.digitalSignatures.Desk',
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
