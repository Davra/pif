/* global AmCharts, chart, moment */
var balloonFunction = function (item, graph) {
    var result = ''
    var key = graph.balloonText
    if (Object.prototype.hasOwnProperty.call(item.dataContext, key) && !isNaN(item.dataContext[key])) {
        var formatted = AmCharts.formatNumber(item.dataContext[key], {
            precision: chart.precision,
            decimalSeparator: chart.decimalSeparator,
            thousandsSeparator: chart.thousandsSeparator
        }, 0)
        result = formatted
    }
    return result + ' kWh'
}
// eslint-disable-next-line no-unused-vars
var connecthingChartConfig = {
    theme: 'connecthing',
    type: 'serial',
    categoryField: 'year',
    categoryAxis: {
        parseDates: false,
        dashLength: 1,
        minorGridEnabled: true,
        minPeriod: 'ss'
    },
    graphs: [{
        valueField: 'lighting',
        type: 'line',
        bullet: 'round',
        title: 'Lighting',
        balloonText: 'lighting',
        balloonFunction: balloonFunction
    },
    {
        valueField: 'hvac',
        type: 'line',
        bullet: 'round',
        title: 'HVAC',
        balloonText: 'hvac',
        balloonFunction: balloonFunction
    },
    {
        valueField: 'sockets',
        type: 'line',
        bullet: 'round',
        title: 'Sockets',
        balloonText: 'sockets',
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
            title: ''
        }
    ],
    legend: {
        position: 'bottom'
    },
    export: {
        enabled: true
    },
    dataProvider: [
        { year: 2003, lighting: 1587, hvac: 650, sockets: 121 },
        { year: 2004, lighting: 1567, hvac: 683, sockets: 146 },
        { year: 2005, lighting: 1617, hvac: 691, sockets: 138 },
        { year: 2006, lighting: 1630, hvac: 642, sockets: 127 },
        { year: 2007, lighting: 1660, hvac: 699, sockets: 105 },
        { year: 2008, lighting: 1683, hvac: 721, sockets: 109 },
        { year: 2009, lighting: 1691, hvac: 737, sockets: 112 },
        { year: 2010, lighting: 1298, hvac: 680, sockets: 101 },
        { year: 2011, lighting: 1275, hvac: 664, sockets: 97 },
        { year: 2012, lighting: 1246, hvac: 648, sockets: 93 },
        { year: 2013, lighting: 1218, hvac: 637, sockets: 101 },
        { year: 2014, lighting: 1213, hvac: 633, sockets: 87 },
        { year: 2015, lighting: 1199, hvac: 621, sockets: 79 },
        { year: 2016, lighting: 1110, hvac: 210, sockets: 81 },
        { year: 2017, lighting: 1165, hvac: 232, sockets: 75 },
        { year: 2018, lighting: 1145, hvac: 219, sockets: 88 },
        { year: 2019, lighting: 1163, hvac: 201, sockets: 82 },
        { year: 2020, lighting: 1180, hvac: 285, sockets: 87 },
        { year: 2021, lighting: 1159, hvac: 277, sockets: 71 }
    ]
}
var initTable = function (tableId, tableColumns, data) {
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
    $(tableId).DataTable(dataTableConfig)
    if (data) {
        $(tableId).dataTable().fnClearTable()
        $(tableId).dataTable().fnAddData(data)
    }
}
$().ready(function () {
    var alerts = parent.alerts
    // console.log(JSON.stringify(alerts))
    function getPoiValue () {
        var key = 'poi'
        var value = decodeURIComponent(window.location.search.replace(new RegExp('^(?:.*[&\\?]' + key + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'))
        return value ? JSON.parse(value) : null
    }
    var poi = getPoiValue()
    var id = (poi && poi.user_data.title.substr(poi.user_data.title.length - 3)) || '1'
    // var title = (poi && poi.user_data.title) || '1'
    var tableColumns = [
        {
            title: 'Time',
            data: 'timestamp',
            render: function (value, type, record) {
                return '<span style="display: none">' + value + '</span>' + moment(value).format('YYYY-MM-DD HH:mm')
            }
        },
        { title: 'Description', data: 'description', sTitle: 'Description', mData: 'description' },
        { title: 'Status', data: 'status', sTitle: 'Status', mData: 'status' }
    ]
    var data = []
    if (id === '2.1') {
        data.push({ timestamp: alerts[0].date, description: 'Overload trip alarm', status: alerts[0].open ? 'Open' : 'Acknowledged' })
        if (alerts[0].open) {
            var checkOpen = setInterval(function () {
                // console.log(alerts[0].open)
                if (!alerts[0].open) {
                    clearInterval(checkOpen)
                    data[0].status = 'Acknowledged'
                    $('#table').dataTable().fnUpdate(data[0].status, [0], 2, false)
                }
            }, 300)
        }
    }
    data.push({ timestamp: 1624208954770, description: 'Voltage loss', status: 'Acknowledged' })
    data.push({ timestamp: 1624101734770, description: 'Threshold (V) exceeded ', status: 'Closed' })
    initTable('#table', tableColumns, data)
})
