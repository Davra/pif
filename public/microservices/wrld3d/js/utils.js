/* global d3 */
var utils = {}
utils.chartOccupancy = function (data) {
    var margin = { top: 40, right: 0, bottom: 100, left: 30 }
    var width = 720 - margin.left - margin.right
    var height = 300 - margin.top - margin.bottom
    var gridSize = Math.floor(width / 24)
    // var legendElementWidth = gridSize * 2,
    var legendElementWidth = gridSize * 1.33
    // var buckets = 10
    var buckets = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    // var colors = ['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58'] // alternatively colorbrewer.YlGnBu[9].
    // var colors = ['#0bff00', '#70ed00', '#99db00', '#b6c700', '#cdb200', '#df9b00', '#ee8200', '#f86600', '#fe4400', '#ff0000'] // See https://colordesigner.io/gradient-generator (green to red)
    // var colors = ['#ff0000', '#fe4400', '#f86600', '#ee8200', '#df9b00', '#cdb200', '#b6c700', '#99db00', '#70ed00', '#0bff00'] // See https://colordesigner.io/gradient-generator (green to red)
    var colors = ['#FCFCFC', '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1'] // See PIF Delivery channel
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
    // var colorScale = d3.scale.quantile()
    //     .domain([0, buckets - 1, d3.max(data, function (d) { return d.value })])
    //     .range(colors)
    // console.log(colorScale.quantiles())
    var colorScale = d3.scale.threshold()
        .domain(buckets)
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
        // .data([0].concat(colorScale.quantiles()), function (d) { return d })
        .data([0].concat(buckets), function (d) { return d })
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
            // return 100 - (i * 10) + '%'
            return ((i + 1) * 10) + '%'
        })
        .attr('x', function (d, i) { return legendElementWidth * i })
        .attr('y', height + gridSize)
    legend.exit().remove()
}
utils.formatDate = function (date, format) {
    var d, ds, d0, M, M0, y, yy
    if (!date) return ''
    y = date.getFullYear()
    yy = y.toString().substr(-2)
    M = '' + (date.getMonth() + 1)
    d = '' + date.getDate()
    M0 = M.length === 1 ? '0' + M : M
    d0 = d.length === 1 ? '0' + d : d
    ds = (format && format.dateSeparator) || '-'
    switch ((format && format.dateFormat) || 'iso8601') {
    case 'mdyyyy':
        return (M + ds + d + ds + y)
    case 'mmddyyyy':
        return (M0 + ds + d0 + ds + y)
    case 'ddmmyyyy':
        return (d0 + ds + M0 + ds + y)
    case 'mmyy':
        return (M0 + ' ' + yy)
    case 'dm':
        return (d + ds + M)
    case 'iso8601':
        return (y + ds + M0 + ds + d0)
    default: // 'dmyyyy'
        return (d + ds + M + ds + y)
    }
}
utils.formatDuration = function (num) {
    if (num === undefined || isNaN(num)) return ''
    var days = Math.floor(num / (24 * 60 * 60 * 1000))
    num -= days * 24 * 60 * 60 * 1000
    var hours = Math.floor(num / (60 * 60 * 1000))
    num -= hours * 60 * 60 * 1000
    var minutes = Math.floor(num / (60 * 1000))
    num -= minutes * 60 * 1000
    var seconds = Math.floor(num / 1000)
    var daysText = days === 1 ? 'day ' : 'days '
    var hoursText = hours === 1 ? 'hr ' : 'hrs '
    var minutesText = minutes === 1 ? 'min ' : 'mins '
    var secondsText = seconds === 1 ? 'sec ' : 'secs '
    if (days) return days + daysText + (hours ? hours + hoursText : '')
    if (hours) return hours + hoursText + (minutes ? minutes + minutesText : '')
    if (minutes) return minutes + minutesText + (seconds ? seconds + secondsText : '')
    return seconds + secondsText
}
utils.getPoiValue = function () {
    var key = 'poi'
    var value = decodeURIComponent(window.location.search.replace(new RegExp('^(?:.*[&\\?]' + key + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'))
    return value ? JSON.parse(value) : null
}
utils.roundTo2 = function (num) {
    return Math.round(num * 100) / 100
}
