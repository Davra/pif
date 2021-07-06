/* global d3, moment */
// chartOccupancy
$(function () {
    function getPoiValue () {
        var key = 'poi'
        var value = decodeURIComponent(window.location.search.replace(new RegExp('^(?:.*[&\\?]' + key + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'))
        return value ? JSON.parse(value) : null
    }
    var poi = getPoiValue()
    var type = (poi && poi.user_data.title.substr(poi.user_data.title.length - 1)) || '1'
    $('.address-icon.finger i').addClass('fas fa-times')
    $('.address-icon.face i').addClass('fas fa-times')
    $('.address-icon.wifi i').addClass('fas fa-times')
    $('.address-icon.display i').addClass('fas fa-times')
    $('.address-icon.keypad i').addClass('fas fa-times')
    if (type === '1') {
        $('.meeting-room-photo img')[0].src = '/microservices/wrld3d/img/FaceStation.jpg'
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
    // Create a set of sample data to plot
    var dataset = []
    for (var tmpDay = 1; tmpDay < 6; tmpDay++) {
        for (var tmpHour = 1; tmpHour < 14; tmpHour++) {
            var tmpDatapoint = {}
            tmpDatapoint.day = tmpDay
            tmpDatapoint.hour = tmpHour
            // weighted to the morning, lunch and evening rush hours
            if (tmpHour === 3 || tmpHour === 7 || tmpHour === 12) {
                tmpDatapoint.value = 0 + parseInt(Math.random() * 10)
            }
            else {
                tmpDatapoint.value = parseInt(Math.random() * 100)
            }
            dataset.push(tmpDatapoint)
        }
    }
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
    var chartOccupancy = function (data) {
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
    chartOccupancy(dataset)
})

// chartUptime
// eslint-disable-next-line no-unused-vars
var connecthingChartConfig = {
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
