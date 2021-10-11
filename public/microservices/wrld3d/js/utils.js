var utils = {}
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
utils.roundTo2 = function (num) {
    return Math.round(num * 100) / 100
}
