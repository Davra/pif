/* global AmCharts, L, WrldCompassControl, WrldIndoorControl, WrldSearchbar, WrldMarkerController */
// https://maps.wrld3d.com/?lat=24.760670&lon=46.639152&zoom=14.868738475598787&coverage_tree_manifest=https://cdn-webgl.eegeo.com/coverage-trees/vjsdavra/v38/manifest.bin.gz
// https://mapdesigner.wrld3d.com/poi/latest/?&coverage_tree_manifest=https://cdn-webgl.eegeo.com/coverage-trees/vjsdavra/v38/manifest.bin.gz
var alerts = []
$(function () {
    var prefix = window.location.hostname === 'localhost' ? '' : '/microservices/wrld3d'
    var map = L.Wrld.map('map', '8d2d6eef6635955569c400073255f501', {
        // center: [37.7952, -122.4028],
        center: [24.763289081785917, 46.63878573585767], // Riyadh
        zoom: 17,
        indoorsEnabled: true,
        coverageTreeManifest: 'https://cdn-webgl.eegeo.com/coverage-trees/vjsdavra/v38/manifest.bin.gz'
    })
    map.themes.setTheme(
        L.Wrld.themes.season.Summer,
        L.Wrld.themes.time.Day,
        L.Wrld.themes.weather.Clear
    )
    new WrldCompassControl('compass-container', map) // eslint-disable-line no-new
    new WrldIndoorControl('indoor-container', map) // eslint-disable-line no-new
    // https://www.wrld3d.com/wrld.js/latest/docs/api/Widgets/WrldMarkerController/#iconkey-values
    var searchbarConfig = {
        apiKey: '8d2d6eef6635955569c400073255f501',
        skipYelpSearch: true,
        overrideIndoorSearchMenuItems: true,
        outdoorSearchMenuItems: [
            { name: 'Access Control Devices', searchTag: 'badge_reader', iconKey: 'badge_reader' },
            { name: 'Air Quality', searchTag: 'air_quality', iconKey: 'air_quality' },
            { name: 'Beacons', searchTag: 'positioning_beacon', iconKey: 'positioning_beacon' },
            { name: 'Digital Signage', searchTag: 'message', iconKey: 'message' },
            { name: 'Fire Systems', searchTag: 'fire_extinguisher', iconKey: 'fire_extinguisher' },
            { name: 'Hayyak devices', searchTag: 'smart_post', iconKey: 'smart_post' },
            { name: 'Hot desks', searchTag: 'desk_available', iconKey: 'desk_available' },
            { name: 'HVAC/Lighting/Electrical', searchTag: 'electricity_meter', iconKey: 'electricity_meter' },
            { name: 'Meeting Rooms', searchTag: 'meeting_room', iconKey: 'meeting_room' },
            // { name: 'Screens', searchTag: 'video_conference', iconKey: 'video_conference' },
            // { name: 'Alerts', searchTag: 'alert', iconKey: 'alert' },
            { name: 'Around Me', searchTag: '', iconKey: 'aroundme' }
        ]
    }
    var searchbar = new WrldSearchbar('searchbar-container', map, searchbarConfig)
    var markerController = new WrldMarkerController(map, {
        // searchbar: searchbar,
        poiViewsEnabled: true
    })
    $('#searchbar-container .text-field-container input')[0].placeholder = ''
    searchbar.on('menuopen', function (e) {
        var checkExist = setInterval(function () {
            if ($('#searchbar-container .header-container .header-text').length) {
                $('#searchbar-container .header-container .header-text')[0].innerHTML = 'Menu'
                $('#searchbar-container .header-container .header-text').show()
                clearInterval(checkExist)
            }
        }, 100)
    })

    var pendingFloorIndex = 0
    var pendingMarkerId = 0
    map.indoors.on('indoormapenter', function (e) {
        // console.log('Entered an indoor map')
        $('#wrld-indoor-map-watermark0').hide()
        // $('.eegeo-indoor-control')[0].style.height = 147
        // $('.eegeo-floor-slider')[0].style.height = 81
        // the floor slider sets 3D mode on mousedown, so reflect the status here
        $('.eegeo-floor-slider-thumb').mousedown(function () {
            $('.tilt-button').attr('data-mode', '3d')
            $('.tilt-button').text('2D')
        })
        if (pendingFloorIndex) {
            map.indoors.setFloor(pendingFloorIndex)
            pendingFloorIndex = 0
        }
        else {
            setTimeout(function () {
                markerController.showMarker(pendingMarkerId)
                markerController.openPoiView(pendingMarkerId)
                pendingMarkerId = 0
            }, 1000)
        }
    })
    map.indoors.on('indoormapfloorchange', function (e) {
        console.log('Floor changed on indoor map')
        if (pendingMarkerId) {
            setTimeout(function () {
                markerController.showMarker(pendingMarkerId)
                markerController.openPoiView(pendingMarkerId)
                pendingMarkerId = 0
            }, 1000)
        }
    })
    $('.tilt-button').click(function (e) {
        e.preventDefault()
        var mode = $(this).attr('data-mode')
        if (mode === '3d') {
            $(this).attr('data-mode', '2d')
            $(this).text('3D')
            map.setCameraTiltDegrees(0)
        }
        else {
            $(this).attr('data-mode', '3d')
            $(this).text('2D')
            map.setCameraTiltDegrees(45)
        }
    })
    $('.leaflet-control-zoom-in').click(function (e) {
        e.preventDefault()
        var zoom = map.getZoom()
        var center = map.getCenter()
        map.setView(center, zoom + 1)
    })
    $('.leaflet-control-zoom-out').click(function (e) {
        e.preventDefault()
        var zoom = map.getZoom()
        var center = map.getCenter()
        map.setView(center, zoom - 1)
    })
    searchbar.on('searchresultselect', handleResult)

    function handleResult (event) {
        console.log(JSON.stringify(event.result.data))
        goToResult(event.result.data)
    }
    function goToResult (result) {
        var markerId = result.id
        var markerOptions = {
            isIndoor: result.indoor,
            indoorId: result.indoor_id,
            floorIndex: result.floor_id,
            poiView: {
                title: result.title,
                subtitle: result.subtitle,
                tags: result.tags.split(' '),
                address: '',
                phone: '',
                web: '',
                email: '',
                facebook: '',
                twitter: '',
                imageUrl: result.user_data.image_url,
                description: ''
            },
            iconKey: result.tags.split(' ')[0]
        }
        if (markerOptions.iconKey === 'positioning_beacon') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = prefix + '/beacon/' + result.id
            markerOptions.poiView.customViewHeight = 400
        }
        // var airMockup = 'https://wrld-data-service.s3-us-west-2.amazonaws.com/staging/mock-pois/yanzi-Single-POI/index.html?intervalHours=24&cardType=AirQuality&primaryMaxLimit=500&secondaryMaxLimit=1000&poi=%7B%22id%22%3A2999591%2C%22title%22%3A%22Meeting%20Room%20Air%20Quality%22%2C%22subtitle%22%3A%22Big%20Meeting%20Room%20Comfort%20Sensor%200B7F%22%2C%22tags%22%3A%22air_quality_good%20air_quality%22%2C%22lat%22%3A56.4600566%2C%22lon%22%3A-2.9782328%2C%22height_offset%22%3A0%2C%22indoor%22%3Atrue%2C%22indoor_id%22%3A%22westport_house%22%2C%22floor_id%22%3A2%2C%22user_data%22%3A%7B%22custom_view%22%3A%22https%3A%2F%2Fwrld-data-service.s3-us-west-2.amazonaws.com%2Fstaging%2Fmock-pois%2Fyanzi-Single-POI%2Findex.html%3FintervalHours%3D24%26cardType%3DAirQuality%26primaryMaxLimit%3D500%26secondaryMaxLimit%3D1000%22%2C%22custom_view_height%22%3A280%2C%22highlight%22%3A%22Meeting%20Room%20Large%22%2C%22highlight_color%22%3A%5B121%2C244%2C47%2C191%5D%7D%2C%22styleCustomProperties%22%3A%7B%22--primary-text-color%22%3A%22%20%20%20%23404040%22%2C%22--secondary-text-color%22%3A%22%20%20%20%23606060%22%2C%22--background-color%22%3A%22%20%20%20%23fff%22%2C%22--ui-element-color%22%3A%22%20%20%20%231756a9%22%2C%22--ui-element-alt-color%22%3A%22%20%20%20navy%22%2C%22--button-text-color%22%3A%22%20%20%20%23fff%22%2C%22--minor-ui-element-color%22%3A%22%20%20%20%23aaa%22%2C%22--box-shadow-color%22%3A%22%20%20rgba(0%2C0%2C0%2C0.3)%22%2C%22--traffic-light-go-color%22%3A%22%20%20%230b9b3c%22%2C%22--traffic-light-changing-color%22%3A%22%20%20%23d96f00%22%2C%22--traffic-light-stop-color%22%3A%22%20%20%23d1021a%22%7D%7D'
        var airMockup = '/microservices/wrld3d/airMockup.html'
        var badgeMockup = '/microservices/wrld3d/badgeMockup.html'
        var beaconMockup = '/microservices/wrld3d/beaconMockup.html'
        var deskMockup = '/microservices/wrld3d/deskMockup.html'
        var fireMockup = '/microservices/wrld3d/fireMockup.html'
        // var tempMockup = 'https://wrld-data-service.s3-us-west-2.amazonaws.com/staging/mock-pois/yanzi-Single-POI/index.html?intervalHours=24&cardType=Temperature&primaryMaxLimit=29&primaryMinLimit=21&poi=%7B%22id%22%3A2999625%2C%22title%22%3A%22Meeting%20Room%20Temprature%22%2C%22subtitle%22%3A%22Big%20Meeting%20Room%20Comfort%20Sensor%200B7F%22%2C%22tags%22%3A%22temperature_sensor%20temperature%22%2C%22lat%22%3A56.4600614%2C%22lon%22%3A-2.9782264%2C%22height_offset%22%3A0%2C%22indoor%22%3Atrue%2C%22indoor_id%22%3A%22westport_house%22%2C%22floor_id%22%3A2%2C%22user_data%22%3A%7B%22custom_view%22%3A%22https%3A%2F%2Fwrld-data-service.s3-us-west-2.amazonaws.com%2Fstaging%2Fmock-pois%2Fyanzi-Single-POI%2Findex.html%3FintervalHours%3D24%26cardType%3DTemperature%26primaryMaxLimit%3D29%26primaryMinLimit%3D21%22%2C%22custom_view_height%22%3A230%2C%22highlight%22%3A%22Meeting%20Room%20Large%22%2C%22highlight_color%22%3A%5B121%2C244%2C47%2C191%5D%7D%2C%22styleCustomProperties%22%3A%7B%22--primary-text-color%22%3A%22%20%20%20%23404040%22%2C%22--secondary-text-color%22%3A%22%20%20%20%23606060%22%2C%22--background-color%22%3A%22%20%20%20%23fff%22%2C%22--ui-element-color%22%3A%22%20%20%20%231756a9%22%2C%22--ui-element-alt-color%22%3A%22%20%20%20navy%22%2C%22--button-text-color%22%3A%22%20%20%20%23fff%22%2C%22--minor-ui-element-color%22%3A%22%20%20%20%23aaa%22%2C%22--box-shadow-color%22%3A%22%20%20rgba(0%2C0%2C0%2C0.3)%22%2C%22--traffic-light-go-color%22%3A%22%20%20%230b9b3c%22%2C%22--traffic-light-changing-color%22%3A%22%20%20%23d96f00%22%2C%22--traffic-light-stop-color%22%3A%22%20%20%23d1021a%22%7D%7D'
        // var roomMockup = 'https://cdn-webgl.wrld3d.com/html-poi-views/WRLD%20Meeting%20Room/meeting-room-available.html?poi=%7B%22id%22%3A387292%2C%22title%22%3A%22Meeting%20Room%22%2C%22subtitle%22%3Anull%2C%22tags%22%3A%22meeting_room%20general%20smart_workplace%22%2C%22lat%22%3A56.4600605%2C%22lon%22%3A-2.9782382%2C%22height_offset%22%3A0%2C%22indoor%22%3Atrue%2C%22indoor_id%22%3A%22westport_house%22%2C%22floor_id%22%3A2%2C%22user_data%22%3A%7B%22custom_view%22%3A%22https%3A%2F%2Fcdn-webgl.wrld3d.com%2Fhtml-poi-views%2FWRLD%2520Meeting%2520Room%2Fmeeting-room-available.html%22%2C%22custom_view_height%22%3A500%2C%22highlight%22%3A%22Meeting%20Room%20Large%22%2C%22highlight_color%22%3A%5B0%2C255%2C0%2C128%5D%7D%2C%22styleCustomProperties%22%3A%7B%22--primary-text-color%22%3A%22%20%20%20%23404040%22%2C%22--secondary-text-color%22%3A%22%20%20%20%23606060%22%2C%22--background-color%22%3A%22%20%20%20%23fff%22%2C%22--ui-element-color%22%3A%22%20%20%20%231756a9%22%2C%22--ui-element-alt-color%22%3A%22%20%20%20navy%22%2C%22--button-text-color%22%3A%22%20%20%20%23fff%22%2C%22--minor-ui-element-color%22%3A%22%20%20%20%23aaa%22%2C%22--box-shadow-color%22%3A%22%20%20rgba(0%2C0%2C0%2C0.3)%22%2C%22--traffic-light-go-color%22%3A%22%20%20%230b9b3c%22%2C%22--traffic-light-changing-color%22%3A%22%20%20%23d96f00%22%2C%22--traffic-light-stop-color%22%3A%22%20%20%23d1021a%22%7D%7D'
        var roomMockup = '/microservices/wrld3d/roomMockup.html'
        var powerMockup = '/microservices/wrld3d/powerMockup.html'
        var signMockup = '/microservices/wrld3d/signMockup.html'
        $('.leaflet-pane.leaflet-popup-pane').removeClass('wide')
        if (markerOptions.iconKey === 'air_quality_good') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = airMockup
            markerOptions.poiView.customViewHeight = 320
            // markerOptions.iconKey = 'air_quality_alert'
        }
        if (markerOptions.iconKey === 'badge_reader') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = badgeMockup
            markerOptions.poiView.customViewHeight = 460
        }
        if (markerOptions.iconKey === 'positioning_beacon') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = beaconMockup
            markerOptions.poiView.customViewHeight = 430
        }
        if (markerOptions.iconKey === 'desk_available') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = deskMockup
            markerOptions.poiView.customViewHeight = 460
        }
        if (markerOptions.iconKey === 'fire_extinguisher') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = fireMockup
            markerOptions.poiView.customViewHeight = 480
        }
        if (markerOptions.iconKey === 'meeting_room') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = roomMockup
            markerOptions.poiView.customViewHeight = 500
        }
        if (markerOptions.iconKey === 'electricity_meter') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = powerMockup
            markerOptions.poiView.customViewHeight = 700
            // $('.leaflet-popup-content-wrapper')[0].style.width = 566 // was 366px
            // $('.leaflet-popup-content')[0].style.width = 501 // was 301px
            $('.leaflet-pane.leaflet-popup-pane').addClass('wide')
        }
        if (markerOptions.iconKey === 'message') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = signMockup
            markerOptions.poiView.customViewHeight = 460
        }
        markerController.addMarker(markerId, [result.lat, result.lon], markerOptions)
        if (!map.indoors.isIndoors()) {
            pendingFloorIndex = result.floor_id
            pendingMarkerId = markerId
            map.indoors.enter(result.indoor_id, {
                animate: false
            })
        }
        else {
            var floorIndex = map.indoors.getFloor().getFloorIndex()
            if (result.floor_id !== floorIndex) {
                pendingMarkerId = markerId
                map.indoors.setFloor(result.floor_id)
            }
            else {
                markerController.showMarker(markerId)
                markerController.openPoiView(markerId)
            }
        }
    }
    // function goToResultXXX (event) {
    //     markerController.openPoiView(event.result.sourceId)
    //     if (!map.indoors.isIndoors()) {
    //         map.indoors.enter(event.result.location.indoorId, {
    //             animate: false
    //         })
    //         pendingFloorIndex = event.result.location.floorIndex
    //     }
    //     else {
    //         var floorIndex = map.indoors.getFloor().getFloorIndex()
    //         if (event.result.location.floorIndex !== floorIndex) map.indoors.setFloor(event.result.location.floorIndex)
    //     }

    //     // map.setView(event.result.location.latLng, 15);
    // }
    function formatTimestamp (date, format) {
        if (!date) return ''
        var y = date.getFullYear()
        var M = '' + (date.getMonth() + 1)
        var d = '' + date.getDate()
        var M0 = M.length === 1 ? '0' + M : M
        var d0 = d.length === 1 ? '0' + d : d
        var h = '' + date.getHours()
        var m = '' + date.getMinutes()
        if (h.length === 1) h = '0' + h
        if (m.length === 1) m = '0' + m
        var ds = '-'
        return (y + ds + M0 + ds + d0 + ' ' + h + ':' + m)
    }
    alerts = [
        { id: 3000365, title: 'HVAC/lighting/electricity 2.1', subtitle: 'Beside Huddle Rooms', tags: 'electricity_meter', lat: 24.7628846, lon: 46.6387049, height_offset: 0, indoor: true, indoor_id: 'EIM-45842b67-da47-484b-8d9a-34e4276f8837', floor_id: 0, user_data: {} },
        // { id: 3000356, title: 'Air quality 2.1', subtitle: 'Street Café', tags: 'air_quality_good air_quality', lat: 24.7627937, lon: 46.638645, height_offset: 0, indoor: true, indoor_id: 'EIM-45842b67-da47-484b-8d9a-34e4276f8837', floor_id: 0, user_data: {} },
        { id: 3000368, title: 'Fire control panel 3.1', subtitle: 'Behind HiTech Corner', tags: 'fire_extinguisher', lat: 24.7629645, lon: 46.6386773, height_offset: 0, indoor: true, indoor_id: 'EIM-45842b67-da47-484b-8d9a-34e4276f8837', floor_id: 1, user_data: {} }
    ]
    var now = new Date()
    alerts.forEach(function (alert, i) {
        now.setMinutes(now.getMinutes() - ((i + 1) * 73))
        alert.date = now.getTime()
        alert.open = true
    })
    var start = 0
    function displayAlerts (success, alertsParm) {
        if (success) {
            alerts = alertsParm
            pageAlerts(start)
        }
        else {
            map.openPopup('POI API query failed!', map.getCenter())
        }
    }
    function pageAlerts (start) {
        var html = []
        var count = 0
        for (var i = start, n = 5; i < n; i++) {
            var alert = alerts[i]
            if (alert && alert.open) {
                count++
                console.log(JSON.stringify(alert))
                var floorNumber = alert.floor_id + 2
                var evens = (i % 2) ? 'odd' : 'even'
                var date = new Date(alert.date)
                html.push('<div class="alertRow ' + evens + '" data-index="' + i + '"><div class="col1">' + formatTimestamp(date) + '</div><div class="col2">' + alert.title + '</div><div class="col3">' + floorNumber + '</div>')
                html.push('<div class="col4"><div class="recordToolbar">')
                html.push('<button type="button" class="dismiss kiwi" data-index="' + i + '" title="Dismiss alert"><i class="fal fa-check"></i></button>')
                html.push('</div></div></div>')
            }
        }
        $('.alertsList').html(html.join(''))
        $('.alertsCount').text(count)
        count > 0 ? $('.alertButton').show() : $('.alertButton').hide()
        $('.paginationDiv .text').text((count > 0 ? start + 1 : 0) + '-' + (start + count) + ' of ' + count)
        $('.alertsList .alertRow').each(function (i, row) {
            $(row).click(function () {
                var index = parseInt($(this).attr('data-index'))
                var result = alerts[index]
                goToResult(result)
            })
        })
        $('.alertsList .alertRow button.dismiss').each(function (i, button) {
            $(button).click(function (e) {
                e.preventDefault()
                e.stopPropagation()
                var index = parseInt($(this).attr('data-index'))
                // alerts.splice(index, 1)
                alerts[index].open = false
                pageAlerts(start)
            })
        })
    }
    $('.alertButton').click(function (e) {
        $('#alertsDiv').slideToggle()
    })
    $('#alertsDiv .close').click(function (e) {
        $('#alertsDiv').slideToggle()
    })
    function bounceToServer (headers, data) {
        var form = document.getElementById('bounceForm')
        if (!form) {
            form = document.createElement('form')
            form.style.display = 'none'
            form.id = 'bounceForm'
            form.name = 'bounceForm'
            form.action = '/bounce'
            form.method = 'POST'
            var input = document.createElement('input')
            input.type = 'hidden'
            input.id = 'bounceString'
            input.name = 'bounceString'
            form.appendChild(input)
            document.body.appendChild(form)
        }
        var obj = { headers: headers, data: data }
        document.getElementById('bounceString').value = JSON.stringify(obj)
        form.submit()
    }
    $('#alertsDiv .export').on('click', function () {
        var lines = []
        var header = ['Date', 'Description', 'Floor']
        lines.push('"' + header.join('","') + '"')
        alerts.forEach(function (result, i) {
            var line = []
            line.push(formatTimestamp(result.date || new Date()))
            line.push(result.title)
            line.push(result.floor_id + 2)
            lines.push('"' + line.join('","') + '"')
        })
        var data = lines.join('\n')
        var fileName = 'alerts.csv'
        var headers = { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'inline; filename="' + fileName + '"' }
        bounceToServer(headers, data)
    })
    var aqiGauge = AmCharts.makeChart('aqiGauge', {
        type: 'gauge',
        theme: 'none',
        // titles: [
        //     {
        //         text: 'AQI',
        //         size: 10
        //     }
        // ],
        // var colors = ['#0bff00', '#70ed00', '#99db00', '#b6c700', '#cdb200', '#df9b00', '#ee8200', '#f86600', '#fe4400', '#ff0000'] // See https://colordesigner.io/gradient-generator (green to red)
        axes: [
            {
                axisThickness: 1,
                axisAlpha: 0.2,
                tickAlpha: 0.2,
                // valueInterval: 300,
                valueInterval: 100,
                radius: '100%',
                // inside: false,
                bands: [
                    {
                        color: '#00ff00',
                        // gradientRatio: [-0.9, 0, 0.9],
                        startValue: 0,
                        endValue: 60
                    },
                    {
                        color: '#aaff00',
                        startValue: 60,
                        endValue: 120
                    },
                    {
                        color: '#fffa00',
                        startValue: 120,
                        endValue: 180
                    },
                    {
                        color: '#ff7d00',
                        startValue: 180,
                        endValue: 240
                    },
                    {
                        color: '#ff0000',
                        startValue: 240,
                        endValue: 300
                        // innerRadius: '95%'
                    }
                ],
                bottomText: '0 ',
                bottomTextYOffset: 0,
                endValue: 300
            }
        ],
        arrows: [{}],
        export: {
            enabled: true
        }
    })
    var comfortGauge = AmCharts.makeChart('comfortGauge', {
        type: 'gauge',
        theme: 'none',
        // titles: [
        //     {
        //         text: 'AQI',
        //         size: 10
        //     }
        // ],
        // var colors = ['#0bff00', '#70ed00', '#99db00', '#b6c700', '#cdb200', '#df9b00', '#ee8200', '#f86600', '#fe4400', '#ff0000'] // See https://colordesigner.io/gradient-generator (green to red)
        axes: [
            {
                axisThickness: 1,
                axisAlpha: 0.2,
                tickAlpha: 0.2,
                // valueInterval: 300,
                valueInterval: 100,
                radius: '100%',
                // inside: false,
                bands: [
                    {
                        color: '#0000ff',
                        // gradientRatio: [-0.9, 0, 0.9],
                        startValue: 0,
                        endValue: 60
                    },
                    {
                        color: '#0087ff',
                        startValue: 60,
                        endValue: 120
                    },
                    {
                        color: '#00ff00',
                        startValue: 120,
                        endValue: 180
                    },
                    {
                        color: '#ff7d00',
                        startValue: 180,
                        endValue: 240
                    },
                    {
                        color: '#ff0000',
                        startValue: 240,
                        endValue: 300
                        // innerRadius: '95%'
                    }
                ],
                bottomText: '0 ',
                bottomTextYOffset: 0,
                endValue: 300
            }
        ],
        arrows: [{}],
        export: {
            enabled: true
        }
    })
    var powerGauge = AmCharts.makeChart('powerGauge', {
        type: 'gauge',
        theme: 'none',
        axes: [
            {
                axisThickness: 1,
                axisAlpha: 0.2,
                tickAlpha: 0.2,
                valueInterval: 80,
                radius: '100%',
                // inside: false,
                bands: [
                    {
                        color: '#00ff00',
                        // gradientRatio: [-0.9, 0, 0.9],
                        startValue: 0,
                        endValue: 60
                    },
                    {
                        color: '#aaff00',
                        startValue: 60,
                        endValue: 120
                    },
                    {
                        color: '#fffa00',
                        startValue: 120,
                        endValue: 180
                    },
                    {
                        color: '#ff7d00',
                        startValue: 180,
                        endValue: 240
                    },
                    {
                        color: '#ff0000',
                        startValue: 240,
                        endValue: 320
                        // innerRadius: '95%'
                    }
                ],
                bottomText: '0 ',
                bottomTextYOffset: 0,
                endValue: 320
            }
        ],
        arrows: [{}],
        export: {
            enabled: true
        }
    })
    // setInterval(randomValue, 2000)
    var aqiInterval = setInterval(setAqiValue, 2000)
    var comfortInterval = setInterval(setComfortValue, 2000)
    var powerInterval = setInterval(setPowerValue, 2500)
    // set random value
    function setAqiValue () {
        // var value = Math.round(Math.random() * 200)
        var value = 12.4
        if (aqiGauge) {
            if (aqiGauge.arrows) {
                if (aqiGauge.arrows[0]) {
                    if (aqiGauge.arrows[0].setValue) {
                        aqiGauge.arrows[0].setValue(value)
                        aqiGauge.axes[0].setBottomText(value + '')
                        clearInterval(aqiInterval)
                    }
                }
            }
        }
    }
    function setComfortValue () {
        var value = 163
        if (comfortGauge) {
            if (comfortGauge.arrows) {
                if (comfortGauge.arrows[0]) {
                    if (comfortGauge.arrows[0].setValue) {
                        comfortGauge.arrows[0].setValue(value)
                        comfortGauge.axes[0].setBottomText(value + '')
                        $('.comfortTemperature').html('<span>26&deg;C</span>')
                        $('.comfortHumidity').html('<span>42%</span>')
                        clearInterval(comfortInterval)
                    }
                }
            }
        }
    }
    function setPowerValue () {
        // var value = Math.round(Math.random() * 200)
        var value = 84.9
        if (powerGauge) {
            if (powerGauge.arrows) {
                if (aqiGauge.arrows[0]) {
                    if (powerGauge.arrows[0].setValue) {
                        powerGauge.arrows[0].setValue(value)
                        powerGauge.axes[0].setBottomText(value + '')
                        clearInterval(powerInterval)
                    }
                }
            }
        }
    }
    // var poiApi = new WrldPoiApi('8d2d6eef6635955569c400073255f501')
    // var radius = 1000
    // var maxResults = 10
    // var options = { range: radius, number: maxResults }
    // poiApi.searchTags(['alert'], { lat: 24.763289081785917, lng: 46.63878573585767 }, displayAlerts, options)
    displayAlerts(true, alerts)

    // $.get('/alerts' + '?t=' + new Date().getTime(), function (result) {
    //     if (!result.success) {
    //         console.error('Alerts failed: ' + result.message)
    //     }
    //     else {
    //         console.log('Alerts', result.alerts)
    //     }
    // })

    /*
    var poiApi = new WrldPoiApi('8d2d6eef6635955569c400073255f501');
    var markers = [];

    function displaySearchResults(success, results) {
        map.closePopup();
        if (success) {
            results.forEach(function(result) {
                var marker = L.marker([result['lat'], result['lon']], {
                    title: result['title'],
                    elevation: result['height_offset']
                }).addTo(map);

                markers.push(marker);
            });
        }
        else {
            map.openPopup('POI API query failed!', map.getCenter());
        }
    }

    function searchPoisAroundClick(event) {
        markers.forEach(function(marker) { marker.remove(); });
        map.openPopup('Searching...', event.latlng);

        var callback = displaySearchResults;
        var options = { range: 500, number: 5 };
        poiApi.searchTags([], event.latlng, callback, options);
    }

    map.on('click', searchPoisAroundClick);
    */

    /*
    // adding a POI marker: https://www.wrld3d.com/wrld.js/latest/docs/examples/marker-controller-and-poi-views/
      var markerId = 0;
      var markerOptions = {
        poiView: {
          title: "WRLD",
          subtitle: "A subtitle goes here.",
          tags: ["Offices", "Business"],
          address: "an address goes here.",
          phone: "a contact number goes here.",
          web: "www.wrld3d.com",
          email: "enquiries@wrld3d.com",
          facebook: "wrld3d",
          twitter: "wrld3d",
          imageUrl: "/static/images/wrld.jpg",
          description: "A description goes here."
        },
        iconKey: "offices"
      };

      var marker = markerController.addMarker(markerId, [56.459941, -2.978211], markerOptions);
    */
})
