var utils = {}
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
