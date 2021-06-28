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
        }
    }]

    if (!extraColumns && !data) {
        // $('.sample-data-msg').show();
        // var sampleData  = widgetUtils.getSampleDataForEventTable4Columns()
        // extraColumns = sampleData.columns;
        extraColumns = [
            { title: 'Description', data: 'description', sTitle: 'Description', mData: 'description' },
            { title: 'Status', data: 'status', sTitle: 'Status', mData: 'status' }
        ]
        // data = sampleData.data;
        data = [
            { timestamp: 1624312564770, description: 'Overload trip alarm', status: 'Open' },
            { timestamp: 1624208954770, description: 'Voltage loss', status: 'Acknowledged' },
            // { timestamp: 1624305344770, description: 'Speed Alert', status: 'Some further details here' },
            { timestamp: 1624101734770, description: 'Threshold (V) exceeded ', status: 'Closed' }
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
        order: [[0, 'desc']]
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
