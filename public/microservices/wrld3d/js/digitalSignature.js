/* global AmCharts, moment, poi */
var digsig = {}
var uuid
// find the digital signature for the device - need to search through all sigs to find one with a matching asset
function getDigitalSignature (callback) {
    $.get(poi.davraUrl + '/api/v1/digital-signatures', function (sigs) {
        console.log('Called API for the Rule definition and got back ', sigs)
        for (var i = 0, n = sigs.length; i < n; i++) {
            var sig = sigs[i]
            var uuids = sig.assets[0].UUIDs
            for (var j = 0, m = uuids.length; j < m; j++) {
                if (uuids[j] === uuid) return callback(sig)
            }
        }
        callback(null)
    })
}
function getTimeseriesData (payload, callback) {
    $.post(poi.davraUrl + '/api/v2/timeseriesData', JSON.stringify(payload), function (result) {
        console.log('Called API for timeseries and got back ', result)
        callback(result.queries[0].results)
    })
}
var chartAnomalyConfig = {
    theme: 'connecthing',
    type: 'serial',
    categoryField: 'timestamp',
    categoryAxis: {
        parseDates: true,
        dashLength: 1,
        minorGridEnabled: true,
        minPeriod: 'ss'
    },
    graphs: [{
        valueField: '',
        type: 'line'
    }],
    chartScrollbar: {
        autoGridCount: true,
        scrollbarHeight: 40,
        oppositeAxis: false,
        offset: 30
    },
    chartCursor: {
        cursorPosition: 'mouse',
        categoryBalloonEnabled: true,
        bulletSize: 15,
        bulletsEnabled: true,
        valueBalloonsEnabled: true,
        categoryBalloonDateFormat: 'MMM DD, YYYY HH:NN'
    },
    valueAxes: [
        {
            title: ''
        }
    ],
    export: {
        enabled: true
    }
}
var digitalSignature = null
var digitalSignatureStatus = null
var asset = null
var getObservedElm = function (name, aggregator, average, observed, used) {
    if (average !== null) {
        var roundedAverage = Math.round(average * 100) / 100
        var observedAverage = Math.round(observed * 100) / 100
    }
    return '<div style="font-size:11px; margin-top: 10px;" class="clearfix">' +
        '       <div style="float:left;width:70%;"> ' +
        '       <span style="font-size: 11px;font-weight: 600;">' +
        '       <a class="datasource-link" data-name="' + name + '" data-aggregator="' + aggregator + '"><u>' + name + '</u></a>' +
        (used ? '' : ' (Not Used)') +
        '       </span>' +
        (average !== null
            ? '<br/>' + (observedAverage > roundedAverage ? 'ABOVE AVERAGE' : (observedAverage < roundedAverage ? 'BELOW AVERAGE' : 'EQUAL'))
            : '') +
        '<br/><span style="color:gray;font-size:11px;">Sampling type:  ' + aggregator + '</span>' +
        '    </div>' +
        (average !== null
            ? '<div style="float:left;width:30%;font-size:11px;text-align:right;padding-right: 5px;">' +
            '<span style="color:gray">Normal ' + roundedAverage + '</span><br/>' +
            '<span>Observed  ' + (observed === null ? '0' : observedAverage) + '</span>' +
            '</div>'
            : '') +
        '<hr/>' +
        '</div>'
}
var appendDatasources = function ($container, date, datasources, i) {
    if (i < datasources.length) {
        var average, observed
        // var val = null

        var name = digitalSignature.datasources[i].name
        var aggregator = digitalSignature.datasources[i].aggregator
        var covMeanDatasources = digitalSignatureStatus[0].cov_mean_datasources || {}

        if (!date) {
            $container.append(
                getObservedElm(
                    name,
                    aggregator,
                    null,
                    null,
                    (covMeanDatasources[uuid] || []).indexOf(name) > -1
                )
            )
            appendDatasources($container, date, datasources, i + 1)
        }
        else {
            getTimeseriesData({
                metrics: [{
                    aggregators: [
                        {
                            name: aggregator,
                            align_start_time: true,
                            sampling: {
                                value: digitalSignature.slidingWindowSize,
                                unit: 'minutes'
                            }
                        }
                    ],
                    name: name,
                    tags: { UUID: uuid }
                }],
                start_absolute: (digitalSignatureStatus[0].time_start * 1000) - (1000 * 60 * 60 * 24 * digitalSignature.relativeLearningPeriod),
                end_absolute: digitalSignatureStatus[0].time_start * 1000
            }, function (resp) {
                resp = resp[0].values
                if (resp.length) {
                    average = resp[0][1]
                    for (var k = 1; k < resp.length; k++) {
                        average += resp[k][1]
                    }
                    average = average / resp.length

                    getTimeseriesData({
                        metrics: [{
                            aggregators: [
                                {
                                    name: aggregator,
                                    align_start_time: true,
                                    sampling: {
                                        value: digitalSignature.slidingWindowSize,
                                        unit: 'minutes'
                                    }
                                }
                            ],
                            name: name,
                            tags: { UUID: uuid }
                        }],
                        start_absolute: date.getTime() - 1000 * 60 * digitalSignature.slidingWindowSize,
                        end_absolute: date.getTime()
                    }, function (resp) {
                        resp = resp[0].values
                        observed = resp.length ? resp.pop()[1] : null

                        $container.append(
                            getObservedElm(
                                name,
                                aggregator,
                                average,
                                observed,
                                (covMeanDatasources[uuid] || []).indexOf(name) > -1
                            )
                        )
                        appendDatasources($container, date, datasources, i + 1)
                    })
                }
                else {
                    appendDatasources($container, date, datasources, i + 1)
                }
            })
        }
    }
    else {
        $('body').off('click').on('click', '.datasource-link', function () {
            var name = $(this).data('name')
            var aggregator = $(this).data('aggregator')
            $('#modalDatasource').modal('show')
            $('.modal-body').html('<div id="datasourceChart" />')
            var now = Date.now()
            getTimeseriesData({
                metrics: [{
                    aggregators: [
                        {
                            name: aggregator,
                            align_start_time: true,
                            sampling: {
                                value: digitalSignature.slidingWindowSize,
                                unit: 'minutes'
                            }
                        }
                    ],
                    name: name,
                    tags: { UUID: uuid }
                }],
                start_absolute: now - (1000 * 60 * 60 * 24 * digitalSignature.relativeLearningPeriod),
                end_absolute: now
            }, function (timeseries) {
                timeseries = timeseries[0].values
                var config = JSON.parse(JSON.stringify(chartAnomalyConfig))
                var dataProvider = []
                for (var i = 0; i < timeseries.length; i++) {
                    var obj = { timestamp: new Date(timeseries[i][0]) }
                    obj[name] = timeseries[i][1]
                    dataProvider.push(obj)
                }
                config.graphs[0].valueField = name
                config.dataProvider = dataProvider
                AmCharts.makeChart('datasourceChart', config)
                $('#datasourceChart').height($(window).height() * 0.6)
            })
            $('.modal-title').html(asset.name + '<br>' + name)
        })
    }
}
var showPointDetail = function (date, distance) {
    var html = 'Point: ' + moment(date).subtract(digitalSignature.slidingWindowSize, 'minutes').format('Do MMM YYYY, HH:mm - ') + moment(date).format('HH:mm')
    html += '&nbsp;&nbsp;&nbsp;<a id="clear_point"><u>Clear</u></a>'
    var $container = $('#point_details_info')
    $('#point_details_header').hide()
    $container.html(html)
    $('#clear_point').on('click', function () {
        $container.html('')
        appendDatasources($container, null, digitalSignature.datasources, 0)
    })
    appendDatasources($container, date, digitalSignature.datasources, 0)
}
function getStatus (cb) {
    $.get(poi.davraUrl + '/api/v1/digital-signatures/' + digitalSignature.UUID + '/attachments/status', function (result) {
        cb(result ? JSON.parse(result) : [])
    })
}
function clickGraphItem (chart, dataProvider, index) {
    showPointDetail(dataProvider[index].timestamp, dataProvider[index].name)
    for (var i = 0; i < dataProvider.length; i++) {
        dataProvider[i].Color = '#67b7dc'
        dataProvider[i].Size = 1
    }
    dataProvider[index].Size = 15
    dataProvider[index].Color = '#0A36D6'
    chart.dataProvider = dataProvider
    chart.validateData()
    if (zoomTimer !== null) {
        clearTimeout(zoomTimer)
    }
    if (zoomStart !== null) {
        chart.zoomToIndexes(zoomStart, zoomEnd)
    }
}
var zoomStart = null
var zoomEnd = null
var zoomTimer = null
digsig.doAnomaly = function (deviceId) {
    if (!deviceId) {
        // mockup data
        return
    }
    $.get(poi.davraUrl + '/api/v1/devices?serialNumber=' + encodeURIComponent(deviceId), function (result) {
        console.log('Called devices API and got back ', result)
        result = JSON.parse(result)
        asset = result.records[0]
        uuid = asset.UUID
        // $('.asset-individual').html(asset.name)
        getDigitalSignature(function (_details) {
            if (!_details) return console.error('Digital signature not found for: ' + uuid)
            digitalSignature = _details
            // $('.title-individual').html(digitalSignature.name).attr('href', 'digital-signature-edit.html?id=' + getUrlParameter('id'))
            getStatus(function (_status) {
                digitalSignatureStatus = _status
                getTimeseriesData({
                    metrics: [{
                        name: 'davra.digitalSignatures.' + digitalSignature.name,
                        tags: {
                            UUID: uuid
                        }
                    }],
                    start_absolute: Date.now() - (1000 * 60 * 60 * 24 * digitalSignature.relativeLearningPeriod)
                }, function (timeseries) {
                    timeseries = timeseries[0].values
                    var name = 'davra.digitalSignatures.' + digitalSignature.name
                    $('#assetDetails').append('Name: ' + name + '<br>' + 'Tag: ' + asset.name)
                    if (timeseries.length) {
                        var config = JSON.parse(JSON.stringify(chartAnomalyConfig))
                        var dataProvider = []
                        for (var i = 0; i < timeseries.length; i++) {
                            var obj = { timestamp: new Date(timeseries[i][0]) }
                            obj[name] = timeseries[i][1]
                            dataProvider.push(obj)
                        }
                        Object.assign(config.graphs[0], {
                            bullet: 'round',
                            bulletSize: 1,
                            lineColor: '#67b7dc',
                            bulletSizeField: 'Size',
                            lineColorField: 'Color',
                            bulletHitAreaSize: 15,
                            valueField: name,
                            balloonFunction: function (e) {
                                return (Math.round(e.values.value * 100) / 100).toString()
                            }
                        })

                        config.graphs.push({
                            valueField: 'Threshold',
                            type: 'line',
                            title: 'Anomaly Threshold: ' + digitalSignature.anomalyThreshold,
                            isThreshold: true,
                            lineColor: 'red'
                        })
                        dataProvider[0].Threshold = digitalSignature.anomalyThreshold
                        dataProvider[dataProvider.length - 1].Threshold = digitalSignature.anomalyThreshold

                        config.dataProvider = dataProvider
                        var chart = AmCharts.makeChart('chartAnomaly', config)
                        $('#chartAnomaly').height($(window).height() * 0.50)

                        chart.addListener('clickGraphItem', function (chartEvent) {
                            clickGraphItem(chart, dataProvider, chartEvent.item.index)
                        })
                        chart.addListener('zoomed', function (e) {
                            if (zoomTimer !== null) {
                                clearTimeout(zoomTimer)
                            }
                            zoomTimer = setTimeout(function () {
                                zoomStart = e.startIndex
                                zoomEnd = e.endIndex
                            }, 1000)
                        })

                        $('#point_details_header').removeClass('hide')
                    }

                    appendDatasources($('#point_details_info'), null, digitalSignature.datasources, 0)

                    if (digitalSignatureStatus.length) {
                        for (var j = 0; j < digitalSignatureStatus[0].failed_devices.length; j++) {
                            var failItem = digitalSignatureStatus[0].failed_devices[j]
                            if (failItem.UUID === uuid) {
                                var msg = 'Information: '
                                switch (failItem.code) {
                                case 1:
                                case 2:
                                    msg += 'Most recent calculation incomplete. Asset datasources did not contain sufficient data for the period.'
                                    break
                                default:
                                    msg += 'An error occurred during the most recent calculation.'
                                }
                                $('#assetDetails').append('<h5>' + msg + '</h5>')
                                break
                            }
                        }
                    }
                })
            })
        })
    })
}
