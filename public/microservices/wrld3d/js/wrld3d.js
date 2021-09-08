/* global AmCharts, L, WrldCompassControl, WrldIndoorControl, WrldMarkerController, WrldNavigation, WrldRouteView, WrldSearchbar */
// https://maps.wrld3d.com/?lat=24.760670&lon=46.639152&zoom=14.868738475598787&coverage_tree_manifest=https://cdn-webgl.eegeo.com/coverage-trees/vjsdavra/v38/manifest.bin.gz
// https://mapdesigner.wrld3d.com/poi/latest/?&coverage_tree_manifest=https://cdn-webgl.eegeo.com/coverage-trees/vjsdavra/v38/manifest.bin.gz
var alerts = []
$(function () {
    var apiKey = '8d2d6eef6635955569c400073255f501'
    var indoorMapId = 'EIM-45842b67-da47-484b-8d9a-34e4276f8837'
    var startMarker = null
    var endMarker = null
    var route = null
    var routeMarker = null
    var prefix = window.location.hostname === 'localhost' ? '' : '/microservices/wrld3d'
    var map = L.Wrld.map('map', apiKey, {
        // center: [37.7952, -122.4028],
        center: [24.763289081785917, 46.63878573585767], // Riyadh
        zoom: 17,
        indoorsEnabled: true,
        coverageTreeManifest: 'https://cdn-webgl.eegeo.com/coverage-trees/vjsdavra/v38/manifest.bin.gz'
    })

    var navigation = new WrldNavigation('navigation-container', map, apiKey)
    var routeView = new WrldRouteView(map)
    var startLocation
    var endLocation
    // function clearRoute () {
    //     routeView.clearDirections()
    // }
    function findRoute () {
        // var startLocation = WrldNavigation.buildLocation('Meeting Room 2.1', 24.762709, 46.6385792, indoorMapId, 0)
        // var endLocation = WrldNavigation.buildLocation('Meeting Room 2.3', 24.7631257, 46.6388835, indoorMapId, 0)
        // var endLocation = WrldNavigation.buildLocation('HVAC/electricity 3.2', 24.7632335, 46.6388565, indoorMapId, 1)
        startLocation = WrldNavigation.buildLocation('Start', startMarker._latlng.lat, startMarker._latlng.lng, indoorMapId, startMarker.options.indoorMapFloorId)
        endLocation = WrldNavigation.buildLocation('Finish', endMarker._latlng.lat, endMarker._latlng.lng, indoorMapId, endMarker.options.indoorMapFloorId)
        navigation.setStartLocation(startLocation)
        navigation.setEndLocation(endLocation)
        navigation.findRoute(startLocation, endLocation, findRouteCallback)
    }
    function findRouteCallback (result) {
        if (result.route) {
            route = result.route
            navigation.buildDirectionsForRoute(result.route, buildDirectionsCallback)
        }
    }
    function switchLocations () {
        var startLocationSave = endLocation
        endLocation = startLocation
        startLocation = startLocationSave
        navigation.setStartLocation(startLocation)
        navigation.setEndLocation(endLocation)
        navigation.findRoute(startLocation, endLocation, findRouteCallback)
    }
    $('.wrld-setup-journey-panel .nav-location-container .clear-icon').attr('disabled', 'disabled')
    $('.wrld-setup-journey-panel .switch-fields-button').click(switchLocations)
    function buildDirectionsCallback (result) {
        if (result.directions) {
            endMarker.removeFrom(map) // route shows its own start/finish markers
            startMarker.removeFrom(map)
            routeView.setDirections(result.directions)
            navigation.setDirections(result.directions)
            navigation.setRouteDuration(result.route.routeDuration)
            $('.wrld-navwidget-container .direction-row').each(function (i, row) {
                $(row).attr('data-index', i)
                $(row).click(stepClick)
                // console.log(i, row)
            })
            $('.show-directions').show()
        }
    }
    function stepClick () {
        var index = $(this).attr('data-index')
        var step = route.sections[0].steps[index]
        // console.log(step)
        if (step) {
            if (routeMarker) routeMarker.removeFrom(map)
            var r = '<span style="background-color: #ff0000;' + // #dd4b39 is too subtle
                'width: 2rem;height: 2rem;display: block;' +
                'left: -1.0rem;top: -1.0rem;position: relative;' +
                'border-radius: 2rem 2rem 0;transform: rotate(45deg);border: 1px solid #FFFFFF"></span>'
            var icon = L.divIcon({
                className: 'red-marker',
                iconAnchor: [0, 24],
                popupAnchor: [0, -34],
                // iconSize: null,
                html: r
            })
            routeMarker = L.marker(step.directions.location, {
                icon: icon,
                // title: 'This is indoors!',
                zIndexOffset: 1000,
                indoorMapId: step.indoorMapId,
                indoorMapFloorId: step.indoorMapFloorId
            }).addTo(map)
            var floorIndex = map.indoors.getFloor().getFloorIndex()
            if (step.indoorMapFloorId !== floorIndex) {
                map.indoors.setFloor(step.indoorMapFloorId)
            }
        }
    }

    map.themes.setTheme(
        L.Wrld.themes.season.Summer,
        L.Wrld.themes.time.Day,
        L.Wrld.themes.weather.Clear
    )
    new WrldCompassControl('compass-container', map) // eslint-disable-line no-new
    new WrldIndoorControl('indoor-container', map) // eslint-disable-line no-new
    // https://www.wrld3d.com/wrld.js/latest/docs/api/Widgets/WrldMarkerController/#iconkey-values
    var searchbarConfig = {
        apiKey: apiKey,
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
        // findRoute()
    })
    // var marker = markerController.addMarker(markerId, [56.459941, -2.978211], { iconKey: 'nav_start' })
    // var marker = markerController.addMarker(markerId, [56.459941, -2.978211], { iconKey: 'nav_finish' })
    // https://cdn-webgl.wrld3d.com/wrldjs/addons/navigation/v305/resources/small_depart.svg
    // https://cdn-webgl.wrld3d.com/wrldjs/addons/navigation/v305/resources/small_arrive.svg
    // https://cdn-webgl.wrld3d.com/wrldjs/addons/navigation/v305/resources/searchbox_destination.svg
    // https://cdn-webgl.wrld3d.com/wrld-search/latest/assets/svg/icon1_nav_finish.svg
    // map.indoors.on('indoorentityclick', function (e) {
    //     console.log('########################indoorentityclick', e)
    // })
    function onMapClick (e) {
        if (!map.indoors.isIndoors()) return
        if (endMarker) { // third click clears the route
            endMarker = null
            startMarker = null
            if (routeMarker) routeMarker.removeFrom(map)
            routeMarker = null
            routeView.clearDirections()
            navigation.closeControl()
            $('.show-directions').hide()
            return
        }
        if (startMarker) {
            endMarker = createMarker(e.latlng, 'https://cdn-webgl.wrld3d.com/wrldjs/addons/navigation/v305/resources/small_arrive.svg')
            endMarker.addTo(map)
            endMarker.bindPopup('Finding route...').openPopup()
            findRoute()
        }
        else {
            startMarker = createMarker(e.latlng, 'https://cdn-webgl.wrld3d.com/wrldjs/addons/navigation/v305/resources/small_depart.svg')
            startMarker.addTo(map)
            startMarker.bindPopup('Right-click somewhere else to find route').openPopup()
        }
    }
    function createMarker (latlng, url) {
        var containerUrl = 'https://cdn-webgl.wrld3d.com/wrld-search/latest/assets/svg/icon1_nav_container.svg'
        var r = '<div class="wrld-routeview-marker-container" style="background-image: url(' + containerUrl + ')"></div>' +
                '<div class="wrld-routeview-marker-icon" style="background-image: url(' + url + ')"></div>'
        var icon = L.divIcon({
            className: 'wrld-routeview-marker',
            popupAnchor: [0, -34],
            iconSize: null,
            html: r
        })
        var floorIndex = map.indoors.getFloor().getFloorIndex()
        return L.marker(latlng, {
            icon: icon,
            indoorMapId: indoorMapId,
            indoorMapFloorId: floorIndex
        })
    }
    function onInitialStreamingComplete () {
        L.Wrld.indoorMapFloorOutlines.indoorMapFloorOutlineInformation(indoorMapId, 0).addTo(map)
        L.Wrld.indoorMapFloorOutlines.indoorMapFloorOutlineInformation(indoorMapId, 1).addTo(map)
    }
    var floorOutlines = {}
    function onIndoormapFloorOutlineInformationLoaded (event) {
        var outlineInformation = event.indoorMapFloorOutlineInformation
        var indoorMapFloorId = outlineInformation.getIndoorMapFloorId()
        var polygons = outlineInformation.getIndoorMapFloorOutlinePolygons()
        floorOutlines[indoorMapId + '.' + indoorMapFloorId] = []
        polygons.forEach(function (polygon) {
            var polyPoints = []
            polyPoints.push(polygon.getOuterRing().getLatLngPoints())
            polygon.getInnerRings().forEach(function (innerRing) {
                polyPoints.push(innerRing.getLatLngPoints())
            })
            floorOutlines[indoorMapId + '.' + indoorMapFloorId].push(polyPoints)
            // draw the outline
            // var polygonOptions = { indoorMapId: indoorMapId, indoorMapFloorId: indoorMapFloorId }
            // L.polygon(polyPoints, polygonOptions).addTo(map)
        })
    }
    function isPointInsidePolygon (latlng, polygons) {
        var x = latlng.lat
        var y = latlng.lng
        var inside = false
        // the first polygon is the outer ring, any subsequent polygons are holes (donuts) within it
        for (var m = 0, n = polygons.length; m < n; m++) {
            var polyPoints = polygons[m]
            for (var i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
                var xi = polyPoints[i].lat
                var yi = polyPoints[i].lng
                var xj = polyPoints[j].lat
                var yj = polyPoints[j].lng
                var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
                if (intersect) inside = !inside
            }
        }
        return inside
    }
    var mouseDownPoint = null
    function onMouseDown (event) {
        if (map.indoors.isIndoors() && event.originalEvent.button === 2) { // right click only
            var floorIndex = map.indoors.getFloor().getFloorIndex()
            // a floor can comprise separate islands, so see if we are inside any of them
            var floorOutline = floorOutlines[indoorMapId + '.' + floorIndex]
            for (var i = 0, n = floorOutline.length; i < n; i++) {
                var polyPoints = floorOutline[i]
                if (isPointInsidePolygon(event.latlng, polyPoints)) {
                    mouseDownPoint = event.layerPoint
                    event.originalEvent.preventDefault()
                    event.originalEvent.stopPropagation()
                    return
                }
            }
        }
    }
    function onMouseUp (event) {
        if (!mouseDownPoint) return
        var mouseUpPoint = event.layerPoint
        var mouseMoved = mouseUpPoint.distanceTo(mouseDownPoint) > 0
        mouseDownPoint = null
        if (mouseMoved) return
        onMapClick(event)
    }
    map.on('mousedown', onMouseDown)
    map.on('mouseup', onMouseUp)
    // map.on('contextmenu', onMapClick)
    map.on('initialstreamingcomplete', onInitialStreamingComplete)
    map.indoorMapFloorOutlines.on('indoormapflooroutlineinformationloaded', onIndoormapFloorOutlineInformationLoaded)
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
    $('.show-directions').click(function (e) {
        navigation.openControl()
    })
    searchbar.on('searchresultselect', handleResult)

    function handleResult (event) {
        // console.log(JSON.stringify(event.result.data))
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
                facebook: result.user_data.type,
                twitter: result.user_data.id,
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
        // var badgeMockup = '/microservices/wrld3d/badgeMockup.html'
        var beaconMockup = '/microservices/wrld3d/beaconMockup.html'
        var desk = '/microservices/wrld3d/desk.html'
        var door = '/microservices/wrld3d/door.html'
        var fireMockup = '/microservices/wrld3d/fireMockup.html'
        // var tempMockup = 'https://wrld-data-service.s3-us-west-2.amazonaws.com/staging/mock-pois/yanzi-Single-POI/index.html?intervalHours=24&cardType=Temperature&primaryMaxLimit=29&primaryMinLimit=21&poi=%7B%22id%22%3A2999625%2C%22title%22%3A%22Meeting%20Room%20Temprature%22%2C%22subtitle%22%3A%22Big%20Meeting%20Room%20Comfort%20Sensor%200B7F%22%2C%22tags%22%3A%22temperature_sensor%20temperature%22%2C%22lat%22%3A56.4600614%2C%22lon%22%3A-2.9782264%2C%22height_offset%22%3A0%2C%22indoor%22%3Atrue%2C%22indoor_id%22%3A%22westport_house%22%2C%22floor_id%22%3A2%2C%22user_data%22%3A%7B%22custom_view%22%3A%22https%3A%2F%2Fwrld-data-service.s3-us-west-2.amazonaws.com%2Fstaging%2Fmock-pois%2Fyanzi-Single-POI%2Findex.html%3FintervalHours%3D24%26cardType%3DTemperature%26primaryMaxLimit%3D29%26primaryMinLimit%3D21%22%2C%22custom_view_height%22%3A230%2C%22highlight%22%3A%22Meeting%20Room%20Large%22%2C%22highlight_color%22%3A%5B121%2C244%2C47%2C191%5D%7D%2C%22styleCustomProperties%22%3A%7B%22--primary-text-color%22%3A%22%20%20%20%23404040%22%2C%22--secondary-text-color%22%3A%22%20%20%20%23606060%22%2C%22--background-color%22%3A%22%20%20%20%23fff%22%2C%22--ui-element-color%22%3A%22%20%20%20%231756a9%22%2C%22--ui-element-alt-color%22%3A%22%20%20%20navy%22%2C%22--button-text-color%22%3A%22%20%20%20%23fff%22%2C%22--minor-ui-element-color%22%3A%22%20%20%20%23aaa%22%2C%22--box-shadow-color%22%3A%22%20%20rgba(0%2C0%2C0%2C0.3)%22%2C%22--traffic-light-go-color%22%3A%22%20%20%230b9b3c%22%2C%22--traffic-light-changing-color%22%3A%22%20%20%23d96f00%22%2C%22--traffic-light-stop-color%22%3A%22%20%20%23d1021a%22%7D%7D'
        // var roomMockup = 'https://cdn-webgl.wrld3d.com/html-poi-views/WRLD%20Meeting%20Room/meeting-room-available.html?poi=%7B%22id%22%3A387292%2C%22title%22%3A%22Meeting%20Room%22%2C%22subtitle%22%3Anull%2C%22tags%22%3A%22meeting_room%20general%20smart_workplace%22%2C%22lat%22%3A56.4600605%2C%22lon%22%3A-2.9782382%2C%22height_offset%22%3A0%2C%22indoor%22%3Atrue%2C%22indoor_id%22%3A%22westport_house%22%2C%22floor_id%22%3A2%2C%22user_data%22%3A%7B%22custom_view%22%3A%22https%3A%2F%2Fcdn-webgl.wrld3d.com%2Fhtml-poi-views%2FWRLD%2520Meeting%2520Room%2Fmeeting-room-available.html%22%2C%22custom_view_height%22%3A500%2C%22highlight%22%3A%22Meeting%20Room%20Large%22%2C%22highlight_color%22%3A%5B0%2C255%2C0%2C128%5D%7D%2C%22styleCustomProperties%22%3A%7B%22--primary-text-color%22%3A%22%20%20%20%23404040%22%2C%22--secondary-text-color%22%3A%22%20%20%20%23606060%22%2C%22--background-color%22%3A%22%20%20%20%23fff%22%2C%22--ui-element-color%22%3A%22%20%20%20%231756a9%22%2C%22--ui-element-alt-color%22%3A%22%20%20%20navy%22%2C%22--button-text-color%22%3A%22%20%20%20%23fff%22%2C%22--minor-ui-element-color%22%3A%22%20%20%20%23aaa%22%2C%22--box-shadow-color%22%3A%22%20%20rgba(0%2C0%2C0%2C0.3)%22%2C%22--traffic-light-go-color%22%3A%22%20%20%230b9b3c%22%2C%22--traffic-light-changing-color%22%3A%22%20%20%23d96f00%22%2C%22--traffic-light-stop-color%22%3A%22%20%20%23d1021a%22%7D%7D'
        var roomMockup = '/microservices/wrld3d/roomMockup.html'
        var powerMockup = '/microservices/wrld3d/powerMockup.html'
        var sign = '/microservices/wrld3d/sign.html'
        $('.leaflet-pane.leaflet-popup-pane').removeClass('wide')
        if (markerOptions.iconKey === 'air_quality_good') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = airMockup
            markerOptions.poiView.customViewHeight = 320
            // markerOptions.iconKey = 'air_quality_alert'
        }
        if (markerOptions.iconKey === 'positioning_beacon') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = beaconMockup
            markerOptions.poiView.customViewHeight = 430
        }
        if (markerOptions.iconKey === 'desk_available') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = desk
            markerOptions.poiView.customViewHeight = 460
        }
        if (markerOptions.iconKey === 'badge_reader') {
            markerOptions.poiView.imageUrl = ''
            markerOptions.poiView.customView = door
            markerOptions.poiView.customViewHeight = 480
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
            markerOptions.poiView.customView = sign
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
        { id: 3000365, title: 'HVAC/lighting/electricity 2.1', subtitle: 'Beside Huddle Rooms', tags: 'electricity_meter', lat: 24.7628846, lon: 46.6387049, height_offset: 0, indoor: true, indoor_id: indoorMapId, floor_id: 0, user_data: {} },
        // { id: 3000356, title: 'Air quality 2.1', subtitle: 'Street Café', tags: 'air_quality_good air_quality', lat: 24.7627937, lon: 46.638645, height_offset: 0, indoor: true, indoor_id: indoorMapId, floor_id: 0, user_data: {} },
        { id: 3000368, title: 'Fire control panel 3.1', subtitle: 'Behind HiTech Corner', tags: 'fire_extinguisher', lat: 24.7629645, lon: 46.6386773, height_offset: 0, indoor: true, indoor_id: indoorMapId, floor_id: 1, user_data: {} }
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
    AmCharts.makeChart('assetGauge', {
        type: 'serial',
        theme: 'light',
        autoMargins: false,
        marginLeft: 40,
        marginRight: 0,
        marginTop: 30,
        marginBottom: 30,
        legend: {
            enabled: false
        },
        fillColors: ['green', 'red'],
        dataProvider: [
            { year: 'Asset', uptime: 57.0, downtime: 43.0 },
            { year: 'Room', uptime: 81.4, downtime: 18.6 }
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
            title: 'In use',
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
            title: 'Idle',
            type: 'column',
            color: '#000000',
            valueField: 'downtime'
        }],
        rotate: false,
        categoryField: 'year',
        categoryAxis: {
            gridPosition: 'start',
            axisAlpha: 0,
            gridAlpha: 0,
            position: 'top'
        },
        export: {
            enabled: false
        }
    })
    // setInterval(randomValue, 2000)
    var aqiInterval = setInterval(setAqiValue, 2000)
    var comfortInterval = setInterval(setComfortValue, 2000)
    var powerInterval = setInterval(setPowerValue, 2500)
    // var assetInterval = setInterval(setAssetValue, 3000)
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
                if (powerGauge.arrows[0]) {
                    if (powerGauge.arrows[0].setValue) {
                        powerGauge.arrows[0].setValue(value)
                        powerGauge.axes[0].setBottomText(value + '')
                        clearInterval(powerInterval)
                    }
                }
            }
        }
    }
    // function setAssetValue () {
    //     var value = 84.9
    //     if (assetGauge) {
    //         if (assetGauge.arrows) {
    //             if (assetGauge.arrows[0]) {
    //                 if (assetGauge.arrows[0].setValue) {
    //                     assetGauge.arrows[0].setValue(value)
    //                     assetGauge.axes[0].setBottomText(value + '')
    //                     clearInterval(assetInterval)
    //                 }
    //             }
    //         }
    //     }
    // }
    // var poiApi = new WrldPoiApi(apiKey)
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
    var poiApi = new WrldPoiApi(apiKey);
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
