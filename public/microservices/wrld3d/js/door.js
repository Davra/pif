/* global moment */
var installDate = Date.UTC(2021, 6, 4, 1, 19, 16) // July 4
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
    var type = (poi && poi.user_data.title.substr(poi.user_data.title.length - 1)) || '1'
    $('.address-icon.finger i').addClass('fas fa-times')
    $('.address-icon.face i').addClass('fas fa-times')
    $('.address-icon.wifi i').addClass('fas fa-times')
    $('.address-icon.display i').addClass('fas fa-times')
    $('.address-icon.keypad i').addClass('fas fa-times')
    // twitter account is the deviceId
    if (window.location.hostname !== 'pif.davra.com' && poi && poi.user_data.twitter) deviceId = poi.user_data.twitter
    if (deviceId) {
        $.get(poi.davraMs + '/door/capability/' + encodeURIComponent(deviceId), function (result) {
            if (!result.success) {
                console.error('Door capability failed: ' + result.message)
            }
            else {
                console.log('Door capability', result.data)
                if (result.data.finger) $('.address-icon.finger i').removeClass('fa-times').addClass('fa-check')
                if (result.data.face) $('.address-icon.face i').removeClass('fa-times').addClass('fa-check')
                if (result.data.display) $('.address-icon.display i').removeClass('fa-times').addClass('fa-check')
                if (result.data.keypad) $('.address-icon.keypad i').removeClass('fa-times').addClass('fa-check')
            }
        })
        $.get(poi.davraMs + '/door/status/' + encodeURIComponent(deviceId), function (result) {
            if (result.success) {
                console.log('Door status', result.status)
                if (result.status) {
                    $('.meeting-room-details .status span').removeClass('offline').addClass('online')
                    $('.meeting-room-details .status span').text('ONLINE')
                }
                else {
                    $('.meeting-room-details .status span').removeClass('online').addClass('offline')
                    $('.meeting-room-details .status span').text('OFFLINE')
                }
            }
        })
        // facebook account is the device type
        type = poi.user_data.facebook
        if (type === '1') $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/FaceStationF2.jpg'
        else if (type === '2') $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/SpeedBlade.png'
        else $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/FaceStationF2.jpg'
    }
    else if (type === '1') {
        $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/FaceStationF2.jpg'
        $('.address-icon.finger i').removeClass('fa-times').addClass('fa-check')
        $('.address-icon.face i').removeClass('fa-times').addClass('fa-check')
        $('.address-icon.display i').removeClass('fa-times').addClass('fa-check')
        $('.address-icon.keypad i').removeClass('fa-times').addClass('fa-check')
    }
    else if (type === '2') {
        $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/FaceLite.png'
        $('.address-icon.finger i').removeClass('fa-times').addClass('fa-check')
        $('.address-icon.face i').removeClass('fa-times').addClass('fa-check')
        $('.address-icon.display i').removeClass('fa-times').addClass('fa-check')
    }
    else {
        $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/SpeedBlade.png'
    }
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
function doOccupancy (deviceId, allHours) {
    var dataset = []
    if (deviceId) {
        var oneYearAgo = new Date(); oneYearAgo.setDate(oneYearAgo.getDate() - (52 * 7)); oneYearAgo = oneYearAgo.getTime()
        if (installDate > oneYearAgo) oneYearAgo = installDate
        var numberOfWeeks = Math.floor((new Date().getTime() - oneYearAgo) / (7 * 24 * 60 * 60 * 1000)) || 1
        var data = {
            metrics: [{
                name: 'door.access',
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
            }],
            start_absolute: oneYearAgo
        }
        $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(data), function (result) {
            console.log(result)
            var values = result.queries[0].results[0].values
            var day, hour, datapoint
            var datapoints = {}
            // for (day = 0; day < 5; day++) {
            //     for (hour = 6; hour < 19; hour++) {
            //         datapoint = { day: day + 1, hour: hour - 5, count: 0, value: 0 }
            //         dataset.push(datapoint)
            //         datapoints[day + '.' + hour] = datapoint
            //     }
            // }
            for (day = 0; day < (allHours ? 7 : 5); day++) {
                for (hour = (allHours ? 0 : 6); hour < (allHours ? 24 : 19); hour++) {
                    datapoint = { day: day + 0, hour: hour - (allHours ? 0 : 6), count: 0, value: 0 }
                    dataset.push(datapoint)
                    datapoints[day + '.' + hour] = datapoint
                }
            }
            // var min = 0
            // var max = 0
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
                // if (min === 0) min = count
                // if (min > count) min = count
                // if (max < count) max = count
            }
            // var spread = max - min
            // if (spread > 0) {
            for (i = 0, n = dataset.length; i < n; i++) {
                datapoint = dataset[i]
                // datapoint.value = (datapoint.count - min) * 100 / spread
                datapoint.value = datapoint.count / numberOfWeeks
            }
            // }
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
                // weighted to the morning, lunch and evening rush hours
                if (hour === (allHours ? 8 : 2) || hour === (allHours ? 12 : 6) || hour === (allHours ? 17 : 11)) {
                    datapoint.value = 50 + parseInt(Math.random() * 50)
                }
                else {
                    datapoint.value = parseInt(Math.random() * 60)
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
            width: '30%'
        },
        {
            title: 'Type',
            data: 'type',
            width: '20%'
        },
        {
            title: 'Description',
            data: 'duration',
            render: function (value, type, record) {
                if (record.type === 'Outage') {
                    return value ? ('<span style="display: none">' + ('' + value).padStart(12, '0') + '</span>' + utils.formatDuration(value)) : ''
                }
                else {
                    return '<span style="display: none">' + record.eventType + '</span>' + record.eventType
                }
            },
            width: '50%'
        }
    ]
    if (deviceId) {
        // var endDate = new Date().getTime()
        $.get(poi.davraUrl + '/api/v1/twins?digitalTwinTypeName=stateful_incident&labels.id=' + deviceId, function (incidents) {
            var i, n, incident, attrs, duration, type, eventType
            for (i = 0, n = incidents.length; i < n; i++) {
                incident = incidents[i]
                attrs = incident.customAttributes
                duration = attrs.endDate ? attrs.endDate - attrs.startDate : 0
                type = incident.labels.event === 'failure' ? 'Failure' : 'Outage'
                eventType = incident.labels.event === 'failure' ? attrs.eventType || attrs.event.event_type_id.code : ''
                data.push({ timestamp: attrs.startDate, type: type, duration: duration, eventType: eventType })
            }
            initTable('#table', tableColumns, data)
            utils.doUptime(deviceId, incidents, installDate)
        })
        /*
        var query = {
            metrics: [{
                name: 'door.outage',
                limit: 100000,
                tags: {
                    serialNumber: deviceId
                }
            // },
            // {
            //     name: 'davra.digitalSignatures.Door',
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
            { timestamp: 1624312564770, type: 'Outage', duration: 170440000, eventType: '' },
            { timestamp: 1624208954770, type: 'Failure', duration: 0, eventType: 'ACCESS_DENIED' },
            { timestamp: 1624305344770, type: 'Outage', duration: 33000, eventType: '' },
            { timestamp: 1624101734770, type: 'Outage', duration: 22000, eventType: '' }
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
