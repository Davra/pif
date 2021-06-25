// This selection of functions is provided to Widget Templates as helper functions if they wish to implement them
// It will always be available at /ui/assets/widget-utilities.js

// Please read the file to learn about helpful functions you may use in your widget templates.
console.log('connecthing widget utilities file loaded');


// This is the window level object which we expose.
// Children functions and properties from here will be avilable to the authors of widget template index.html and settings.html
var widgetUtils = {};

window.addEventListener('load', function() {
    console.log('All assets are loaded set the jquery ajax cache to false');
    if ($) {
        $(function() {
            $.ajaxSetup({ cache: false });
        });
    }
});

// Pull a param from the url the browser is currently at
// Returns the string value or null if it did not exist
widgetUtils.getUrlParameter = function(sParam) {
    console.log('widgetUtils.getUrlParameter ' + sParam  + ' of ' + window.location.href);
    var sPageURL = decodeURIComponent(window.location.href);
    if(sPageURL.indexOf('?') > -1) {
        sPageURL = sPageURL.split('?')[1];
    }
    if(sPageURL.indexOf('#') > -1) {
        sPageURL = sPageURL.split('#')[0];
    }
    if(sPageURL && sPageURL.length > 0) {    
        var sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName.length > 0 && (sParameterName[0] === sParam || sParameterName[0].toLowerCase() === sParam.toLowerCase())) {
                return sParameterName[1] === undefined ? null : sParameterName[1];
            }
        }
        return null;
    } else {
        return null;
    }
};



// Make a query to the API of the timeseries DB.
// query should be a JSON string so you may wish to run JSON.stringify before calling here
// In the callback, expect err, data. Hopefully err will be null.
widgetUtils.runTimeseriesApiQuery = function(query, callback) {    
    console.log('runTimeseriesApiQuery running query', query);
    $.ajax("/api/v2/timeseriesData", {
        contentType: "application/json",
        data: query,
        dataType: "json",
        method: "POST",
        error: function(xhr, status, err){
            callback(err, null);
        },
        success: function(data, status, xhr){
            //var count = data.queries.reduce(function(total, cur, ix, all){return total + cur.sample_size}, 0);
            callback(null, data);
        }
    });
}

// Send a simple datapoint to the iotdata API endpoint
widgetUtils.uploadSimpleDatapoint = function(query, callback) {    
    console.log('uploadSimpleDatapoint uploading datapoint:', query);
    $.ajax("/api/v1/iotdata", {
        data: query,
        method: "PUT",
        error: function(xhr, status, err){
            if(callback) {
                callback(err, null);
            }
        },
        success: function(data, status, xhr){
            if(callback) {
                callback(null, data);
            }
        }
    });
}


// Facilitate html accordions for the settings page
// widgetUtils.refreshAccordionArrows = function() {
//     setTimeout(function() {
//         // Set accordions to show arrow down or up
//         $('.panel-heading.collapsed i').removeClass('fa-sort-asc').addClass('fa-sort-desc');
//         $('.panel-heading:not(.collapsed) i').removeClass('fa-sort-desc').addClass('fa-sort-asc');
//     }, 500);
// }
// $(function() {
//     //widgetUtils.refreshAccordionArrows();
//     // When an accordion is clicked, update the arrow pointer
//     $('.panel-heading').on('click', widgetUtils.refreshAccordionArrows);
// });

// Transform the data from timeSeries API calls into something more easily plotted as a linechart
widgetUtils.simpleTransformData = function(data){
    if(window.connecthingChartTransformData){
        console.log('widgetUtils.simpleTransformData will use window.connecthingChartTransformData instead');
        return connecthingChartTransformData(data);
    }
    else{
        if(data && data.queries && data.queries[0].results && data.queries[0].results[0].values) {
            var mdata = $.map(data.queries[0].results[0].values, function(datapoint){
                return {
                    timestamp: new Date(datapoint[0]),
                    value: datapoint[1]
                };
            });
            // It is ESSENTIAL that the data is sorted by timestamp
            if(mdata.length > 0 && mdata[0].hasOwnProperty('timestamp')) {
                console.log('Sorting the dataProvider for amChart by timestamp');
                mdata.sort(function (a, b) { return a['timestamp'] - b['timestamp']; });
            }
            console.log('widgetUtils.simpleTransformData returning with number of items: ', mdata.length);
            return mdata;
        }
    }
    console.log('widgetUtils.simpleTransformData returning null');
    return null;
}

// Transform the data from timeSeries API calls into something more easily plotted as a bar chart or pareto graph
widgetUtils.simpleTransformDataPareto = function(data, boolTruncateNumbers){
    if(data && data.queries && data.queries[0].results && data.queries[0].results[0].values) {
        var newData = [];
        var totalCountDataPoints = data.queries[0].results.length;
        for(var tmpIndex = 0; tmpIndex < totalCountDataPoints; tmpIndex++) {
            var currResult = data.queries[0].results[tmpIndex];
            if(currResult.group_by && currResult.group_by[0] && currResult.group_by[0].tags && currResult.group_by[0].tags[0]) {
                var groupByType = currResult.group_by[0].tags[0];
                if(currResult.tags && currResult.tags[groupByType]) {
                    var groupByValue = currResult.tags[groupByType][0];
                    if(currResult.values && currResult.values[0]) {
                        var datapointValue = currResult.values[0][currResult.values[0].length -1]; // ie. in a [timeStamp, value] pair, get the value
                        if(boolTruncateNumbers != undefined && boolTruncateNumbers == true) {
                            datapointValue = widgetUtils.roundNum(datapointValue, 3, true);
                        }
                        newData.push({"datalabel": groupByValue, "datavalue": datapointValue});
                    }
                }
            }
        }
        console.log('widgetUtils.simpleTransformDataPareto returning with number of items: ', newData.length);
        return newData;
    }
    console.log('widgetUtils.simpleTransformDataPareto returning null');
    return null;
}

// Convert a number to more pleasing form
// Set the maximum number of decimal places to return, eg. 2 makes 1.23456 become 1.23
// Supply a bool to truncate X.00 to just X
widgetUtils.roundNum = function(numberToConvert, decimalPlaces, boolTruncateInts) {
    var tmpNum = parseFloat(numberToConvert);
    if(decimalPlaces != undefined && decimalPlaces > -1) {
        tmpNum = tmpNum.toFixed(decimalPlaces);
    }
    if(boolTruncateInts != undefined && boolTruncateInts == true) {
        tmpNum = Math.round(tmpNum);
    }
    return tmpNum;
}

// Safely check if a string is acceptable JSON
widgetUtils.IsJsonString = function(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}


// A function which may be called by the author of settings.html of a widget.
// It will load in the requirements it has, such as JS and CSS files.
// Supply options as the first parameter to chose various styles of initialisation.
widgetUtils.initialiseSettings = function(opt, callback) {
    console.log('widgetUtils.initialiseSettings starting');
    $('body').append('<div id="settings-loading-mask" style="width: 100%; height: 100%; position: absolute; z-index: 90; top: 0px; background: #666666; opacity: 1.0; display: block;"></div>');

    // Load all the stylesheet requirements
    var styleSheets = [];
    styleSheets.push("/ui/vendors/font-awesome-5/css/fontawesome-all.min.css");
    styleSheets.push("/ui/vendors/font-awesome/css/font-awesome.min.css");
    //styleSheets.push("/ui/components/widget-settings-menu/metric-selector/component.css");
    //styleSheets.push("/ui/components/widget-settings-menu/device-selector/component.css");
    styleSheets.push("/ui/vendors/bootstrap/3.3.7/css/bootstrap.min.css");
    styleSheets.push("/ui/vendors/bootstrap-daterangepicker/daterangepicker.css");
    styleSheets.push("/ui/vendors/bootstrap-colorpicker/css/bootstrap-colorpicker.min.css");
    styleSheets.push("/ui/vendors/pnotify/dist/pnotify.css");
    styleSheets.push("/ui/vendors/bootstrap-multiselect-master/dist/css/bootstrap-multiselect.css");
    // styleSheets.push("/ui/css/custom.css");
    //styleSheets.push("/ui/css/davra.css");
    styleSheets.push("/ui/assets/bootstrap-gentelella-theme-for-widgets.css");
    styleSheets.push("/ui/css/settings.css");
    //styleSheets.push("/ui/components/widget-settings-menu/timerange-selector/component.css");
    for (var index = 0; index < styleSheets.length; index++) {
        
        var link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('type', 'text/css');
        link.setAttribute('href', styleSheets[index]);
        document.getElementsByTagName('head')[0].appendChild(link)
    }

    // Load all the JS requirements
    var scripts = [];
    scripts.push("/ui/vendors/moment/min/moment.min.js");
    scripts.push("/ui/vendors/bootstrap/3.4.1/js/bootstrap.min.js");
    scripts.push("/ui/vendors/underscore/underscore-min.js");
    scripts.push("/ui/vendors/jquery-sparkline/dist/jquery.sparkline.min.js");
    scripts.push("/ui/vendors/pnotify/dist/pnotify.js");
    scripts.push("/ui/vendors/bootstrap-daterangepicker/daterangepicker.js");
    scripts.push("/ui/vendors/bootstrap-multiselect-master/dist/js/bootstrap-multiselect.js");
    scripts.push("/ui/components/widget-settings-menu/metric-selector/component.js");
    scripts.push("/ui/components/widget-settings-menu/device-selector/component.js");
    scripts.push("/ui/components/widget-settings-menu/timerange-selector/component.js");
    scripts.push("/ui/vendors/ace/1.2.7/ace.js");
    
    widgetUtils.scriptLoader(scripts, function() {
        $('#settings-loading-mask').remove();
        console.log('widgetUtils.initialiseSettings prerequisites loaded');
        widgetUtils.actionsAfterInitialisation();
        callback();
    });
}


// A function to append JS scripts to the existing DOM page.
// Pass in an array of scripts to load
// Note: They will be loaded in a synchronous way, 1 at a time, so order is important.
widgetUtils.scriptLoader = function(scripts, callback) {
    var count = 0;
    // After a script has loaded, this functino is called
    function urlCallback(url) {
        return function () {
            count = count + 1;
            console.log('widgetUtils loading prerequisites, completed ' + count + ' of ' + scripts.length + ': ' + url);
            if (count == scripts.length) {
                callback(); // All the required scripts have finished loading
            } else {
                loadScript(scripts[count]); // there are more scripts to load so start the next one
            }
        };
    }

    function loadScript(url) {
        var s = document.createElement('script');
        s.setAttribute('src', url);
        s.onload = urlCallback(url);
        document.head.appendChild(s);
        console.log('widgetUtils loading prerequisites, starting ' + (count + 1).toString() + ' of ' + scripts.length + ': ' + url);
    }

    loadScript(scripts[0]); // Start by loading the first script. When it is complete, the next one will be called etc.
}

// Miscellaneous actions to perform after the initialisation has loaded the prerequisites
widgetUtils.actionsAfterInitialisation = function() {
    // Show the appropriate accordions and the arrow for up or down slide
    $(".widget-accordion").on("click", function () {
        console.log('Adjusting accordion for ', $(this));
        $(this).next().slideToggle(200);
        var currentAccordionIndicator = $(this).find('.accordion-indicator');
        if(currentAccordionIndicator.hasClass('fa-sort-asc')) {
            currentAccordionIndicator.removeClass('fa-sort-asc').addClass('fa-sort-desc');
        } else {
            currentAccordionIndicator.removeClass('fa-sort-desc').addClass('fa-sort-asc');
        }
    });
}

// Load the widget configuration. Note, this is for a particular widget instance
// The callback will have (error, data)
widgetUtils.loadWidgetSettings = function(callback) {
    var widgetId = widgetUtils.getUrlParameter("widgetid");
    console.log('Starting to load configuration for widgetId ' + widgetId);
    // Initial validation
    if(widgetId == null) {
        callback("widgetid should not be empty in the url", {});
        return;
    }
    // Use AJAX to retrieve the settings from the API
    $.ajax("/api/v1/widgetconfig/" + widgetId, {
        dataType: "json",
        error: function(xhr, status, error){
            if(callback) {
                callback(error, {});
            }
        },
        success: function(data, status, xhr){
            if(callback) {
                var dataObject = {};
                if(data.data) {
                    dataObject = data.data;
                    // Ensure we send a clean usable object to the caller
                    if(dataObject._id) { delete dataObject._id; }
                    if(dataObject._etag) { delete dataObject._etag; }
                    if(dataObject.tenantId) { delete dataObject.tenantId; }
                }
                if(dataObject.length == 0) {
                    dataObject.configLoadedWasEmpty = true;
                }
                // Ensure we send a clean usable object to the caller. Ie a minimum set of properties
                if(!dataObject.hasOwnProperty('deviceId')) { dataObject.deviceId = null; }
                if(!dataObject.hasOwnProperty('timerange')) { dataObject.timerange = null; }
                if(!dataObject.hasOwnProperty('metrics')) { dataObject.metrics = null; }
                if(!dataObject.hasOwnProperty('chartCfg')) { dataObject.chartCfg = null; }
                if(!dataObject.hasOwnProperty('deviceId')) { dataObject.deviceId = null; }
                console.log('widgetUtils.loadWidgetSettings completed with config ', dataObject);
                callback(null, dataObject);
            }
        }
    }); 
}

// Save the widget configuration. Note, this is for a particular widget instance
// For the data, you should pass in a JSON string. eg. You may wish to run JSON.stringify on an object before passing it in
// The callback will have (error, data)
widgetUtils.saveWidgetSettings = function(dataToSave, callback) {
    var widgetId = widgetUtils.getUrlParameter("widgetid");
    console.log('Starting to save configuration for widgetId ', widgetId, dataToSave);
    // Initial validation
    if(widgetId == null) {
        callback("widgetid should not be empty in the url", null);
        return;
    }
    // Use AJAX to send the settings to the API
    $.ajax("/api/v1/widgetconfig/" + widgetId, {
        dataType: "json",
        contentType: "application/json",
        method: "PUT",
        data: dataToSave,
        error: function(xhr, status, error){
            $("#divUserFeedback").html("Error encountered while saving configuration");
            if(callback) {
                callback(error, null);
            }
        },
        success: function(data, status, xhr){
            console.log('Configuration saved successfully');
            // Settings have been saved ok
            $("#divUserFeedback").html("Configuration saved successfully");
            setTimeout(function() {
                $("#divUserFeedback").html("");
            }, 3000);
            if(callback) {
                callback(null, data.data);
            }
        }
    }); 
}


widgetUtils.aceCodeEditor = null;   // This property will hold a pointer to the ace code editor used for settings
// For the settings or index.html page for a widget, if there is a DOM textarea with id="text-editor-for-ace"
// then attach an ACE editor to it and fill it with some string data
widgetUtils.loadAceEditorWithData = function(dataForEditor) {
    if(dataForEditor == undefined || dataForEditor == null) { 
        dataForEditor = ''; 
    }
    // If the expected DOM element exists, for which to attach an editor
    if($("#text-editor-for-ace").length > 0) {
        widgetUtils.aceCodeEditor = ace.edit("text-editor-for-ace");
        widgetUtils.aceCodeEditor.setValue(dataForEditor, -1);
        widgetUtils.aceCodeEditor.setTheme("ace/theme/dawn");
        widgetUtils.aceCodeEditor.getSession().setMode("ace/mode/json");
        widgetUtils.aceCodeEditor.setShowPrintMargin(false);
        widgetUtils.aceCodeEditor.$blockScrolling = 'Infinity';
    } else {
        console.log('widgetUtils cannot attach an ACE editor because a DOM element of id=text-editor-for-ace does not exist');
    }  
}


// For a known Ace editor already setup, retrieve the latest text inside it
widgetUtils.retrieveAceEditorData = function() {
    if(widgetUtils.aceCodeEditor != null && widgetUtils.aceCodeEditor.getValue().length > 0) {
        var stringFromAceEditor = widgetUtils.aceCodeEditor.getValue();
        if(widgetUtils.IsJsonString(stringFromAceEditor) == true) {
            return JSON.parse(stringFromAceEditor);
    } else {
            widgetUtils.PNotifyError('Invalid JSON noticed in the JSON editor for settings');
            return stringFromAceEditor;
        }
    } else {
        return {};
    }
}


widgetUtils.aceCodeEditorDrillin = null;

widgetUtils.loadAceEditorWithDataDrillin = function(dataForEditorDrillin) {
    // If the expected DOM element exists, for which to attach an editor
    
    if(dataForEditorDrillin == undefined || dataForEditorDrillin == null) { 
        dataForEditorDrillin = ''; 
    }

    if($("#text-editor-for-ace-drillin").length > 0) {
        widgetUtils.aceCodeEditorDrillin = ace.edit("text-editor-for-ace-drillin");
        widgetUtils.aceCodeEditorDrillin.setValue(dataForEditorDrillin, -1);
        widgetUtils.aceCodeEditorDrillin.setTheme("ace/theme/dawn");
        widgetUtils.aceCodeEditorDrillin.getSession().setMode("ace/mode/json");
        widgetUtils.aceCodeEditorDrillin.setShowPrintMargin(false);
        widgetUtils.aceCodeEditorDrillin.$blockScrolling = 'Infinity';
    } else {
        console.log('widgetUtils cannot attach an ACE editor because a DOM element of id=text-editor-for-ace-drillin does not exist');
    }

}

// For a known Ace editor already setup, retrieve the latest text inside it
widgetUtils.retrieveAceEditorDataDrillin = function() {
    if(widgetUtils.aceCodeEditorDrillin != null && widgetUtils.aceCodeEditorDrillin.getValue().length > 0) {
        var stringFromAceEditor = widgetUtils.aceCodeEditorDrillin.getValue();
        if(widgetUtils.IsJsonString(stringFromAceEditor) == true) {
            return JSON.parse(stringFromAceEditor);
    } else {
            widgetUtils.PNotifyError('Invalid JSON noticed in the JSON editor for settings');
            return stringFromAceEditor;
        }
    } else {
        return {};
    }
}



// Get the full list of meta data (metrics) from the server
widgetUtils.getMetricsFromServer = function(callback) {
    $.ajax('/api/v1/iotdata/meta-data', {
        cache: false,
        context: this,
        dataType: "json",
        method: "GET",
        processData: true,
        contentType: "application/json",
        error: function(xhr, status, err) {
            console.log('Error getting connecthingGetMetricsFromServer', err);
            if(callback) {
                callback('Error getting connecthingGetMetricsFromServer', null);
            }
        },
        success: function(data, status, xhr) {
            console.log('Got list of metrics from server:', data);
            if(data && data.fields && callback) {
                callback(null, data.fields);
            }
        }
    });
}

// Quite similar to getMetricsFromServer but this is a subset
widgetUtils.getMetricsListFromServer = function(callback) {
    $.ajax('/api/v1/iotdata/meta-data/metrics', {
        cache: false,
        context: this,
        dataType: "json",
        method: "GET",
        processData: true,
        contentType: "application/json",
        error: function(xhr, status, err) {
            console.log('Error getting getMetricsListFromServer', err);
            if(callback) {
                callback('Error getting getMetricsListFromServer', null);
            }
        },
        success: function(data, status, xhr) {
            console.log('Got list of metrics from server:', data);
            if(data && data.fields && callback) {
                callback(null, data.fields);
            }
        }
    });
}



widgetUtils.getDevicesFromServer = function(callback) {
    $.ajax('/api/v1/devices', {
        cache: false,
        context: this,
        dataType: "json",
        method: "GET",
        processData: true,
        contentType: "application/json",
        error: function(xhr, status, err) {
            console.log('Error getting connecthingGetDevicesFromServer', err);
        },
        success: function(data, status, xhr) {
            console.log('Got list of devices from server:', data);
            if(data && data.records) {
                if(callback) {
                    callback(null, data.records);
                }
            }
        }
    });
}


widgetUtils.runPolicyCheckOnServer = function(dataToCheck, callback) {
    $.ajax('/api/v1/authorization/policy/check', {
        cache: false,
        data: JSON.stringify(dataToCheck),
        dataType: "json",
        method: "POST",
        processData: true,
        contentType: "application/json",
        beforeSend: function(xhr) {
            xhr.setRequestHeader( "Content-type", "application/json" );
        },
        error: function(xhr, status, err) {
            if(callback) {
                callback(err, null);
            }
        },
        success: function(data, status, xhr) {
            if(callback) {
                callback(null, data);
            }
        }
    });
}


/************************  NETWORKING HELPERS *************************** */

// Perform a regular Ajax GET for simple JSON
widgetUtils.ajaxGet = function(urlToGet, callback) {
    $.ajax(urlToGet, {
        cache: false,
        dataType: "json",
        method: "GET",
        processData: true,
        contentType: "application/json",
        error: function(xhr, status, err) {
            console.log('Error widgetUtils.ajaxGet ' + urlToGet, err);
            if(callback) {
                callback(err, null);
            }
        },
        success: function(data, status, xhr) {
            // Store the response in memory in case this is required in a cached form later
            if(typeof(window.comDavra) === "undefined") {
                window.comDavra = {};
            }
            if(typeof(comDavra.cachedAjaxResponses) === "undefined") {
                comDavra.cachedAjaxResponses = {};
            }
            comDavra.cachedAjaxResponses[urlToGet] = data;

            if(callback) {
                callback(null, data);
            }
        }
    });
}

// If we already got the url, return the cached response otherwise perform a regular Ajax GET for simple JSON
widgetUtils.ajaxGetCached = function(urlToGet, callback) {
    if(window.comDavra === undefined) {
        window.comDavra = {};
    }
    if(comDavra.cachedAjaxResponses == undefined || comDavra.cachedAjaxResponses[urlToGet] == undefined) {
        comDavraAjaxGet(urlToGet, callback);
        return;
    } else {
        callback(null, comDavra.cachedAjaxResponses[urlToGet]);
    }
}


// Perform a regular Ajax POST for simple JSON
widgetUtils.ajaxPost = function(urlEndpoint, objectToSend, callback) {
    var strDataToSend = JSON.stringify(objectToSend);
    $.ajax(urlEndpoint, {
        cache: false,
        dataType: "json",
        data: strDataToSend,
        method: "POST",
        processData: true,
        contentType: "application/json",
        error: function(xhr, status, err) {
            console.log('Error during widgetUtils.ajaxPost to ' + urlEndpoint, err, status, xhr);
            if(callback) {
                callback(err, xhr, status);
            }
        },
        success: function(data, status, xhr) {
            if(callback) {
                callback(null, data, status);
            }
        }
    });
}



// Perform a regular Ajax PUT for simple JSON
widgetUtils.ajaxPut = function(urlEndpoint, objectToSend, callback) {
    var strDataToSend = JSON.stringify(objectToSend);
    console.log('ajaxPut of ', strDataToSend);
    $.ajax(urlEndpoint, {
        cache: false,
        data: strDataToSend,
        method: "PUT",
        processData: false,
        contentType: "application/json",
        error: function(xhr, status, err) {
            console.log('Error during widgetUtils.ajaxPut to ' + urlEndpoint, err);
            if(callback) {
                callback(err, null);
            }
        },
        success: function(data, status, xhr) {
            if(callback) {
                callback(null, data);
            }
        }
    });
}





// Build a suitable query to send to the timeseries database.
// This combines the page level-filters and the widget level-config
// If the config specifies an array of metrics of the Include/Exclude system it will prune the list of metrics to call
widgetUtils.ConstructApiQueryForTimeseries = function(filters, config, listOfAllMetrics) {
    // -- Metric
    // Create an array of each of the metrics to show the user. May be influenced by config settings.
    var arrayOfMetricsToShow = [];
    // Iterate through all available metrics to determine if it should be inclued in API call
    for(var tmpIndex = 0; tmpIndex < listOfAllMetrics.length; tmpIndex++) {
        var candidateMetric = listOfAllMetrics[tmpIndex];
        // widgetConfig may have config.metricIncludeExclude object describing a widgetConfig level filtering of which metrics to show
        if(config.metricIncludeExclude && config.metricIncludeExclude.overallIncludeExclude) {
            var sectionConfig = config.metricIncludeExclude;
            // Should we show All Metrics
            if(sectionConfig.overallIncludeExclude == "metricshowall") {
                arrayOfMetricsToShow.push(candidateMetric);  // Include this metric
            }
            // Should we show Only a certain list of metrics
            if(sectionConfig.overallIncludeExclude == "metricshowonly" && sectionConfig.metricIncludeList) {
                if($.inArray(candidateMetric.name, sectionConfig.metricIncludeList) > -1) {
                    arrayOfMetricsToShow.push(candidateMetric);  // Include this metric
                }
            }
            // Should we show all metrics Except a certain list
            if(sectionConfig.overallIncludeExclude == "metricshowexcept" && sectionConfig.metricExcludeList) {
                if($.inArray(candidateMetric.name, sectionConfig.metricExcludeList) == -1) {
                    arrayOfMetricsToShow.push(candidateMetric);  // Include this metric
                }
            }
        }
        // For the other system of including metrics (where we have a section per metric with aggregation etc)
        if(config.metrics) {
            if(config.metrics.filter(function( obj ) { return obj.name == candidateMetric.name; }).length > 0) {
                arrayOfMetricsToShow.push(candidateMetric);  // Include this metric
            }
        }
    }
    console.log('arrayOfMetricsToShow: ', arrayOfMetricsToShow);

    var tmpQuery = {metrics: []};
    // Construct the API query. Iterate through each applicable metric
    for (i = 0; i < arrayOfMetricsToShow.length; i++) {
        // Set up a basic query item for each metric
        var metric = {
            name: arrayOfMetricsToShow[i].name,
            tags: {
                deviceId: []
            }
        };
        
        // -- Device
        // If a device is chosen, it is specified as a tag in the metrics object
        // eg. "tags": { "deviceId": ["1"] }
        var chosenDevice = null;
        // For a device, examine if there is one specified at page level filter
        if(filters.tags && filters.tags.deviceId && filters.tags.deviceId != null) {
            chosenDevice = filters.tags.deviceId[0];
        }
        // For a device, override if there is one specified at widget level config
        if(config.hasOwnProperty('deviceId') && config.deviceId != null) {
            chosenDevice = config.deviceId;
        }
        if(chosenDevice != null) {
            metric.tags.deviceId.push(chosenDevice);
        }

        // -- Aggregation from metricIncludeExclude
        // An aggregator may be specified in the widgetConfig
        // eg. { "name": "avg", "align_sampling": true, "sampling": {"unit": "minutes", "value": "1"} }
        if(config.metricIncludeExclude && config.metricIncludeExclude.aggregator) {
            metric.aggregators = [config.metricIncludeExclude.aggregator];
        }
        // -- Aggregation from metrics part of config
        // An aggregator may be specified in the widgetConfig, within the config part
        if(config.metrics && config.metrics[0] && config.metrics[0].aggregator) {
            if(config.metrics[0].aggregator.length > 0) {
                metric.aggregators = [{ "name": config.metrics[0].aggregator, "align_sampling": true}];
            }
            if(config.metrics[0].timeBucket) {
                metric.aggregators[0].sampling = { "unit": config.metrics[0].timeBucket, "value": 1};
                if(config.metrics[0].timeBucketValue) {
                    metric.aggregators[0].sampling.value = config.metrics[0].timeBucketValue;
                }
            }
            // If "auto" was chosen, find an appropriate time bucket
            if (config.metrics[0].timeBucket == "auto") {
                metric.aggregators[0].name = "avg";
                metric.aggregators[0].align_sampling = true;
                metric.aggregators[0].sampling = {
                    unit: "milliseconds"
                };
                sampling = widgetUtils.getTimeBucketSize(filters.timerange.startTime, filters.timerange.endTime, widgetUtils.getChartTargetNumberOfPoints());
                metric.aggregators[0].sampling.value = sampling;
            }
        }

        // Dimensions, group_by from widgetConfig
        if (config.metrics[0].dimensions && config.metrics[0].dimensions.length) {
            if(metric.group_by == undefined) {
                metric.group_by = [];
            }
            metric.group_by.push({"name":"tag", "tags": [config.metrics[0].dimensions[0]] });
        }
        
        tmpQuery.metrics.push(metric);
    }

    // -- Timerange
    // For timerange, examine if there is one specified at page level filter
    if(filters.timerange && filters.timerange.startTime) {
        tmpQuery.start_absolute = filters.timerange.startTime;
    }
    if(filters.timerange && filters.timerange.endTime) {
        tmpQuery.end_absolute = filters.timerange.endTime;
    }
    // For timerange, override if there is one specified at widget level config
    if(config.timerange && config.timerange != null) {
        if(config.timerange.startTime) {
            tmpQuery.start_absolute = config.timerange.startTime;
        }
        if(config.timerange.endTime) {
            tmpQuery.end_absolute = config.timerange.endTime;
        }
    }
    
    return tmpQuery;
}


// Find an appropriate time ranging size (unit and quanitity) so that
// when making an API call for a timespan, request the correct time bucket
widgetUtils.getTimeBucketSize = function(startTime, endTime, targetBuckets)
{
    var config = {
    	YEAR : 365 * 24 * 60 * 60 * 1000,
        DAY : 24 * 60 * 60 * 1000,
        HOUR : 3600000,
        MINUTE : 60000,
        SECOND : 1000,
        MULTIPLES : [1, 2, 5, 15, 30, 60, 120, 8 * 60, 12 * 60, 24 * 60, 48 * 60]
    };

    var unit = widgetUtils.getTimeBucketUnit(startTime, endTime);
    var multiple = 1;
    var mulix = 0;
    var diff = endTime-startTime;
    while(diff/(unit*multiple) > targetBuckets && mulix < config.MULTIPLES.length-1){
        multiple = config.MULTIPLES[++mulix];
    }
    return multiple * unit;
}
// Find an appropriate time unit for dealing with queries to timeSeries Db
widgetUtils.getTimeBucketUnit = function(startTime, endTime) {
    var config = {
    	YEAR : 365 * 24 * 60 * 60 * 1000,
        DAY : 24 * 60 * 60 * 1000,
        HOUR : 3600000,
        MINUTE : 60000,
        SECOND : 1000,
        MULTIPLES : [1, 2, 5, 15, 30, 60, 120, 8 * 60, 12 * 60, 24 * 60, 48 * 60]
    };

    var diff = endTime - startTime;
    if(diff > 20 * config.YEAR)
    {
        return config.YEAR;
    }
    else if( diff > 20 * config.DAY)
    {
        return config.DAY;
    }
    else if( diff > 24 * config.HOUR)
    {
        return config.HOUR;
    }
    else if( diff >  config.HOUR)
    {
        return config.MINUTE;
    }
    else{
        return config.SECOND;
    }
}

// When drawing charts, we usually want a reasonable number of points. 
// Either set it as a window level variable or get the default
widgetUtils.getChartTargetNumberOfPoints = function() {
    if(window.connecthingChartTargetNumberOfPoints){
        return connecthingChartTargetNumberOfPoints;
    } else {
        return 120;
    }
}

// Calculate a basic aggragate function on a simple array of values
// eg if you have an array of numbers and want the average number
// requestedType may be ["first", "latest", "min", "max", "count", "none"]
// Return value will be null or a number
widgetUtils.getAggregationBasicFromArrayOfValues = function(requestedType, arrayOfData) {
    var returnVal = '';
    // If there is any actual valid data
    if(arrayOfData && arrayOfData.length > 0) {
        if(requestedType == "first") {
            returnVal = arrayOfData[0];
        }
        if(requestedType == "latest") {
            returnVal = arrayOfData[arrayOfData.length - 1];
        }
        if(requestedType == "count") {
            returnVal = arrayOfData.length;
        }
        if(requestedType == "min") {
            returnVal = Math.min(arrayOfData);
        }
        if(requestedType == "max") {
            returnVal = Math.max(arrayOfData);
        }
        if(requestedType == "avg") {
            var countItems = arrayOfData.length;
            var sumItems = 0;
            for(var tmpCounter = 0; tmpCounter < countItems; tmpCounter++) {
                sumItems += parseFloat(arrayOfData[tmpCounter]);
            }
            returnVal = sumItems / countItems;
        }
    }
    // In the above sections, the actual match should have been cound (or else "none" was the requestedType)
    return returnVal;
}



// Take an array of timestamp,value tuples and create an array suitable for generating a sparkline
// Especially comprehends no data for a day, thus draws a point of value 0 for that day
// arrDatatuples should be in form: [ [timestamp, valueAtTime], [timestamp, valueAtTime], ... ]
widgetUtils.convertQueryResultsIntoSparkLineCompatible = function(arrDatatuples, numDays) {
    //console.log('Convert to sparkline suitable daily totals for days:', numDays, arrDatatuples);
    var returnArray = [];
    try {
        var msInDay = 24 * 60 * 60 * 1000;
        var counter = 0;
        for(var dayIndex = numDays - 1; dayIndex > -1; dayIndex--) {
            returnArray[counter] = 0;
            var endTimeOfDay = Date.now() - (dayIndex * msInDay);
            var startTimeOfDay = endTimeOfDay - msInDay;
            // Find the tuple which has the timestamp within this day range
            for(var tupleIndex = 0; tupleIndex < arrDatatuples.length; tupleIndex++) {
                if(arrDatatuples[tupleIndex][0] > startTimeOfDay && arrDatatuples[tupleIndex][0] <= endTimeOfDay) {
                    returnArray[counter] = returnArray[counter] + arrDatatuples[tupleIndex][1];
                }
            }
            counter += 1;
        }    
    } catch (error) {
        console.log('Warning: could not construct sparkline with data supplied');
    }
    return returnArray;
}



// Get a date converted to the ISO standard of YYYY-MM-DD
widgetUtils.getDateFormatIsoDate = function(dateToFormat) {
    if(dateToFormat === undefined || dateToFormat === null || dateToFormat === '') {
        return '';
    }
    try {
        var tmpDate = new Date(dateToFormat);
        var tmpStr = tmpDate.getFullYear().toString() + "-"
            + widgetUtils.padLeft((tmpDate.getMonth() + 1).toString(), 2, "0") + "-"
            + widgetUtils.padLeft(tmpDate.getDate().toString(), 2, "0");
        return tmpStr;
    } catch (e) {
        console.log('Warning: failed to convert this to date:', dateToFormat);
        return '';
    }
};


// Get a date and time converted to the ISO standard representation of YYYY-MM-DD HH:MM:SS
widgetUtils.getDateFormatIsoDateTime = function(dateToFormat) {
    if(dateToFormat === undefined || dateToFormat === null || dateToFormat === '') {
        return '';
    }
    try {
        //var tmpString = new Date(dateToFormat).toISOString(); // Get a TZ format version
        //return tmpString.split('T')[0] + ' ' + tmpString.split('T')[1].split('.')[0];
        var tmpDate = new Date(dateToFormat);
        var tmpStr = tmpDate.getFullYear().toString() + "-"
            + widgetUtils.padLeft((tmpDate.getMonth() + 1).toString(), 2, "0") + "-"
            + widgetUtils.padLeft(tmpDate.getDate().toString(), 2, "0") + " "
            + widgetUtils.padLeft(tmpDate.getHours().toString(), 2, "0") + ":"
            + widgetUtils.padLeft(tmpDate.getMinutes().toString(), 2, "0") + ":"
            + widgetUtils.padLeft(tmpDate.getSeconds().toString(), 2, "0");
        return tmpStr;
    } catch (e) {
        console.log('Warning: failed to convert this to date time:', dateToFormat);
        return '';
    }
};


widgetUtils.getLang = function() {
    if(navigator.languages != undefined) {
        return navigator.languages[0]; 
    } else {
        return navigator.language;
    }
}


// Get a date and time in format of DD mmmm YY
widgetUtils.dateFormatHuman = function(dateToFormat) {
    if(dateToFormat === undefined || dateToFormat === null || dateToFormat === '') {
        return '';
    }
    try {
        var tmpDate = new Date(dateToFormat);
        var tmpStr = tmpDate.getDate().toString() + ' ' +
            tmpDate.toLocaleString(widgetUtils.getLang(), { month: "short" }) + ' ' +
            tmpDate.getFullYear();
        return tmpStr;
    } catch (e) {
        console.log('Warning: failed to convert this to date time:', dateToFormat);
        return '';
    }
};


// Get a date and time in format of DD mmmm YY Hour:Min PM
widgetUtils.dateTimeFormatHuman = function(dateTimeToFormat) {
    if(dateTimeToFormat === undefined || dateTimeToFormat === null || dateTimeToFormat === '') {
        return '';
    }
    try {
        var datePart = widgetUtils.dateFormatHuman(dateTimeToFormat);
        var dtToFormat = new Date(dateTimeToFormat);
        var amPm = "AM";
        var intHours = dtToFormat.getHours();
        if(intHours > 12) {
            intHours = intHours - 12;
            amPm = "PM";
        }
        return datePart + " " + intHours.toString() 
            + ":" + widgetUtils.padLeft(dtToFormat.getMinutes().toString(), 2, "0") + " " + amPm;
    } catch (e) {
        console.log('Warning: failed to convert this to date time:', dateTimeToFormat);
        return '';
    }
};


// Make a string have length "size" by padding it on the left side with characters "ch"
widgetUtils.padLeft = function(inputStr, size, ch) {
    var s = inputStr + "";
    while(s.length < size) {
        s = ch + s;
    }
    return s;
}


// Get an object with the previous n days with day:date for printing as tooltips
widgetUtils.getRecentDatesDays = function(numDaysToGet) {
    var objTmp = {};
    for(var i = 0; i < numDaysToGet; i++) {
        objTmp[i] =new Date(new Date().setDate(new Date().getDate() - numDaysToGet + i + 1)).toDateString();
    }
    return objTmp;
}


// Convert numbers like 12000 to 12K
widgetUtils.abbreviateNumber = function(num, fixed) {
    if (num === null) { return '0'; } // terminate early
    if (num === 0) { return '0'; } // terminate early
    fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
    var b = (num).toPrecision(2).split("e"), // get power
        k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
        c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3) ).toFixed(1 + fixed), // divide by power
        d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
        e = d + ['', 'K', 'M', 'B', 'T'][k]; // append power
    return e;
}




// Make a string have length "size" by padding it on the left side with characters "ch"
widgetUtils.padLeft = function(inputStr, size, ch) {
    var s = inputStr + "";
    while(s.length < size) {
        s = ch + s;
    }
    return s;
}

// ReplaceAll using REGEX
widgetUtils.stringReplaceAll = function(fullString, searchTerm, replacement) {
    if(fullString && fullString != null && fullString.length > 0) {
        return fullString.replace(new RegExp(searchTerm, 'g'), replacement);
    } else {
        return '';
    }
};



// Send a string to the UI so that undefined or nulls are converted to just an empty string
widgetUtils.safeString = function(incomingStr) {
    var returnString = '';
    if(incomingStr != undefined && incomingStr != null) {
        returnString = incomingStr.toString();
    }
    return returnString;
}


// Safely check if an object is acceptable JSON
widgetUtils.comDavraIsJsonObject = function(obj) {
    try {
        JSON.parse(JSON.stringify(obj));
    } catch (e) {
        return false;
    }
    return true;
}

// Safely check if an object is acceptable JSON
widgetUtils.comDavraIsJsonObjectStrict = function(obj) {
    try {
        JSON.parse(obj);
    } catch (e) {
        return false;
    }
    return true;
}


// Send a number or string to the UI so that undefined or nulls are convered to 0
// Optionally, pass in a fallbackObject to return if there is a failure to determine the number
widgetUtils.safeInt = function(incomingStr, fallbackObject) {
    var returnNum = 0;
    if(fallbackObject !== undefined) {
        returnNum = fallbackObject;
    }
    if(incomingStr !== undefined && incomingStr !== null && incomingStr !== "" && incomingStr !== fallbackObject) {
        try {
            returnNum = parseInt(Number(incomingStr));
        } catch (error) {
            console.log('comDavraSafeInt had difficulty converting to number:', incomingStr);
        }
    }
    return returnNum;
}


// For an array of objects, find just 1 where a particular key has a particular value. 
// eg in arrayUsers, find the device object where serialNumber = 1
// array = [{key:value},{key:value}]
widgetUtils.objectFindByKey = function(array, key, value) {
    if(typeof(array) != undefined) {
        for (var i = 0; i < array.length; i++) {
            if (array[i][key] === value) {
                return array[i];
            }
        }
    }
    return null;
}



// Notification help functions
// Call these to alert your user with pop-up notifications
widgetUtils.PNotifyError = function(textToShow) {
    if(PNotify) {
        new PNotify({
			  title: "Error",
			  text: textToShow,
              type: 'error',
              styling: 'bootstrap3',
              delay: 5000
			});
        return false;
    }
}

widgetUtils.PNotifyInfo = function(textToShow) {
    if(PNotify) {
        new PNotify({
			  title: "Information",
			  text: textToShow,
              type: 'info',
              styling: 'bootstrap3',
              delay: 3000,
              buttons: {
                  closer: true,
                  closer_hover: false
              },
              nonblock: {
                  nonblock: true
              }
			});
        return false;
    }
}

widgetUtils.PNotifySuccess = function(textToShow) {
    if(PNotify) {
        new PNotify({
			  title: "Success",
			  text: textToShow,
              type: 'success',
              styling: 'bootstrap3',
              delay: 4000
			});
        return false;
    }
}

var topics = {};
var cacheLatestValues = [];
function _topic(topicName){
    if(!topics[topicName]){
        var callbacks = jQuery.Callbacks();
        var topic = {
          publish: callbacks.fire,
          subscribe: callbacks.add,
          unsubscribe: callbacks.remove
        };
        topics[topicName] = topic;
    }
    console.log(topics[topicName])
    return topics[topicName];
}

var comDavraMessageBus = function () {
    return {
        subscribe: function(topic, cb){_topic(topic).subscribe(cb);},
        unsubscribe: function(topic, cb){_topic(topic).unsubscribe(cb);},
        publish: function(topic, msg){
            cacheLatestValues[topic] = msg;
            _topic(topic).publish(msg);
        },
        getLatestValue: function(topic) { return cacheLatestValues[topic]; },
    }
}

widgetUtils.comDavraDeviceLocationMessageBus = {
    publish: function(msg) {
        window.top.comDavra.messageBus("com.connecthing.deviceLocation").publish(msg);
    },
    subscribe: function(cb) {
        window.top.comDavra.messageBus("com.connecthing.deviceLocation").subscribe(cb);
    },
}

widgetUtils.comDavraObserver = function() {
    return {
        on: function(topic, cb){_topic(topic).subscribe(cb);},
        un: function(topic, cb){_topic(topic).unsubscribe(cb);},
        fire: function(topic, msg){_topic(topic).publish(msg);}
    }
}

var filterValues = {}

function cloneFilters(){
    return JSON.parse(JSON.stringify(filterValues));
}

function fireFilterUpdate(){
    MessageBus().publish("com.connecthing.filters", cloneFilters());
}

var comDavraGetFilters = function() {
    return {
        setTagValue: function(tags){
            for(var t in tags){
                var tagname = t;
                var tagvalues = tags[t];

                var currDims = filterValues["tags"];
                currDims = currDims || {};
                if(tagvalues && tagvalues != null){
                    currDims[tagname] = tagvalues;
                }
                else{
                    delete currDims[tagname];
                }
            }
            filterValues["tags"] = currDims;
            fireFilterUpdate();
        },

        getFilterValues: function(){
            return cloneFilters();
        },

        setTimerange: function(timerange){
            filterValues["timerange"] = JSON.parse(JSON.stringify(timerange)); //lazy clone
            fireFilterUpdate();
        },

        subscribe: function(cb){
            MessageBus().subscribe("com.connecthing.filters", cb);
        },

        unsubscribe: function(cb){
            MessageBus().unsubscribe("com.connecthing.filters", cb);
        },

        getEncodedFilters: function(){
            return encodeURIComponent(JSON.stringify(filterValues));
        },

        setEncodedFilters: function(encfilters){
            filterValues = JSON.parse(decodeURIComponent(encfilters));
            fireFilterUpdate();
        }
    }
}


/************************  GRAPHING WITHIN PLATFORM HELPERS *************************** */

// Create a simple graph using AMCharts.
// graphConfigOverrides may be empty or undefined for default behaviour
// dataToChart should be in the format of [{"timestamp": 12345, "value": 1}, {"timestamp": 12346, "value": 2}]
// so perhaps use comDavraGraphConvertTimeSeriesDataToAmChartType to convert the data first
// Ensure you have already included the following if intending to call this:
//  <!-- Resources to build a graph -->
//  <script src="/ui/vendors/amcharts/amcharts/amcharts.js"></script>  
//  <script src="/ui/vendors/amcharts/amcharts/serial.js"></script>
//  <script src="/ui/assets/templates/amcharts-connecthing-theme.js"></script>
widgetUtils.graphSimple = function(divToInsertGraphInto, dataToChart, graphConfigOverrides) {
    if(graphConfigOverrides == undefined || graphConfigOverrides == null) {
        graphConfigOverrides = {};
    }
    var chartConfig = {
        "type": "serial",
        "theme": "connecthing",
        "marginRight": 40,
        "autoMarginOffset": 20,
        "dataProvider": dataToChart,
        "balloon": {
            "cornerRadius": 6
        },
        "valueAxes": [{
            "axisAlpha": 0
        }],
        "graphs": [{
            //"balloonText": "[[category]]<br><b><span style='font-size:14px;'>[[value]]</span></b>",
            "valueField": "value",
            "type": "line",
            "bullet": "round"
        }],
        "chartCursor": {
            "cursorPosition": "mouse",
            "categoryBalloonEnabled": false
        },
        "chartScrollbar": {},
        //"dataDateFormat": "YYYY",
        "categoryField": "timestamp",
        "categoryAxis": {
            "parseDates": true,
            "minorGridEnabled": true,
            "minPeriod": "ss"
        }
    };
    $.extend(chartConfig, graphConfigOverrides);
    //console.log(divToInsertGraphInto, chartConfig);
    var chart = AmCharts.makeChart(divToInsertGraphInto, chartConfig);
    // Not necessary but leaving in case this behaviour is desired later. ie dynamic reset of zoom upon new data
    // function zoomChart(){
    //     chart.zoomToDates(new Date(1970, 0), new Date(2095, 0));
    // }
    // chart.addListener("dataUpdated", zoomChart);
}


// The data returned from a simple /api/v1/timeseriesdata call is usually an array of [timestamp, value]
// Convert that into the type of structure AmCharts prefers as a data source
widgetUtils.graphConvertTimeSeriesDataToAmChartType = function(timeSeriesDataResults) {
    var dataToChart = [];
    try {
        for(var tmpIndex in timeSeriesDataResults.queries[0].results[0].values) {
            dataToChart.push({
                "timestamp": timeSeriesDataResults.queries[0].results[0].values[tmpIndex][0], 
                "value": timeSeriesDataResults.queries[0].results[0].values[tmpIndex][1] 
            });
        }
    } catch (error) {
        console.log('Error encountered in comDavraGraphConvertTimeSeriesDataToAmChartType ', error, timeSeriesDataResults);
    }
    return dataToChart.slice(); // Send back a copy of the array rather than by reference so it will be protected
}



//***************** Sample DATA  */
widgetUtils.getSampleDataParetoCountryLitres = function() {
    return [ {"country": "Lithuania", "litres": 501.9 }, {"country": "Czech Republic","litres": 301.9  }, {"country": "Ireland","litres": 201.1  }, {"country": "Germany","litres": 165.8  }, {"country": "Australia","litres": 139.9  }, {"country": "Austria","litres": 128.3  }, {"country": "UK","litres": 99  }, {"country": "Belgium","litres": 60  }, {"country": "The Netherlands","litres": 50  } ];
}

widgetUtils.getSampleDataXY2 = function() {
    return [ {"y": 10,"x": 14,"value": 59,"y2": -5,"x2": -3,"value2": 44  }, {"y": 5,"x": 3,"value": 50,"y2": -15,"x2": -8,"value2": 12  }, {"y": -10,"x": 8,"value": 19,"y2": -4,"x2": 6,"value2": 35  }, {"y": -6,"x": 5,"value": 65,"y2": -5,"x2": -6,"value2": 168  }, {"y": 15,"x": -4,"value": 92,"y2": -10,"x2": -8,"value2": 102  }, {"y": 13,"x": 1,"value": 8,"y2": -2,"x2": 0,"value2": 41  }, {"y": 1,"x": 6,"value": 35,"y2": 0,"x2": -3,"value2": 16  } ];
}

widgetUtils.getSampleData = function() {
    var sampleData = [];
    var startTime = new Date().valueOf() - 29 * 24 * 60 * 60 * 1000;
    var DAY = 24 * 60 * 60 * 1000;
    for(var i=0; i<30; i++){
        sampleData.push({
            timestamp: new Date(startTime + i * DAY),
            value: Math.random() * 100
        });
    }
    return sampleData;
}


widgetUtils.getSampleDataForTable2Columns = function() {
    var columns = [];
    columns.push({ title: 'Temperature', data: 'temperature'});
    columns.push({ title: 'Pressure', data: 'pressure'});
    var data = [];
    var now = moment(new Date());
    for (var index = 0; index < 20; index++) {
        var temperature = Math.floor(Math.random() * 22) + 18;  
        var pressure = Math.floor(Math.random() * 102) + 98;
        now = now.subtract('hour', 1);  
        data.push({ timestamp: now.valueOf(), temperature: temperature, pressure: pressure});
    }
    return {
        columns: columns,
        data: data
    };
};

// Get an array of data (and array of column names) suitable for constructing a sample table
// The timestamp column will always be included and is outside the numColumns count
widgetUtils.getSampleDataForTableManyColumns = function(numColumns, numRows) {
    var columnTitles = ['Temperature', 'Pressure', 'Alititude', 'Velocity', 'Angle', 'Mass', 'Length', 'Time', 'Current', 'Luminosity', 'Frequency', 'Inductance', 'Radioactivity', 'Capacitance'];
    if(numColumns > columnTitles.length) {
        console.log('Too many columns were requested');
        return null;
    }
    columnTitles = columnTitles.slice(0, numColumns);
    var columns = [];
    for(var tmpIndex = 0; tmpIndex < columnTitles.length; tmpIndex++) {
        columns.push({ title: columnTitles[tmpIndex], data: columnTitles[tmpIndex]});
    }
    var data = [];
    var now = new Date();
    for (var index = 0; index < numRows; index++) {
        var tmpRow = {};
        tmpRow.timestamp = now - (1000 * 60 * 60);              
        for (var indexColumn = 0; indexColumn < numColumns; indexColumn++) {
            tmpRow[columnTitles[indexColumn]] = Math.floor(Math.random() * 100);  
        }
        data.push(tmpRow);
    }
    return {
        columns: columns,
        data: data
    };
};

widgetUtils.getSampleDataForEventTable4Columns = function() {
    var columns = [];
    columns.push({ title: 'Severity', data: 'severity'});
    columns.push({ title: 'Name', data: 'name'});
    columns.push({ title: 'Message', data: 'message'});
    var data = [];
    var now = moment(new Date());
    var severityArray = ["INFO", "WARN", "CRITICAL"];
    var nameArray = ["Speed Alert", "Battery Warning", "Brake Warning", "Transmission", "Communications"];
    var messageArray = ["Some further details here", "Miscellaneous details listed here", "Details included below"];
    for (var index = 0; index < 20; index++) {
        var severity =  severityArray[Math.floor(Math.random() * severityArray.length)];  
        var name = nameArray[Math.floor(Math.random() * nameArray.length)];  
        var message = messageArray[Math.floor(Math.random() * messageArray.length)];  
        now = now.subtract('hour', 1);  
        data.push({ "timestamp": now.valueOf(), "severity": severity, "name": name, "message": message});
    }
    return {
        columns: columns,
        data: data
    };
};



// END SAMPLE DATA

widgetUtils.setupDropDownsForLabels = function(elemId, arrayLabels) {
    // For each of the labels/tags already set for the app 
    var htmlTableRowList = '';
    if(arrayLabels != undefined) {
        for(var labelKey in arrayLabels) {
            if(arrayLabels.hasOwnProperty(labelKey) && labelKey.toString().trim() != "") {
                // var labelValue = arrayLabels[labelKey];
                var htmlTableRow = '<tr><td class="static"></td>';
                htmlTableRow += '<td class="static labelKey"><span class="staticLabelKey">' + labelKey + '</span></td>';
                htmlTableRow += '<td class="static labelColon"><div class="h4">:</div></td>';
                // htmlTableRow += '<td class="static labelValue"><span class="staticLabelValue">' + labelValue + '</span></td>';
                htmlTableRow += '<td class="static labelValue"><select class="multiselect dropdown-label-value" id="' + labelKey + '"></select></td>';
                htmlTableRow += '<td class="static labelRemove"><i class="fal fa-times fa-lg hover-pointer" data-placement="bottom" data-toggle="tooltip" data-original-title="Remove Label"></i></td>';
                htmlTableRow += '</tr>';         
                htmlTableRowList += htmlTableRow;
            }
        }
    }
    $('.table-label-listing .table-label-tbody').html(htmlTableRowList);
    $('#' + elemId + ' .dropdown-label-value').each(function(ix, elem) {
        // Build the value dropdown
        var selectedValues = arrayLabels[elem.id] || [];
        updateDropdownForLabelValue(elem, selectedValues);
    });
    // Enable tooltips
    $('[data-toggle="tooltip"]').tooltip({ container: 'body' });
    
    // Notice if user wishes to add another label.
    $('.labelsAddNew').off("click");
    $('.labelsAddNew').on("click", function(e) {
        console.log('Noticed a click to add new labelKeyValue pair ');
        createNewDropdownForLabelKey($(this).parent().parent());
    });
    // Notice if user wishes to remove an existing label
    $('.table-label-listing .fa-times').off("click");
    $(document).on("click", '.table-label-listing .fa-times', function(e) {
        console.log('Noticed a click to delete labelKeyValue pair ');
        $('.tooltip.in').remove(); // Remove tooltips before removing dom item
        $(this).closest('tr').remove();
    });
    // How to supply one dropdown ready to add a new key: createNewDropdownForLabelKey();
}

// When dealing with labels/tags for devices/application/etc construct the left "key" dropdown
var createNewDropdownForLabelKey = function(jQueryElementTableContainer) {
    if(jQueryElementTableContainer == undefined) {
        jQueryElementTableContainer = $('body');
    }
    // Get all the possible keys
    comDavraAjaxGetCached('/api/v1/tags/keys', function(err, arrayAllKeys){
        if(arrayAllKeys == undefined) {
            arrayAllKeys = [];
        }
        var rowID = comDavraGetGuid();
        var htmlTableRow = '<tr class="' + rowID + '"><td></td>';
        var htmlLabelKeyDropdown = '<select class="multiselect dropdown-label-key">';
        htmlLabelKeyDropdown += '<option selected value="None">Select</option>';
        htmlLabelKeyDropdown += '<option value="Add-New">Add New</option>';
        for(var tmpIndex = 0; tmpIndex < arrayAllKeys.length; tmpIndex++) {
            var arrayExistingKeyValues = getLabelKeyValuePairsFromUi(false, jQueryElementTableContainer);
            var alreadyHaveThiskey = false;
            // Subtract existing keys from the dropdown, as user may only have one value for a given key (currently)
            for(var tmpIndexAll = 0; tmpIndexAll < arrayExistingKeyValues.length; tmpIndexAll++) {
                //console.log('Checking if key already exists ', arrayAllKeys[tmpIndex], arrayExistingKeyValues[tmpIndexAll].key);
                if(arrayAllKeys[tmpIndex] == arrayExistingKeyValues[tmpIndexAll].key) {
                    alreadyHaveThiskey = true;
                }
            }
            if(alreadyHaveThiskey == false && arrayAllKeys[tmpIndex] != "") {
                htmlLabelKeyDropdown += '<option>' + arrayAllKeys[tmpIndex] + '</option>';
            }
        }
        htmlLabelKeyDropdown += '</select>';
        htmlTableRow += '<td class="labelKey">' + htmlLabelKeyDropdown + '</td>';
        htmlTableRow += '<td class="labelColon"><div class="h4">:</div></td>';
        var htmlLabelValueDropdown = '<select class="multiselect dropdown-label-value">';
        htmlLabelValueDropdown += '<option selected value="None">select</option></select>';
        htmlTableRow += '<td class="labelValue">' + htmlLabelValueDropdown + '</td>';
        htmlTableRow += '<td class="labelRemove"><i class="fal fa-times fa-lg hover-pointer" data-placement="bottom" data-toggle="tooltip" data-original-title="Remove Label"></i></td></tr>';
        // Add the row to the table
        jQueryElementTableContainer.find('.table-label-tbody').append(htmlTableRow);
        jQueryElementTableContainer.find('.labelsAddNewPrompt').html("Add another label");
        $('.' + rowID + ' .dropdown-label-key').each(function(myIndex, myElem) {
            // Build the Dropdown
            $(myElem).multiselect({
                onChange: function(element, checked) {
                    console.log('Noticed click on multiselect dropdown ', element, checked);
                    updateDropdownForLabelValue(element);
                },
                maxHeight: 400,
                enableFiltering: true,
                enableCaseInsensitiveFiltering: true
            });
            updateDropdownForLabelValue(myElem);
        });
    });
};

// When dealing with labels/tags for devices/application/etc construct the right "value" dropdown
var updateDropdownForLabelValue = function(labelKeyDomElement, selectedValues) {
    selectedValues = selectedValues || [];
    var chosenKey = labelKeyDomElement[0] ? labelKeyDomElement[0].value : labelKeyDomElement.id;
    var jqLabelValueContainer = $(labelKeyDomElement).closest('tr').find('.dropdown-label-value');
    var jqForRow = $(labelKeyDomElement).closest('tr');
    console.log('Noticed click on multiselect dropdown so rebuild labelValue for ', chosenKey);
    if(chosenKey.trim() == 'None' || chosenKey.trim() == 'Everything') {
        $(labelKeyDomElement).closest('tr').find('.labelValue').html('<select class="multiselect dropdown-label-value"><option>None</option></select>');
        $(labelKeyDomElement).closest('tr').find('.labelValue').find('select').prop('disabled', true);
        $(labelKeyDomElement).closest('tr').find('.labelValue').find('select').multiselect(); // User cannot set a value if key is empty
        $(labelKeyDomElement).closest('tr').find('.labelValue').find('select').multiselect('disable');
        return;
    }
    // By definition, if the user chooses a "new" key, then they will add a "new" value
    if(chosenKey.trim() == 'Add-New') { 
        var jqTdForKey = $(labelKeyDomElement).closest('tr').find('.labelKey');
        var jqTdForVal = $(labelKeyDomElement).closest('tr').find('.labelValue');
        var jqTdForRemove = $(labelKeyDomElement).closest('tr').find('.labelRemove');
        jqTdForKey.html('<input class="label-key-textbox form-control" placeholder="New label key">');
        jqTdForVal.html('<input class="label-value-textbox form-control" placeholder="New label value">');
        jqTdForRemove.html('<i class="fal fa-times fa-lg hover-pointer" data-placement="bottom" data-toggle="tooltip" data-original-title="Remove Label"></i>');
        jqTdForKey.find('input').focus();
        return;
    }
    // Build the Dropdown with all values allowed for the chosen key
    jqLabelValueContainer.prop('disabled', false);
    // Build up the options for the labelValue. They are dependent on the choice of key
    // var htmlValueOptions = '<select multiple class="multiselect dropdown-label-value">' +
    //     '<option value="">Select</option>' +
    //     '<option value="Add-New">Add New</option>';
    var htmlValueOptions = '<select multiple class="multiselect dropdown-label-value">';
    comDavraAjaxGetCached('/api/v1/tags/values/' + chosenKey, function(err, arrayAllValues){
        if(arrayAllValues == undefined) {
            arrayAllValues = [];
        }
        var selectedString = selectedValues.join(';') + ';';
        for(var tmpIndex = 0; tmpIndex < arrayAllValues.length; tmpIndex++) {
            var selected = selectedString.indexOf(arrayAllValues[tmpIndex] + ';') > -1 ? ' selected': '';
            htmlValueOptions += '<option' + selected + '>' + arrayAllValues[tmpIndex] + '</option>';
        } 
        htmlValueOptions += '</select>';
        jqForRow.find('.labelValue').html(htmlValueOptions);
        jqForRow.find('.labelValue select').multiselect({
            onChange: function(element, checked) {
                console.log('Noticed click on multiselect dropdown for labelValue ', element, checked);
                var chosenValue = element[0].value;
                if(chosenValue.trim() == 'Add-New') { 
                    var jqTdForVal = $(labelKeyDomElement).closest('tr').find('.labelValue');
                    var jqTdForRemove = $(labelKeyDomElement).closest('tr').find('.labelRemove');
                    jqTdForVal.html('<input class="label-value-textbox form-control" placeholder="New label value">');
                    jqTdForRemove.html('<i class="fal fa-times fa-lg hover-pointer" data-placement="bottom" data-toggle="tooltip" data-original-title="Remove Label"></i>');
                    jqTdForVal.find('input').focus();
                    return;
                }
            },
            maxHeight: 400,
            enableFiltering: true,
            enableCaseInsensitiveFiltering: true
        });
        comDavraCreateCheckboxesInsideMultiSelectDropdowns(jqForRow.find('.labelValue'));
    });
};

// Supply a jQuery selection of multiselect dropdowns (multiple enabled) 
// for which to show elaborate checkboxes alongside dropdown options
var comDavraCreateCheckboxesInsideMultiSelectDropdowns = function(jquerySelection) {
    // In preparation for iCheckbox, copy the multiselect item values to higher element so they will be readable
    jquerySelection.find('.multiselect-container.dropdown-menu li input').each(function(){
        $(this).closest('li').attr('data-multiselect-value', $(this).val());
    });
    // Elaborate checkboxes within the dropdown
    jquerySelection.find('.multiselect-container.dropdown-menu li input').iCheck({
        checkboxClass: 'davra-checkbox',
        radioClass: 'davra-radio',
        increaseArea: '0%' // optional
    });
    // When the iCheckbox is changed, make the effect happen on the multiSelect dropdown
    jquerySelection.find('.multiselect-container.dropdown-menu li input').on("ifChanged", function(events){
        multiselectOptionValue = $(this).closest('li').attr('data-multiselect-value');
        //console.log('Multiselect option changed: ', multiselectOptionValue, events.target.checked);
        var selectObject = $(events.target).closest('.multiselect-native-select').find('select');
        if(events.target.checked == true) {
            selectObject.multiselect('select', multiselectOptionValue, true);
        } else {
            selectObject.multiselect('deselect', multiselectOptionValue, true);
        }
    });
}

// Create a random GUID
var comDavraGetGuid = function() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

// When dealing with labels/tags for devices/application/etc retrieve the current situation in the UI
// Optionally pass it the jQuery selector of the parent of the table in the DOM
// Returns an array of the key value pairs of labels
// Beware, this function will return false if the validity checks are performed and fail
var getLabelKeyValuePairsFromUi = function(boolRunValidityChecks, jQuerySelectorOfParent) {
    var returnArray = [];
    if(jQuerySelectorOfParent == undefined) {
        jQuerySelectorOfParent = $('body');
    }
    jQuerySelectorOfParent.find('.table-label-listing tbody tr').each(function() {
        var thisRow = $(this);  // The row in the table of labels
        // If the row contains static entries
        if(thisRow.find('.staticLabelKey').length > 0) {
            var tmpKey = thisRow.find('.staticLabelKey').text();
            // var tmpVal = thisRow.find('.staticLabelValue').text();
            var tmpVal = thisRow.find('.labelValue select').val();
            returnArray.push({'key': tmpKey, 'value': tmpVal});
        }
        // If the row contains a dropdown
        if(thisRow.find('.dropdown-label-key').length > 0) {
            var tmpKey = thisRow.find('.dropdown-label-key option:selected').val();
            var tmpVal = thisRow.find('.dropdown-label-value option:selected').val();
            // If the row contains a dropdown for the key and a new entry for the value
            if(thisRow.find('.label-value-textbox').length > 0) {
                tmpVal = thisRow.find('.label-value-textbox').val()
                returnArray.push({'key': tmpKey, 'value': tmpVal});
                // Send it to server as a new label which might be used by users later. Eg fill the keys dropdown in devices labels
                if(widgetUtils.runValidityCheckOfLabel(tmpKey, tmpVal) === null) {
                    comDavraPostNewLabel(tmpKey, tmpVal);
                }
            } else {
                // Within dropdowns, use of 'None' signifies no option was selected so may be ignored
                if(tmpKey != 'None') {
                    returnArray.push({'key': tmpKey, 'value': tmpVal});
                }
            }
        }
        // If the row contains new entries
        if(thisRow.find('.label-key-textbox').length > 0) {
            var tmpKey = thisRow.find('.label-key-textbox').val();
            var tmpVal = thisRow.find('.label-value-textbox').val();
            returnArray.push({'key': tmpKey, 'value': tmpVal});
            // Also send it to server after validation checks
            if(widgetUtils.runValidityCheckOfLabel(tmpKey, tmpVal) === null) {
                comDavraPostNewLabel(tmpKey, tmpVal);
            }
        }
    });
    //console.log('Labels in UI, pre validation check ', returnArray);
    // Optionally run validity checks to ensure keys and values are of correct form
    if(boolRunValidityChecks == true) {
        for(var tmpIndex = 0; tmpIndex < returnArray.length; tmpIndex++) {
            var labelKey = returnArray[tmpIndex].key;
            var labelValue = returnArray[tmpIndex].value;
            var errResponse = widgetUtils.runValidityCheckOfLabel(labelKey, labelValue);
            
            // Does this labelKey appear more than once (ie used in dropdown then added again as a new one)
            countKeyOccurrances = 0;
            for(var tmpIndex2 = 0; tmpIndex2 < returnArray.length; tmpIndex2++) {
                var labelKey2 = returnArray[tmpIndex2].key;
                if(labelKey == labelKey2) {
                    countKeyOccurrances += 1;
                }
            }
            if(countKeyOccurrances > 1) {
                errResponse = 'A key cannot be used more than once';
            }
            // Check if any rule was tripped
            if(errResponse != null) {
                comDavraPNotifyError(errResponse);
                return 'failedValidationChecks';
            }
        }
    }
    return returnArray;
}


// Check a label key and value for unwanted situations
// Returns null if all ok and failed no tests
widgetUtils.runValidityCheckOfLabel = function(labelKey, labelValue) {
    console.log('Validity check of ', labelKey, labelValue);
    var errResponse = null;
    if(labelKey == '' || labelKey == undefined) {
        errResponse = 'Cannot use empty string for key';
    }
    if(labelKey != comDavraStringSanitiseWithoutSpaces(labelKey)) {
        errResponse = 'Key cannot have spaces. Only alphanumeric and dash or underscore';
    }
    if(comDavraStringContainsSpecialKeywords(labelKey) == true) {
        errResponse = 'Key cannot be certain keywords. Please try another.';
    }
    if((labelValue == '' || labelValue == undefined) && labelKey != 'Everything') {
        errResponse = 'Cannot use empty string for value';
    }
    var labelValueAfterAllowedChars = comDavraStringReplaceAllSimply(labelValue, '.', '');
    if(labelValueAfterAllowedChars != comDavraStringSanitiseWithoutSpaces(labelValueAfterAllowedChars)) {
        errResponse = 'Value cannot have spaces. Only alphanumeric, dot, dash or underscore';
    }
    // Within dropdowns, use of 'None' signifies no option was selected
    if(labelValue == 'None' && labelKey != 'Everything') {
        errResponse = 'Must select a value for each key';
    }
    return errResponse;
}

// based on comDavraReadFilterListTable
widgetUtils.readFilterListTable = function(jQuerySelectionOfTable) {
    console.log('Reading filters in list ', jQuerySelectionOfTable);
    var labelFilters = {};
    $(jQuerySelectionOfTable).find('tr').each(function (rowIndex, rowEntry) {
        console.log('Reading filters, list entry ', $(this), rowIndex, rowEntry);
        var labelKey, labelValues;
        if ($(rowEntry).find('.staticLabelKey').length > 0) {
            labelKey = $(rowEntry).find('.staticLabelKey').text();
        }
        else {
            labelKey = $(rowEntry).find('.labelKey select').val();
        }
        labelValues = $(rowEntry).find('.labelValue select').val();
        console.log('labelKey is ', labelKey);
        // Confirm this key was already declared
        if (labelFilters.hasOwnProperty(labelKey)) {
            return { "ErrorContainsRepeat": labelKey };
        }
        if (labelKey != undefined && labelKey != '' && labelKey != 'None') {
            console.log('labelValues ', labelValues);
            if (labelValues != undefined && labelValues != null && labelKey.length > 0 && labelValues.length > 0) {
                labelFilters[labelKey] = labelValues;
            }
        }
    });
    return labelFilters;
}

// Popup notifications for the user
var comDavraPNotifyError = function(textToShow) {
    if(PNotify) {
        new PNotify({
            title: "Error",
            text: textToShow,
            type: 'error',
            styling: 'bootstrap3',
            delay: 5000,
            nonblock: {
                nonblock: true
            }
        });
        return false;
    }
}

// Send a new label (key and value) to the API so it will be available in the keys dropdown later
var comDavraPostNewLabel = function(labelKey, labelvalue) {
    var objectToSend = {};
    objectToSend[labelKey] = labelvalue;
    // Cannot use comDavraAjaxPost as the API doesn't respect json correct
    $.ajax('/api/v1/tags', {
        cache: false,
        data: JSON.stringify(objectToSend),
        method: "POST",
        processData: false,
        error: function(xhr, status, err) {
            console.log('Error during post to ' + urlEndpoint, err, status, xhr);
        }
    });
}

// // Convert an array to Js object
// // Eg. policy statement labels like [key: 'project', value: 'water-meter']
// // into: {project: "water-meter"}
// var comDavraConvertArrayOfKeyValuePairsToJsObject = function(arrayKeyValues) {
//     var objToReturn = {};
//     for(var tmpArrayIndex = 0; tmpArrayIndex < arrayKeyValues.length; tmpArrayIndex++) {
//         var tmpKey = arrayKeyValues[tmpArrayIndex].key;
//         var tmpVal = arrayKeyValues[tmpArrayIndex].value;
//         if(tmpKey != undefined && tmpKey != null && tmpKey.toString().length > 0) {
//             objToReturn[tmpKey] = tmpVal;
//         }
//     }
//     return objToReturn;
// }

// Remove unusual characters from an input. Do not allow spaces.
var comDavraStringSanitiseWithoutSpaces = function(incomingStr) {
    return incomingStr.replace(/[^a-zA-Z_0-9\-+]/g, "");
}

// Ensure users do not use special words which may have other meanings
// Will return true if the supplied string contains any special keywords
var comDavraStringContainsSpecialKeywords = function(incomingStr) {
    var returnBool = false;
    incomingStr = incomingStr.toLowerCase().trim();
    if(incomingStr == 'deviceid'
        || incomingStr == 'uuid'
        || incomingStr == 'tags'
        || incomingStr.indexOf('tenantid') > -1
        || incomingStr == 'serialnumber'
        || incomingStr == 'userid') {
        returnBool = true;
    }
    return returnBool;
}

widgetUtils.showFontAwesomeIconsModal = function(callback) {
    window.top.comDavraShowFontAwesomeIconsModal(function(icon) {
        console.log('###### showFontAwesomeIconsModal: ', icon);
        callback(icon);
    });
}

widgetUtils.widgetTemplateRename = function(widgetTemplateId, newName, callback) {
    window.top.comDavraWidgetTemplateRename(widgetTemplateId, newName, function(icon) {
        console.log('###### comDavraWidgetTemplateRename returned');
        if (callback) callback();
    });
}

widgetUtils.getUrlParameterFromTop = function(sParam) {
    var sPageURL = decodeURIComponent(window.top.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName.length > 0 && (sParameterName[0] === sParam || sParameterName[0].toLowerCase() === sParam.toLowerCase())) {
            return sParameterName[1] === undefined ? null : sParameterName[1].trim();
        }
    }
    return null;
};

widgetUtils.getApplication = function() {
    var appId = widgetUtils.getUrlParameterFromTop('appid');
    if (appId) {
        // console.log('Looking for app where id=' + appId + ' in ', comDavra.appsListObject);
        comDavra.appsListObject = window.top.comDavra.appsListObject || [];
        for (var i=0; i< comDavra.appsListObject.length; i++) {
            var app = comDavra.appsListObject[i]; 
            if (app._id && app._id['$oid'] === appId) {
                return {name: app.name, list: app.pages, appearance: app.appearance, login: app.login};
            }
        }
    }
    return null;
}

widgetUtils.getAppIdFromVanityUrl = function(url) {
    // console.log('Looking for app where url=' + url + ' in ', comDavra.appsListObject);
    comDavra.appsListObject = window.top.comDavra.appsListObject || [];
    for (var i=0; i< comDavra.appsListObject.length; i++) {
        var app = comDavra.appsListObject[i]; 
        if (app.url === appId) {
            return app._id['$oid'];
        }
    }
    return null;
}

widgetUtils.showWidgetModal = function(title, url, widgetContext, options, callback) {
    window.top.comDavraShowWidgetModal(title, url, widgetContext, options, function() {
        console.log('comDavraShowWidgetModal iframe has loaded');
        if (callback) callback();
    });
}

widgetUtils.resizeWidgetModal = function() {
    window.top.comDavraResizeWidgetModal();
}

widgetUtils.refreshTooltips = function() {
	if($().tooltip) {
		// Set the default placement to bottom but respect any which have the placement set
		$('[data-toggle="tooltip"]').each(function() {
			//console.log('Checking tooltip for ', $(this));
			if(typeof($(this).attr('data-placement')) === 'undefined' || $(this).attr('data-placement') === '') {
				$(this).attr('data-placement', 'bottom');
			}
		})
		$('[data-toggle="tooltip"]').tooltip({
				container: 'body',
				trigger : 'hover'
		});
	}
}


// Global object, One ring to rule them all. This will contain lots of properties for you to use later
// cacheTime is when the cache was loaded (possibly from session storage. Can be used to check if the cache is available yet.
var comDavra = { 
    "info": {},
    "cache": {},
    "cacheTime": {}
};  
comDavra.info.timeAtLoad = Date.now();   



// This function will populate some caches for devices and twins
// It relies on async calls so will call the callback when ready.
// It will populate the comDavra.cache object with the items retrieved.
// To invalidate a cache within session storage, use comDavraRemoveCachedSessionStorage('/api/v1/devices');
widgetUtils.comDavraLoadCachesDeviceAndTwins = function(forceFreshReloads, callback) {
    widgetUtils.comDavraAjaxGetCachedSessionStorage('/api/v1/devices', forceFreshReloads, function(err, devicesfromServer) {
        comDavra.cache.devices = devicesfromServer.records.slice();
        console.log('Cached devices from session ', comDavra.cache.devices.length);

        widgetUtils.comDavraAjaxGetCachedSessionStorage('/api/v1/twintypes', forceFreshReloads, function(err, twintypesfromServer) {
            comDavra.cache.twintypes = twintypesfromServer.slice();
            comDavra.cache.twintypesNames = []; // cache whereby the key is the twintype name and the value is the full object
            for(var tmpTwintypeIndex = 0; tmpTwintypeIndex < comDavra.cache.twintypes.length; tmpTwintypeIndex++) {
                var nameOfTwintype = comDavra.cache.twintypes[tmpTwintypeIndex].name;
                comDavra.cache.twintypesNames[nameOfTwintype] = comDavra.cache.twintypes[tmpTwintypeIndex];
            }
            console.log('Cached twintypes from session ', comDavra.cache.twintypes.length);

            widgetUtils.comDavraAjaxGetCachedSessionStorage('/api/v1/twins', forceFreshReloads, function(err, twinsfromServer) {
                comDavra.cache.twins = twinsfromServer.slice();
                console.log('Cached twins from session ',  comDavra.cache.twins.length);

                if(typeof(callback) != 'undefined') {
                    callback();
                }
            });
        });
    });
}




// If we already got the url and have it in browser sessions storage, return the cached response 
// otherwise perform a regular Ajax GET for simple JSON and store it in session storage for later
// To clear a cache item use: sessionStorage.removeItem(urlToGet) . Sample url is '/api/v1/devices'
// Set boolForceNewCall to true if you demand a fresh call to the API. ie. ignore any cache and update the cache with new info.
// Or comDavraRemoveCachedSessionStorage to remove an item
widgetUtils.comDavraAjaxGetCachedSessionStorage = function(urlToGet, boolForceNewCall, callback) {
    if(sessionStorage.getItem(urlToGet) === null || boolForceNewCall == true) {
        comDavraAjaxGet(urlToGet, function(err, data) {
            if(err === null) {
                if(widgetUtils.comDavraIsJsonObject(data)) {
                    console.log('comDavraAjaxGetCachedSessionStorage got new data for ' + urlToGet + ' and is a json object');
                    try {
                        sessionStorage.setItem(urlToGet, JSON.stringify(data));
                        // Store the time this cache item was retrieved. Can be used for cache invalidation later
                        sessionStorage.setItem('cacheInfo_' + urlToGet, JSON.stringify({
                            "timeRetrieved": Date.now().toString()
                        }));
                    } catch (error) {
                        console.log('Cache attempt to set failed');
                    }
                } else {
                    console.log('comDavraAjaxGetCachedSessionStorage is not JSON ', urlToGet);
                }
            }
            if(callback) {
                callback(err, data);
            }
        });
        return;
    } else {
        if(callback) {
            callback(null, JSON.parse(sessionStorage.getItem(urlToGet)));
        }
    }
}

var comDavraRemoveCachedSessionStorage = function(urlToGet, boolForceNewCall, callback) {
    try {
        sessionStorage.removeItem(urlToGet);
        sessionStorage.removeItem('cacheInfo_' + urlToGet);
        if(callback) {
            callback();
        }
    } catch (error) {
        if(callback) {
            callback();
        }
    }
};



/************************  NETWORKING HELPERS *************************** */

// Perform a regular Ajax GET for simple JSON
var comDavraAjaxGet = function(urlToGet, callback) {
    $.ajax(urlToGet, {
        cache: false,
        dataType: "json",
        method: "GET",
        processData: true,
        contentType: "application/json",
        error: function(xhr, status, err) {
            console.log('Error getting ' + urlToGet, err);
            if(callback) {
                callback(err, null);
            }
        },
        success: function(data, status, xhr) {
            if(callback) {
                callback(null, data);
            }
        }
    });
}

// If we already got the url, return the cached response otherwise perform a regular Ajax GET for simple JSON
var comDavraAjaxGetCached = function(urlToGet, callback) {
    if(comDavra.cachedAjaxResponses == undefined || comDavra.cachedAjaxResponses[urlToGet] == undefined) {
        comDavraAjaxGet(urlToGet, function(err, data) {
            try {
                if(comDavra.cachedAjaxResponses == undefined) {
                    comDavra.cachedAjaxResponses = {};
                }
                comDavra.cachedAjaxResponses[urlToGet] = data;
            } catch(error) {
                console.log('Error noticed while storing cache of ', urlToGet);
            }
            callback(err, data);
        });
        return;
    } else {
        callback(null, comDavra.cachedAjaxResponses[urlToGet]);
    }
}