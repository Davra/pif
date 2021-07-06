/* global AmCharts, chart */
var data = []
var now = new Date()
var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
for (var i = 0, n = 30; i < n; i++) {
    var aqi = 8 + ((Math.random() * 60) / 10)
    // console.log(d.getDate() + '/' + (d.getMonth() + 1), aqi)
    data.push({ date: d.getDate() + '/' + (d.getMonth() + 1), aqi: aqi })
    d.setDate(d.getDate() + 1)
}
var balloonFunction = function (item, graph) {
    var result = ''
    var key = graph.balloonText
    if (Object.prototype.hasOwnProperty.call(item.dataContext, key) && !isNaN(item.dataContext[key])) {
        // console.log(item.dataContext[key], chart.precision)
        var formatted = AmCharts.formatNumber(item.dataContext[key], {
            precision: chart.precision,
            decimalSeparator: chart.decimalSeparator,
            thousandsSeparator: chart.thousandsSeparator
        }, 1)
        result = formatted
    }
    return result + ' AQI'
}
// eslint-disable-next-line no-unused-vars
var connecthingChartConfig = {
    theme: 'connecthing',
    type: 'serial',
    categoryField: 'date',
    precision: 1,
    categoryAxis: {
        parseDates: false,
        dashLength: 1,
        minorGridEnabled: true,
        minPeriod: 'ss'
    },
    graphs: [
        {
            valueField: 'aqi',
            type: 'line',
            bullet: 'round',
            title: 'AQI',
            balloonText: 'aqi',
            balloonFunction: balloonFunction
        }
    ],
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
        //   title: 'AQI',
            precision: 1,
            minimum: 0,
            maximum: 300
        }
    ],
    guides: [
        {
            fillColor: 'red',
            fillAlpha: 0.90,
            value: 100,
            toValue: 100
        }
    ],
    // 'legend: {
    //     position: 'bottom'
    // },
    export: {
        enabled: true
    },
    dataProvider: data
}
