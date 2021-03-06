/* global AmCharts, moment */
var poi
var deviceId = ''
$(function () {
    poi = utils.getPoiValue()
    var type = (poi && poi.user_data.title.substr(poi.user_data.title.length - 1)) || '1'
    var now = new Date()
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 52)
    d.setFullYear(d.getFullYear() + 3)
    d.setMinutes(d.getMinutes() + 173)
    $('.meeting-room-details .sync span').text(moment(d).format('YYYY-MM'))
    $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/Beacon.png'
    $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/Beacon-2.png'
    $('.meeting-room-details .status span').text('ONLINE')
    $('.meeting-room-details .status span').addClass('online')
    // twitter account is the deviceId
    if (window.location.hostname !== 'pif.davra.com' && poi && poi.user_data.twitter) deviceId = poi.user_data.twitter
    if (type > '1') {
        $('.meeting-room-details .status span').text('OFFLINE')
        $('.meeting-room-details .status span').toggleClass('online offline')
        $('.meeting-room-details .battery-icon i').toggleClass('fa-battery-full fa-battery-quarter')
        $('.meeting-room-details .battery-icon i').addClass('low')
        $('.meeting-room-details .battery span').text('2 months')
    }
    doOccupancy(deviceId, false)
    doUptime(deviceId)
    doOutages(deviceId)
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
    if (deviceId) { // get data
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
                    datapoint.value = 0 + parseInt(Math.random() * 10)
                }
                dataset.push(datapoint)
            }
        }
        utils.chartOccupancyThreshold(dataset, allHours)
    }
}
function doOutages (deviceId) {
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
function doUptime (deviceId) {
    if (deviceId) { // get data
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
    $(tableId).dataTable().fnClearTable()
    if (data.length) $(tableId).dataTable().fnAddData(data)
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
