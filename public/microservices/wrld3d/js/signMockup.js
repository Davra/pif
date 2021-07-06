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
    if (type > '1') {
        $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/sign2.jpg'
        $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/sign2-2.jpg'
        $('.meeting-room-details .status span').text('OFFLINE')
        $('.meeting-room-details .status span').toggleClass('online offline')
        $('.meeting-room-details .sync span').text('NO')
        $('.meeting-room-details .sync span').toggleClass('online offline')
    }
})

function roundTo2 (num) {
    return Math.round(num * 100) / 100
}

// chartCards
var data = []
var now = new Date()
var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
for (var i = 0, n = 30; i < n; i++) {
    var fire = i === 23 ? 10 + roundTo2(Math.random() * 10) : 0
    var idle = i === 11 ? 5 + roundTo2(Math.random() * 20) : 0
    var remainder = 100 - (fire + idle)
    var events = roundTo2(remainder * Math.random())
    var birthdays = roundTo2(remainder - events)
    // console.log(d.getDate() + '/' + (d.getMonth() + 1), remainder, fire, idle, events, birthdays)
    data.push({ date: d.getDate() + '/' + (d.getMonth() + 1), fire: fire, idle: idle, events: events, birthdays: birthdays })
    d.setDate(d.getDate() + 1)
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
    dataProvider: data,
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

// chartUptime
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
// this overrides the function in amcharts-connecthing-widgets.js
// and is called automatically when window loads
// overridden because we have multiple charts
// eslint-disable-next-line no-unused-vars
function populateWidgetWithoutWidgetId () {
    AmCharts.makeChart('chartCards', chartCardsConfig)
    AmCharts.makeChart('chartUptime', chartUptimeConfig)
    var width = $(window).width() * 0.98
    var height = $(window).height() * 0.98
    $('#chartCards').width(width).height(height)
    $('#chartUptime').width(width).height(height)
}
var config = {}
var initTable = function (extraColumns, data) {
    // Note the trick employed here for timestamps to get sorted correctly while inside DataTables is to put the
    // timestamp in unix epoch milliseconds as the first part in a hidden span, then the date in human readable format.
    // Otherwise the sorting would be awry as it sorts the dates alphabetically.
    var tableColumns = [{
        title: 'Time',
        data: 'timestamp',
        render: function (value, type, record) {
            return '<span style="display: none">' + value + '</span>' + moment(value).format('YYYY-MM-DD HH:mm')
        },
        width: '50%'
    }]

    if (!extraColumns && !data) {
        // $('.sample-data-msg').show();
        // var sampleData  = widgetUtils.getSampleDataForEventTable4Columns()
        // extraColumns = sampleData.columns;
        extraColumns = [
            // { title: 'Desc', data: 'description', sTitle: 'Desc', mData: 'description' },
            { title: 'Duration', data: 'duration', sTitle: 'Duration', mData: 'duration', width: '35%' }
            // { title: 'User', data: 'userId', sTitle: 'User', mData: 'userId', width: '25%' }
        ]
        // data = sampleData.data;
        data = [
            { timestamp: 1624312564770, description: 'Contact lost', duration: '24hr', userId: 'ABC123' },
            { timestamp: 1624208954770, description: 'Contact lost', duration: '3hr', userId: 'D45678' },
            { timestamp: 1624305344770, description: 'Contact lost', duration: '1hr', userId: 'X566489' },
            { timestamp: 1624101734770, description: 'Contact lost', duration: '10hr', userId: 'AYS5412' }
        ]
    }
    else {
        // $('.sample-data-msg').hide();
    }

    // if (config.chartCfg && config.chartCfg.title && config.chartCfg.title.length > 0) {
    // $('.widget-header').text(config.chartCfg.title);
    // } else {
    // $('.widget-header').remove();
    // $('.widget-header-hr').remove();
    // }

    if (extraColumns) {
        Array.prototype.push.apply(tableColumns, extraColumns)
    }
    // console.log('data: ' , data);
    // var filename = config.widgetTitle + '-' + moment(new Date()).format('YYYYMMDD_HHmmss');

    // If the user saved a widgetConfig for table settings, superimpose them into the config of the table
    var dataTableConfig = {
        dom: 'Bfrtip',
        bDestroy: true,
        pageLength: 100,
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
    if (config.chartCfg && config.chartCfg.options) {
        $.extend(dataTableConfig, config.chartCfg.options)
    }

    $('#table').DataTable(dataTableConfig)
    if (data) {
        $('#table').dataTable().fnClearTable()
        $('#table').dataTable().fnAddData(data)
    }
}
$().ready(function () {
    // chart.events.on('datavalidated', function(ev) {
    // var chart = ev.target
    // chart.svgContainer.htmlElement.style.height = 350 + 'px'
    // })
    initTable(null, null)
})
