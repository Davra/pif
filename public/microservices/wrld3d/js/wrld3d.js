/* global L, WrldCompassControl, WrldIndoorControl, WrldSearchbar, WrldMarkerController, WrldPoiApi */
// https://maps.wrld3d.com/?lat=24.760670&lon=46.639152&zoom=14.868738475598787&coverage_tree_manifest=https://cdn-webgl.eegeo.com/coverage-trees/vjsdavra/v38/manifest.bin.gz
// https://mapdesigner.wrld3d.com/poi/latest/?&coverage_tree_manifest=https://cdn-webgl.eegeo.com/coverage-trees/vjsdavra/v38/manifest.bin.gz
$(function () {
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
        searchbar: searchbar,
        poiViewsEnabled: true
    })
    $('#searchbar-container .text-field-container input')[0].placeholder = ''
    searchbar.on('menuopen', function (e) {
        var checkExist = setInterval(function () {
            if ($('#searchbar-container .header-container .header-text').length) {
                console.log('Exists!')
                $('#searchbar-container .header-container .header-text')[0].innerHTML = 'Menu'
                $('#searchbar-container .header-container .header-text').show()
                clearInterval(checkExist)
            }
        }, 100)
    })

    var pendingFloorIndex = 0
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
        if (pendingFloorIndex) map.indoors.setFloor(pendingFloorIndex)
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
    searchbar.on('searchresultselect', goToResult)

    function goToResult (event) {
        markerController.openPoiView(event.result.sourceId)
        if (!map.indoors.isIndoors()) {
            map.indoors.enter(event.result.location.indoorId, {
                animate: false
            })
            pendingFloorIndex = event.result.location.floorIndex
        }
        else {
            var floorIndex = map.indoors.getFloor().getFloorIndex()
            if (event.result.location.floorIndex !== floorIndex) map.indoors.setFloor(event.result.location.floorIndex)
        }

        // map.setView(event.result.location.latLng, 15);
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
    var results = []
    function displayAlerts (success, resultsParm) {
        if (success) {
            results = resultsParm
            pageAlerts(0)
        }
        else {
            map.openPopup('POI API query failed!', map.getCenter())
        }
    }
    function pageAlerts (start) {
        var html = []
        var count = 0
        for (var i = start, n = 5; i < n; i++) {
            var result = results[i]
            if (result) {
                count++
                console.log(JSON.stringify(result))
                var floorNumber = result.floor_id + 2
                var date = new Date()
                var evens = (i % 2) ? 'odd' : 'even'
                // html.push('<div class="alertRow"><div class="col1">' + result.tags.split(' ')[0] + '</div><div class="col2">' + result.title + '</div><div class="col3">' + floorNumber + '</div></div>')
                html.push('<div class="alertRow ' + evens + '" data-index="' + i + '"><div class="col1">' + formatTimestamp(date) + '</div><div class="col2">' + result.title + '</div><div class="col3">' + floorNumber + '</div></div>')
            }
        }
        $('.alertsList').html(html.join(''))
        $('.paginationDiv .text').text((start + 1) + '-' + (start + count) + ' of ' + results.length)
        $('.alertsList .alertRow').each(function (i, row) {
            var index = parseInt($(this).attr('data-index'))
            var result = results[index]
            $(row).click(function () {
                // var id = parseInt($(this).attr('data-index'))
                // markerController.openPoiView(id)
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
                var marker = markerController.addMarker(markerId, [result.lat, result.lon], markerOptions)
                if (!map.indoors.isIndoors()) {
                    map.indoors.enter(result.indoor_id, {
                        animate: false
                    })
                    pendingFloorIndex = result.floor_id
                }
                else {
                    var floorIndex = map.indoors.getFloor().getFloorIndex()
                    if (result.floor_id !== floorIndex) map.indoors.setFloor(result.floor_id)
                }
                markerController.showMarker(marker)
            })
        })
    }
    $('.alertButton').click(function (e) {
        $('#alertsDiv').slideToggle()
    })
    $('#alertsDiv .close').click(function (e) {
        $('#alertsDiv').slideToggle()
    })
    var poiApi = new WrldPoiApi('8d2d6eef6635955569c400073255f501')
    var radius = 1000
    var maxResults = 10
    var options = { range: radius, number: maxResults }
    poiApi.searchTags(['alert'], { lat: 24.763289081785917, lng: 46.63878573585767 }, displayAlerts, options)

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
