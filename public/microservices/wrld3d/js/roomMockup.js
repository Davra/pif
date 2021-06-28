/* global d3 */
// chartOccupancy
$(function () {
    // Create a set of sample data to plot
    var dataset = []
    for (var tmpDay = 1; tmpDay < 6; tmpDay++) {
        for (var tmpHour = 1; tmpHour < 14; tmpHour++) {
            var tmpDatapoint = {}
            tmpDatapoint.day = tmpDay
            tmpDatapoint.hour = tmpHour
            if ((tmpDay === 1 || tmpDay === 2) && tmpHour >= 3 && tmpHour <= 7) {
                tmpDatapoint.value = 0 + parseInt(Math.random() * 10)
            }
            else {
                tmpDatapoint.value = parseInt(Math.random() * 100)
            }
            dataset.push(tmpDatapoint)
        }
    }
    var margin = { top: 20, right: 0, bottom: 100, left: 30 }
    var width = 600 - margin.left - margin.right
    var height = 260 - margin.top - margin.bottom
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

// chartComfort
$(function () {
    // Create a set of sample data to plot
    var dataset = []
    for (var tmpDay = 1; tmpDay < 6; tmpDay++) {
        for (var tmpHour = 1; tmpHour < 14; tmpHour++) {
            var tmpDatapoint = {}
            tmpDatapoint.day = tmpDay
            tmpDatapoint.hour = tmpHour
            tmpDatapoint.value = parseInt(Math.random() * 100)
            dataset.push(tmpDatapoint)
        }
    }
    var margin = { top: 20, right: 0, bottom: 100, left: 30 }
    var width = 600 - margin.left - margin.right
    var height = 260 - margin.top - margin.bottom
    var gridSize = Math.floor(width / 24)
    // var legendElementWidth = gridSize*2
    var legendElementWidth = gridSize * 1.33
    var buckets = 10
    // var colors = ['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58'], // alternatively colorbrewer.YlGnBu[9].
    var colors = ['#ffffff', '#efffe9', '#dfffd3', '#ceffbc', '#bbffa6', '#a7ff8f', '#90ff77', '#76ff5d', '#53ff3e', '#00ff00'] // See https://colordesigner.io/gradient-generator (white to green)
    var days = ['Su', 'Mo', 'Tu', 'We', 'Th']
    // var times = ['1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a', '12a', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p', '12p']
    var times = ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18']
    var svg = d3.select('#chartComfort').append('svg')
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
    var chartComfort = function (data) {
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
                return '>=' + i
            })
            .attr('x', function (d, i) { return legendElementWidth * i })
            .attr('y', height + gridSize)
        legend.exit().remove()
    }
    chartComfort(dataset)
})
