/**
 * Celebros Translate Js v0.9.1 - Copyright (c) 2010 - 2018 Celebros Ltd. (http://www.celebros.com)
 */
;var celTranslate = {
    inputId: '#search',
    formId: '#search_mini_form',
    toLang: 'en',
    fromLang: 'auto',
    apiKey: '',
    ajax: {},
    apiUrl: 'https://www.googleapis.com/language/translate/v2/',
    hiddenInputId: 'search-query',
    searchQueryName: 'q',
    isTranslated: false,
    pendingSubmit: false,
    debug: true,
    endpoints: {
        translate: '',
        detect: 'detect',
        languages: 'languages'
    },
    init: function()
    {
        here = this;
        jQuery(here.inputId).parent().append('<input id="' + here.hiddenInputId + '" name="' + here.searchQueryName + '" type="hidden" value=""/>');
        jQuery(here.inputId).removeAttr('name');
        jQuery(here.inputId).on('keyup', function(){
            here.initValue();
            here.translate(jQuery(this).val());
        });
        jQuery(here.formId).bind('submit', function(ev){
            here.pendingSubmit = true;
            here.consoleDebug('translated: '+here.isTranslated);
            if (!here.isTranslated) {
                return false;
            }
        });
        jQuery(document).bind('cel:translate:done', function(){
            here.isTranslated = true;
            setTimeout( function() {
                if (here.pendingSubmit && here.isTranslated) {
                    here.consoleDebug(here);
                    jQuery(here.formId).submit();
                }
            }, 200);
        });
        here.consoleDebug('init done');
    },
    consoleDebug: function(text)
    {
        if (this.debug) {
            console.log('cel-translate:');
            console.log(text);
        }  
    },
    initValue: function()
    {
        here = this;
        value = jQuery(here.inputId).val();
        jQuery('#' + here.hiddenInputId).val(value);
    },
    apiRequest: function(endpoint, data, type, callback)
    {
        here = this;
        url = here.apiUrl + endpoint;
        url += '?key=' + here.apiKey;
        var response = false;
      
        if (endpoint !== here.endpoints.languages || endpoint !== here.endpoints.detect) {
            url += '&q=' + encodeURI(data.textToTranslate);
        }

        if (data.sourceLang == 'auto') {
            delete data.sourceLang;
            delete data.targetLang;

            here.apiRequest(here.endpoints.detect, data, 'GET', here.afterDetect);
            return;
        }
        
        if (endpoint === here.endpoints.translate) {
            url += '&target=' + data.targetLang;
            url += '&source=' + data.sourceLang;
        }
        
        here.ajax[endpoint] = jQuery.ajax({
            url: url,
            type: type || 'GET',
            data: data ? JSON.stringify(data) : '',
            dataType: 'json',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            beforeSend: function(xhr) {
                here.progress = true;
                if (here.ajax[endpoint]) {
                    here.ajax[endpoint].abort();
                }
            },
            success: function(result) {
                here.progress = false;
                delete here.ajax[endpoint];
                callback(result, data);
            }
        }); 
    },
    setValueToSearchQuery: function(response, data)
    {
        here.consoleDebug('translated text: ' + response.data.translations[0].translatedText);
        value = response.data.translations[0].translatedText
        jQuery('#' + here.hiddenInputId).val(value);
        setTimeout( function(){
            jQuery(document).trigger('cel:translate:done', [response, data]);
        }, 100);    
    },
    afterDetect: function(response, data) {
        confidence = response.data.detections[0][0].confidence;
        if (confidence > 0.6) {
            fromLang = response.data.detections[0][0].language;
        } else {
            fromLang = 'en';
        }
        here.consoleDebug('Confidence: ' + confidence);        
        here.consoleDebug('Detected lang: ' + fromLang);

        if (fromLang == here.toLang) {
            here.initValue();
            setTimeout( function(){
                jQuery(document).trigger('cel:translate:done', [response, data]);
            }, 100); 
        } else {
            newData = {
                textToTranslate: data.textToTranslate,
                sourceLang: fromLang,
                targetLang: here.toLang,
            };
            
            here.apiRequest(here.endpoints.translate, newData, 'GET', here.setValueToSearchQuery);
        }        
    },
    translate: function(text)
    {
        here = this;
        here.isTranslated = false;
        data = {
            sourceLang: this.fromLang,
            targetLang: this.toLang,
            textToTranslate: text
        };
      
        here.apiRequest(here.endpoints.translate, data, 'GET', here.setValueToSearchQuery);
    }
};