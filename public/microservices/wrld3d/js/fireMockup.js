/* global moment */
$(function () {
    function getPoiValue () {
        var key = 'poi'
        var value = decodeURIComponent(window.location.search.replace(new RegExp('^(?:.*[&\\?]' + key + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'))
        return value ? JSON.parse(value) : null
    }
    var poi = getPoiValue()
    var type = (poi && poi.user_data.title.substr(poi.user_data.title.length - 1)) || '1'
    var now = new Date()
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
    d.setMinutes(d.getMinutes() + 73)
    $('.meeting-room-details .lastFault span').text(moment(d).format('YYYY-MM-DD HH:mm'))
    d.setMinutes(d.getMinutes() - 3673)
    $('.meeting-room-details .lastDisablement span').text(moment(d).format('YYYY-MM-DD HH:mm'))

    $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/FireSystem.png'
    // $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/sign1-2.jpg'
    $('.meeting-room-details .status span').text('OK')
    $('.meeting-room-details .status span').addClass('online')
    $('.meeting-room-details .disablement span').text('OFF')
    // $('.meeting-room-details .disablement span').addClass('online')
    var deviceId = (window.location.hostname !== 'pif.davra.com' && poi && poi.user_data.twitter) || '' // twitter account is the deviceId
    if (type > '1') {
        $('.meeting-room-photo .carousel .img1')[0].src = '/microservices/wrld3d/img/FireSystem.png'
        // $('.meeting-room-photo .carousel .img2')[0].src = '/microservices/wrld3d/img/sign2-2.jpg'
        $('.meeting-room-details .status span').text('FAULT')
        $('.meeting-room-details .status span').toggleClass('online offline')
        $('.meeting-room-details .disablement span').text('ON')
        // $('.meeting-room-details .disablement span').toggleClass('online offline')
    }
    doFaults(poi, deviceId)
    doOutages(poi, deviceId)
})
function doFaults (poi, deviceId) {
    var alerts = parent.alerts || [{ date: 1624208954770 }, { date: 1624305344770 }]
    var data = []
    var tableColumns = [
        {
            title: 'Time',
            data: 'timestamp',
            render: function (value, type, record) {
                return '<span style="display: none">' + value + '</span>' + moment(value).format('YYYY-MM-DD HH:mm')
            },
            width: '20%'
        },
        { title: 'Desc', data: 'description', width: '80%' }
    ]
    if (deviceId) { // get data
    }
    else { // mockup data
        data = [
            { timestamp: alerts[1].date, description: 'The Fire Alarm Routing Equipment FARE is faulty', duration: '24hr', userId: 'ABC123' },
            { timestamp: 1624208954770, description: 'The battery supply to the Control Panel is fully discharged', duration: '3hr', userId: 'D45678' },
            // { timestamp: 1624305344770, description: 'There is a short circuit on the loop n wiring', duration: '1hr', userId: 'X566489' },
            { timestamp: 1624101734770, description: 'There is an open or short circuit fault on the master alarm wiring', duration: '10hr', userId: 'AYS5412' }
        ]
        initTable('#tabFaultsPanel table', tableColumns, data)
    }
}
function doOutages (poi, deviceId) {
    var data = []
    var tableColumns = [
        {
            title: 'Time',
            data: 'timestamp',
            render: function (value, type, record) {
                return '<span style="display: none">' + value + '</span>' + moment(value).format('YYYY-MM-DD HH:mm')
            },
            width: '50%'
        },
        {
            title: 'Duration',
            data: 'duration',
            render: function (value, type, record) {
                return '<span style="display: none">' + ('' + value).padStart(12, '0') + '</span>' + utils.formatDuration(value)
            },
            width: '35%'
        }
    ]
    if (deviceId) { // get data
    }
    else { // mockup data
        data = [
            { timestamp: 1624312564770, description: 'Contact lost', duration: 170440000, userId: 'ABC123' },
            { timestamp: 1624208954770, description: 'Contact lost', duration: 11000, userId: 'D45678' },
            { timestamp: 1624305344770, description: 'Contact lost', duration: 33000, userId: 'X566489' },
            { timestamp: 1624101734770, description: 'Contact lost', duration: 22000, userId: 'AYS5412' }
        ]
        initTable('#tabEventsPanel table', tableColumns, data)
    }
}
var initTable = function (tableId, tableColumns, data) {
    var dataTableConfig = {
        dom: 'Bfrtip',
        bDestroy: true,
        pageLength: 5,
        pagingType: 'simple',
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
    $(tableId).dataTable().fnClearTable()
    if (data.length) $(tableId).dataTable().fnAddData(data)
}
