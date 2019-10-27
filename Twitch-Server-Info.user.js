// ==UserScript==
// @name        Twitch-Server-Info
// @namespace   Twitch-Server-Info
// @version     0.0.6
// @author      Nomo, SJang1(fork)
// @description Check Twitch server location.
// @icon        https://raw.githubusercontent.com/SJang1/Twitch-Server-Info/master/images/logo.png
// @supportURL  https://github.com/SJang1/Twitch-Server-Info/issues
// @homepageURL https://github.com/SJang1/Twitch-Server-Info/
// @downloadURL https://raw.githubusercontent.com/SJang1/Twitch-Server-Info/master/Twitch-Server-Info.user.js
// @updateURL   https://raw.githubusercontent.com/SJang1/Twitch-Server-Info/master/Twitch-Server-Info.user.js
// @include     *://*.twitch.tv/*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js
// @run-at      document-start
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_setClipboard
// @grant       unsafeWindow
// @grant       GM_registerMenuCommand
// ==/UserScript==

////////////////////////////////////////////////////////////////////////////////////
// Set Your Tries to fix Twitch server
////////////////////////////////////////////////////////////////////////////////////
var FixServer = true; // true to try fix server, false to not.
var ServerName = ["sel", "sea"]; // server you want to get into
var UpdateTries = 15; // how many times to try fix server
var UpdateDelayTime = 500; // ms



/*jshint multistr: true */
if (window.TWITCH_SERVER_INFO === undefined) {
    unsafeWindow.TWITCH_SERVER_INFO = true;
    console.log("[TSI]   RUNNING TWITCH SERVER INFO", document.location.href);
    ////////////////////////////////////////////////////////////////////////////////////
    // libs
    ////////////////////////////////////////////////////////////////////////////////////
    (function () {
        Date.prototype.format = function (f) {
            if (!this.valueOf()) return " ";

            var weekName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            var d = this;
            var h = d.getHours() % 12;

            return f.replace(/(yyyy|yy|MM|dd|E|hh|mm|ss|a\/p|amp)/gi, function ($1) {
                switch ($1) {
                    case "yyyy":
                        return d.getFullYear();
                    case "yy":
                        return (d.getFullYear() % 1000).zf(2);
                    case "MM":
                        return (d.getMonth() + 1).zf(2);
                    case "dd":
                        return d.getDate().zf(2);
                    case "E":
                        return weekName[d.getDay()];
                    case "HH":
                        return d.getHours().zf(2);
                    case "hh":
                        return (h ? h : 12).zf(2);
                    case "mm":
                        return d.getMinutes().zf(2);
                    case "ss":
                        return d.getSeconds().zf(2);
                    case "a/p":
                        return d.getHours() < 12 ? "오전" : "오후";
                    case "amp":
                        return d.getHours() < 12 ? "AM" : "PM";
                    default:
                        return $1;
                }
            });
        };
        String.prototype.string = function (len) {
            var s = '',
                i = 0;
            while (i++ < len) {
                s += this;
            }
            return s;
        };
        String.prototype.zf = function (len) {
            return "0".string(len - this.length) + this;
        };
        Number.prototype.zf = function (len) {
            return this.toString().zf(len);
        };
    })();


    // for debug
    var NOMO_DEBUG = function ( /**/ ) {
        if (nomo_global.DEBUG) {
            var args = arguments,
                args_length = args.length,
                args_copy = args;
            for (var i = args_length; i > 0; i--) {
                args[i] = args_copy[i - 1];
            }
            args[0] = "[TSI]  ";
            args.length = args_length + 1;
            console.log.apply(console, args);
        }
    };

    // for message
    var simple_message = function(msg, $elem){
        if($elem === undefined){
            $elem = $("body");
        }
        var prefix = "GM_setting_autosaved";
        var positiontext = "left";

        $elem.find("."+prefix).animate({bottom:"+=40px"}, {duration:300, queue: false}); // cleqrQueue().dequeue().finish().stop("true","true")
        // @keyframes glow {to {text-shadow: 0 0 10px white;box-shadow: 0 0 10px #5cb85c;}}
        $("<div style='animation: glow .5s 10 alternate; position:fixed; "+positiontext+":10px; bottom:20px; z-index:10000000;' class='"+prefix+" btn btn-success'>"+msg+"</div>")
            .appendTo($elem)
            .fadeIn("fast")
            .animate({opacity:1}, 10000, function(){
                $(this).fadeOut("fast").delay(600).remove();
            })
            .animate({left:"+=30px"}, {duration:300, queue: false});
    };
    ////////////////////////////////////////////////////////////////////////////////////
    // Initialize
    ////////////////////////////////////////////////////////////////////////////////////
    const LOGGING_MAX = 1000;
    const FIXER_DELAY_MIN = 250;
    var SETTIMEOUT_FIXED_FAILED = undefined;
    var SETTIMEOUT_FIXER_EGG = undefined;
    var FIXER_EGG_COUNT = 0;

    var NOMO_getValue = function (name, val) {
        return (typeof GM_getValue === "function" ? GM_getValue(name, val) : val);
    };
    var NOMO_setValue = function (name, val) {
        return (typeof GM_setValue === "function" ? GM_setValue(name, val) : val);
    };

    // global variable
    var nomo_global = {
        "DEBUG": NOMO_getValue("DEBUG", false),
        "DEBUG_FETCH": NOMO_getValue("DEBUG_FETCH", false),
        "LOGGING": NOMO_getValue("LOGGING", false),
        "FIXER": NOMO_getValue("FIXER", false),
        "FIXER_SERVER": NOMO_getValue("FIXER_SERVER", ServerName),
        "FIXER_ATTEMPT_MAX": NOMO_getValue("FIXER_ATTEMPT_MAX", UpdateTries),
        "FIXER_DELAY": NOMO_getValue("FIXER_DELAY", UpdateDelayTime),
        "SERVER_CHANGE_SHOW": NOMO_getValue("SERVER_CHANGE_SHOW", true),
        "FixServer_STATUS": NOMO_getValue("FixServer_STATUS", FixServer),
        "prev_server": ""
    };

    // FIXER_SERVER work?
    if(typeof nomo_global.FIXER_SERVER === "string"){
        if(nomo_global.FIXER_SERVER.indexOf(",") !== -1){
            nomo_global.FIXER_SERVER = nomo_global.FIXER_SERVER.split(",");
        }
        else{
            nomo_global.FIXER_SERVER = [nomo_global.FIXER_SERVER];
        }
    }
    for (var i = 0; i < nomo_global.FIXER_SERVER.length; i++) {
        nomo_global.FIXER_SERVER[i] = nomo_global.FIXER_SERVER[i].replace(/("|'|`)/g, '').toLowerCase();
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Console Interface
    ////////////////////////////////////////////////////////////////////////////////////
    // input TWITCH_SERVER_INFO_DEBUG() at console to debug
    unsafeWindow.TWITCH_SERVER_INFO_DEBUG = function () {
        nomo_global.DEBUG = !nomo_global.DEBUG;
        NOMO_setValue("DEBUG", nomo_global.DEBUG);
        return "DEBUG: " + nomo_global.DEBUG;
    };

    // input TWITCH_SERVER_INFO_LOGGING() at console for logging
    unsafeWindow.TWITCH_SERVER_INFO_LOGGING = function () {
        nomo_global.LOGGING = !nomo_global.LOGGING;
        NOMO_setValue("LOGGING", nomo_global.LOGGING);
        return "LOGGING: " + nomo_global.LOGGING;
    };

    // input TWITCH_SERVER_INFO_CLEARLOG() at console to clear the logs
    unsafeWindow.TWITCH_SERVER_INFO_CLEARLOG = function () {
        NOMO_setValue("LOG", []);
        return "CLEAR LOG";
    };

    // input TWITCH_SERVER_INFO_SHOWLOG() at console to show the logs
    unsafeWindow.TWITCH_SERVER_INFO_SHOWLOG = function () {
        var log_data = NOMO_getValue("LOG", []);
        for (var key in log_data) {
            log_data[key][0] = new Date(log_data[key][0] * 1000).format("yyyy-MM-dd amp hh:mm:ss");
        }
        return log_data;
    };

    unsafeWindow.TWITCH_SERVER_INFO_SET_VAL = function (name, val) {
        if (typeof GM_setValue === "function") {
            nomo_global[name] = val;
            GM_setValue(name, val);
        }
        return val;
    };

    unsafeWindow.TWITCH_SERVER_INFO_FIXER = function () {
        return TWITCH_SERVER_INFO_SET_VAL("FIXER", !nomo_global.FIXER);
    };

    var set_log = function(log){
        if (!nomo_global.LOGGING){
            return;
        }
        // change unix time as ms to s
        var date_n = Number(new Date());
        var date_s = String(date_n).substr(0, String(date_n).length - 3);

        // set data
        var log_data = NOMO_getValue("LOG", []);
        var new_log_data = [date_s].concat(log);
        log_data.unshift(new_log_data);
        if (log_data.length > LOGGING_MAX) {
            log_data = log_data.slice(0, LOGGING_MAX);
        }
        NOMO_setValue("LOG", log_data);
        NOMO_DEBUG("로깅 완료", new_log_data);
    };

    // set menu settings
    var GM_Setting_Bootstrap = 'GM_Setting_Bootstrap';
    if (typeof GM_registerMenuCommand === "function") {
        GM_registerMenuCommand("Change Notification Setting", function () {
            TWITCH_SERVER_INFO_SET_VAL("SERVER_CHANGE_SHOW", !nomo_global.SERVER_CHANGE_SHOW);
            if(nomo_global.SERVER_CHANGE_SHOW){
                simple_message("Server Change Notification : ON");
            }
            else {
                simple_message("Server Change Notification : OFF");
            }
        });
    }

    // server list 1 - not in use
    // var server_list = [
    //     ["GL", "Edgecast", "g1.edgecast.hls.ttvnw.net"],
    //     ["US", "San Francisco", "video-edge-2ca3e4.sfo01.hls.ttvnw.net"],
    //     ["US", "Seattle", "video-edge-7e8e10.sea01.hls.ttvnw.net"],
    //     ["US", "San Jose", "video-edge-7e96ac.sjc01.hls.ttvnw.net"],
    //     ["US", "San Jose", "?.sjc02.hls.ttvnw.net"],
    //     ["US", "Chicago", "video-edge-835140.ord02.hls.ttvnw.net"],
    //     ["US", "Washington", "video20.iad02.hls.ttvnw.net"],
    //     ["US", "New York", "video-edge-8fd0d8.jfk03.hls.ttvnw.net"],
    //     ["US", "Los Angeles", "video20.lax01.hls.ttvnw.net"],
    //     ["US", "Dallas", "video20.dfw01.hls.ttvnw.net"],
    //     ["US", "Miami", "video-edge-7ea8a4.mia02.hls.ttvnw.net"],
    //     ["SE", "Stockholm", "video-edge-69c1b0.arn01.hls.ttvnw.net"],
    //     ["UK", "London", "video20.lhr02.hls.ttvnw.net"],
    //     ["NL", "Amsterdam", "video20.ams01.hls.ttvnw.net"],
    //     ["FR", "Paris", "video-edge-49b0d4.cdg01.hls.ttvnw.net"],
    //     ["DE", "Frankfurt", "video-edge-748bd0.fra01.hls.ttvnw.net"],
    //     ["PL", "Warsaw", "video-edge-8f9918.waw01.hls.ttvnw.net"],
    //     ["CZ", "Prague", "video-edge-4ae010.prg01.hls.ttvnw.net"],
    //     ["AU", "Sydney", "video-edge-8c6ee0.syd01.hls.ttvnw.net"],
    //     ["AS", "Hongkong", "video-edge-7cf698.hkg01.hls.ttvnw.net"],
    //     ["AS", "Tokyo", "video-edge-7cfe50.tyo01.hls.ttvnw.net"],
    //     ["AS", "Seoul", "video-edge-230da0.sel01.abs.hls.ttvnw.net"],
    //     ["AS", "Seoul", "??.sel02.abs.hls.ttvnw.net"],
    //     ["AS", "Seoul", "video-edge-0a9354.sel03.hls.ttvnw.net"]
    // ];

    // server list 2
    // more info: https://twitchstatus.com/
    var server_list_2 = [
        ["hkg", "AS: Hong Kong"],
        ["sel", "AS: Seoul, South Korea"],
        ["sin", "AS: Singapore"],
        ["tpe", "AS: Taipei, Taiwan"],
        ["tyo", "AS: Tokyo, Japan"],
        ["syd", "AU: Sydney"],
        ["lis", "DEPRECATED Europe: Portugal, Lisbon"],
        ["scl", "DEPRECATED South America: Chile"],
        ["lim", "DEPRECATED South America: Lima, Peru"],
        ["mde", "DEPRECATED South America: Medellin, Colombia"],
        ["gig", "DEPRECATED South America: Rio de Janeiro, Brazil"],
        ["gru", "DEPRECATED South America: Sao Paulo, Brazil"],
        ["eze", "DEPRECATED: South America: Argentina"],
        ["vie", "Europe: Austria, Vienna"],
        ["cph", "Europe: Copenhagen, Denmark"],
        ["prg", "Europe: Czech Republic, Prague"],
        ["hel", "Europe: Finland, Helsinki"],
        ["mrs", "Europe: France, Marseille"],
        ["cdg", "Europe: France, Paris"],
        ["ber", "Europe: Germany, Berlin"],
        ["fra", "Europe: Germany, Frankfurt"],
        ["mil", "Europe: Italy, Milan"],
        ["ams", "Europe: Netherlands, Amsterdam"],
        ["osl", "Europe: Norway, Oslo"],
        ["waw", "Europe: Poland, Warsaw"],
        ["mad", "Europe: Spain, Madrid"],
        ["arn", "Europe: Sweden, Stockholm"],
        ["lhr", "Europe: United Kingdom, London"],
        ["ymq", "NA: Quebec, Canada"],
        ["qro", "NA: Queretaro, Mexico"],
        ["yto", "NA: Toronto, Canada"],
        ["slc", "Salt Lake City, UT"],
        ["sea", "Seattle, WA"],
        ["rio", "South America: Rio de Janeiro, Brazil"],
        ["sao", "South America: Sao Paulo, Brazil"],
        ["dfw", "US Central: Dallas, TX"],
        ["den", "US Central: Denver, CO"],
        ["hou", "US Central: Houston, TX"],
        ["iad", "US East: Ashburn, VA"],
        ["atl", "US East: Atlanta, GA"],
        ["ord", "US East: Chicago"],
        ["mia", "US East: Miami, FL"],
        ["jfk", "US East: New York, NY"],
        ["lax", "US West: Los Angeles, CA"],
        ["phx", "US West: Phoenix, AZ"],
        ["pdx", "US West: Portland, Oregon"],
        ["sfo", "US West: San Francisco, CA"],
        ["sjc", "US West: San Jose,CA"],
        ["akamai", "Akamai"],
    ];

    // styles
    if (typeof GM_addStyle === "function") {
        GM_addStyle( /*css*/ `
            div.player-buttons-right #current_server{
                bottom:42px;
                right:18px;
            }
            #current_server{
                color:#fff;
                z-index:10;
                position:absolute;
                bottom:34px;
                right:6px;
                text-align:right;
                font-size:11px;
                ${typeof GM_setClipboard === "function" ?
                `user-select: text;
                cursor: pointer;` : ``}
            }

            #copied{
                background-color:#686878;
                border-radius:10px;
                padding:1px 7px;
                margin-right:7px;
                user-select: none;
            }

            #fixer_loader{
                width:100%;
                height:100%;
                position:absolute;
                top:0;
                left:0;
                background:rgba(0,0,0,0.7);
                z-index:10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #fixer_loader .loader_text{
                color:#fff;
                margin-top:0px;
                font-size:1.5em;
                color:#fff;
                position: absolute;
                top: auto;
                left: auto;
            }

            #fixer_loader .loader_contents,
            #fixer_loader .loader_contents:after {
            border-radius: 50%;
            width: 10em;
            height: 10em;
            }
            #fixer_loader .loader_contents {
            margin: 60px auto;
            font-size: 10px;
            position: relative;
            text-indent: -9999em;
            border-top: 1.1em solid rgba(255, 255, 255, 0.1);
            border-right: 1.1em solid rgba(255, 255, 255, 0.1);
            border-bottom: 1.1em solid rgba(255, 255, 255, 0.1);
            border-left: 1.1em solid rgba(255, 255, 255, 0.35);
            -webkit-transform: translateZ(0);
            -ms-transform: translateZ(0);
            transform: translateZ(0);
            -webkit-animation: load8 0.5s infinite linear;
            animation: load8 0.5s infinite linear;
            }

            @keyframes glow_twitch {to {text-shadow: 0 0 15px white;box-shadow: 0 0 15px #7d5bbe;}}
            .tsi_sc {
                user-select:none;
                cursor:pointer;
                padding:5px 10px !important;
                background:rgba(0,0,0,0.7);
                color:#fff;
                border-radius:5px;
                animation:glow_twitch .5s 20 alternate;
                font-size:13px;z-index:10;position:absolute;
                position:absolute;left:50%;
                bottom:20px;
                transform:translateX(-50%);
            }

            @-webkit-keyframes load8 {
            0% {
                -webkit-transform: rotate(0deg);
                transform: rotate(0deg);
            }
            100% {
                -webkit-transform: rotate(360deg);
                transform: rotate(360deg);
            }
            }
            @keyframes load8 {
            0% {
                -webkit-transform: rotate(0deg);
                transform: rotate(0deg);
            }
            100% {
                -webkit-transform: rotate(360deg);
                transform: rotate(360deg);
            }
            }

            .player-tip, .player-button{
                z-index:60 !important;
            }
            .pl-menu, .pl-menu *{
                z-index:70 !important;
            }

            .GM_setting_autosaved.btn{
                max-width:100%;
                font-size:12px;
                white-space:pre-wrap;
                user-select:text;
             }
             @keyframes glow {to {text-shadow: 0 0 10px white;box-shadow: 0 0 10px #5cb85c;}}
             .GM_setting_autosaved.btn{display:inline-block;margin-bottom:0;font-weight:normal;text-align:center;vertical-align:middle;cursor:pointer;background-image:none;border:1px solid transparent;padding:6px 12px;line-height:1.42857143;border-radius:4px;}
             .GM_setting_autosaved.btn:focus,.GM_setting_autosaved.btn:active:focus,.GM_setting_autosaved.btn.active:focus{outline:thin dotted;outline:5px auto -webkit-focus-ring-color;outline-offset:-2px}
             .GM_setting_autosaved.btn:hover,
             .GM_setting_autosaved.btn:focus{color:#fff;text-decoration:none}
             .GM_setting_autosaved.btn:active,
             .GM_setting_autosaved.btn.active{outline:0;background-image:none;-webkit-box-shadow:inset 0 3px 5px rgba(0,0,0,0.125);box-shadow:inset 0 3px 5px rgba(0,0,0,0.125)}
             .GM_setting_autosaved.btn-success{color:#fff;background-color:#5cb85c;border-color:#4cae4c}
        `);
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // get Worker
    ////////////////////////////////////////////////////////////////////////////////////
    var realWorker = unsafeWindow.Worker;
    unsafeWindow.Worker = function (input) {
        // change String
        var newInput = String(input);
        NOMO_DEBUG("newInput", newInput);

        // 19-09-18 wasmworker version: 2.14.0
        var myBlob = "importScripts('https://cvp.twitch.tv/2.14.0/wasmworker.min.js')"; // ""

        // check worker version
        // use async false to return
        $.ajax({
                url: newInput,
                type: "GET",
                async: false,
                timeout: 2000,
            })
            .done(function (response) {
                myBlob = response;
                NOMO_DEBUG("ajax response", response);
            })
            .fail(function (error) {
                myBlob = "importScripts('https://cvp.twitch.tv/2.14.0/wasmworker.min.js')";
                NOMO_DEBUG("Request failed", error);
            })
            .always(function (com) {
                NOMO_DEBUG("Complete", com);
            });

        // rewrite blob
        var workerBlob = new Blob(
            [ /*javascript*/ `
                // global 변수 가져오기
                const FIXER = ${nomo_global.FIXER};
                const FIXER_SERVER = ${nomo_global.FIXER_SERVER.length > 0 ? '["'+(nomo_global.FIXER_SERVER).join('","')+'"]' : "[]"};
                const FIXER_ATTEMPT_MAX = ${nomo_global.FIXER_ATTEMPT_MAX};
                const FIXER_DELAY = ${FIXER_DELAY_MIN  >= nomo_global.FIXER_DELAY ? nomo_global.FIXER_DELAY : FIXER_DELAY_MIN};
                const DEBUG_WORKER = ${nomo_global.DEBUG};
                const FixServer_STATUS = ${nomo_global.FixServer_STATUS};
                var FIXER_count = 1;
                var FIXED = false;
                var FIXED_SERVER = undefined;
                function sleep(ms) {
                    return new Promise(resolve => setTimeout(resolve, ms));
                }

                // WORKER 내 디버깅용 함수
                var NOMO_DEBUG = function ( /**/ ) {
                    if (DEBUG_WORKER) {
                        var args = arguments,
                            args_length = args.length,
                            args_copy = args;
                        for (var i = args_length; i > 0; i--) {
                            args[i] = args_copy[i - 1];
                        }
                        args[0] = "[TSI]  ";
                        args.length = args_length + 1;
                        console.log.apply(console, args);
                    }
                };

                // Worker 내부의 fetch 함수 탈취 & 덮어쓰기
                const originalFetch = self.fetch;
                self.fetch = async function(input, init){
                    // Worker 밖으로 메시지 보내기
                    postMessage({"id":0,"type":"tsi","arg":input,"fixed":{"FIXED":FIXED,"FIXER_count":FIXER_count}});

                    // Server Fixer (Auto Reconnector)
                    if(FIXER
                        && FIXER_SERVER !== undefined 
                        && FIXER_SERVER.length > 0 
                        && input.indexOf('usher.ttvnw.net/api/channel/hls') !== -1){
                        FIXED = false;
                        FIXER_count = 1;
                        NOMO_DEBUG("첫 채널 접속 시 URL 감지됨", input);
                        
                        // 반복 시작
                        if(FixServer_STATUS == true){
                            while(!FIXED && FIXER_count <= FIXER_ATTEMPT_MAX){
                                NOMO_DEBUG("서버 자동 잡기 시도 중...");
                                NOMO_DEBUG("현재 시도 수", (FIXER_count) + " / " + FIXER_ATTEMPT_MAX);

                                var m3u8_fetch = await originalFetch.apply(this, arguments);
                                var m3u8_text = await m3u8_fetch.text();
                                // NOMO_DEBUG("m3u8_text", m3u8_text);

                                // error 발생하는지 확인
                                if(m3u8_text.indexOf("error_code") !== -1 || m3u8_text.indexOf("Can not fi") !== -1){
                                    NOMO_DEBUG("에러 발생, 중지", {m3u8_text});
                                    break;
                                }

                                // 클러스터 문구 존재하는지 확인
                                var cluster_str;
                                // 클러스터 문구 존재하면 추출
                                if((/CLUSTER=/).test(m3u8_text)){
                                    cluster_str = m3u8_text.split("CLUSTER=")[1].split(",")[0].replace(/"/g,'');
                                    NOMO_DEBUG("클러스터 문구 존재", cluster_str);

                                    for(var SN of FIXER_SERVER){
                                        // 원하는 서버를 찾은 경우
                                        if(cluster_str.indexOf(SN) !== -1){
                                            FIXED = true;
                                            NOMO_DEBUG("원하는 서버를 찾았다", SN, cluster_str);
                                            break;
                                        }
                                    }
                                }
                                // 클러스터 문구 존재하지 않음
                                else{
                                    NOMO_DEBUG("CLUSTER 문구가 존재하지 않음, 재시도");
                                    cluster_str = "Server name not found.";
                                }

                                // Loader 표시를 위해 postMessage 보내기
                                postMessage({"id":0,"type":"tsi_fixer","arg":"","fixed":{"FIXED":FIXED,"CURRENT_SERVER":cluster_str,"FIXER_count":FIXER_count}});

                                // 원하는 서버를 찾은 경우 or 최대 카운트에 도달한 경우
                                if(FIXED || FIXER_count === FIXER_ATTEMPT_MAX){
                                    // blob 로 만들어서 리턴한다.
                                    var m3u8_blob = new Blob([m3u8_text], {
                                        type: 'text/plain'
                                    });
                                    var m3u8_blob_url = URL.createObjectURL(m3u8_blob);
                                    var new_arg = arguments;
                                    new_arg[0] = m3u8_blob_url;
                                    NOMO_DEBUG("step2", m3u8_blob_url);
                                    // 10초 후 REVOKE 되도록 설정
                                    setTimeout(function(){URL.revokeObjectURL(m3u8_blob_url)},10000);
                                    return originalFetch.apply(this, new_arg);
                                }
                                else{
                                    // 원하는 서버를 찾지 못한 경우
                                    NOMO_DEBUG("원하는 서버를 찾지 못했다", FIXER_SERVER, cluster_str);
                                    FIXER_count = FIXER_count + 1;
                                }

                                // 여기까지 온 경우 FIXER_DELAY 간격으로 재시도
                                await sleep(FIXER_DELAY);

                            };  // ServerFix ON인 경우에만 작동 끝
                        }   // while 문 끝
                    }   // 반복을 위한 if 문 끝

                    return originalFetch.apply(this, arguments);
                };

                ${myBlob};
                //importScripts('https://cvp.twitch.tv/2.14.0/worker.min.js');
            `], {
                type: 'text/javascript'
            }
        );
        // end rewrite blob

        var workerBlobUrl = URL.createObjectURL(workerBlob);
        var my_worker = new realWorker(workerBlobUrl);

        ////////////////////////////////////////////////////////////////////////////////////
        // Worker 밖에서 postMessage 수신 및 DOM 생성
        ////////////////////////////////////////////////////////////////////////////////////
        my_worker.onmessage = function (e) {
            // 로깅을 위한 기본 정보 확인
            // 주소로부터 스트리머 id 가져오기
            var streamer_id = String(document.location.href).match(/twitch\.tv\/(?:.+channel=)?([a-zA-Z0-9-_]+)\/?/); // /twitch\.tv\/(([a-zA-Z0-9-_]+)|.+channel=([a-zA-Z0-9-_]+))\/?/
            streamer_id = (streamer_id !== null ? streamer_id.pop() : "");

            // 타입 확인: tsi (기본)
            if (e.data.type === "tsi") {
                var msg_arg = e.data.arg;
                
                if (nomo_global.DEBUG_FETCH) {
                    NOMO_DEBUG('Message received from worker', e.data);
                }

                // master playlist or vod 여부 확인
                var is_master_playlist = msg_arg.indexOf('usher.ttvnw.net/api/channel/hls') !== -1;
                var is_vod = msg_arg.indexOf('usher.ttvnw.net/vod/') !== -1;
                if (is_master_playlist){
                    set_log(["mp", streamer_id]);
                }

                // 채널 첫 접속 시 .m3u8 파일 or vod 재생 시 서버 표시 DOM 을 지운다
                if (is_master_playlist || is_vod) {
                    // 기존 DOM을 지운다.
                    $("#current_server").remove();
                    nomo_global.prev_server = "";
                    nomo_global.prev_server_list = [];
                }
                // 주소에 /v1/segment/ 이 포함되었는지 1차적으로 거른다.
                else if (msg_arg.indexOf("/v1/segment/")) {
                    // sample 1: https://video-edge-7e9b9c.sea01.abs.hls.ttvnw.net/v1/segment/CrkETpsPvu8J-JU7Uw41bTmckS0cEofD3pr3EKsfyLpEMWZgb5zeNdYkjkVo5KBYM95UtJvXIJsRRMKazzgDmtksZTSZU-f_EkxSuZrsRdGoaCeHqzbT4l-8mb0OOh9FohqMuzmla4eSVEagbddvmI-_vm3fXDRUehf2BtfhApNVXkcsCVhmrgUKXDuP8YWfdTwmQalG1YnIFtbRg3xw9CVKqajbU4FLcgI0sLHpS-bb3OquKpucwfo8paJyXh7XWCsRF_yLIcbv6iSS7i83uVTTHx54NX8V0K5CntIfVWAfYG-xaypl6qKAKKIRbNa-hsRSQ62Kvqltb_mu6LhStkK1F3qmln_e1hCc7ytx7TVAJmK-GeeplfvCGIxI4qnhl3dSTV0RushnljKYgiA3kt_yC-KbqPPMjTcRgyitGwjyxpHweeQJfJqFGJizcpaFMzmdI5gW_CbdXhX4FWq6TCaRjSCgwx_ewXC5Ct6W7QnWaep35BhxdhX1i0-hh7YflMDFKAykfB07m48DWINT_Fn1K98J0tLKL7yaNJedzM2PhF9AeARA5_fSTzBkA_duOY9fmpOpRFN1VpfmHID3tYDY1F_XZJJmiG6rd_UynJfji8ikbhwkgVc0_QWtOerN10ysY3IvUjlIJn0RwFScCNqdUoMKMKPMsOMfaS1oc1vq8YBPCagEgLnBk6A0d6A61x3brmAU2RaiOCEMChn-n80GyEH3AoIoDOW3fj6lOg1M2uKlMb8vPBYpYp8SEPpaz83YuxcS4pbU4mznHkMaDAsKJElIKxXWiGX3zw.ts
                    // sample 2: https://live003-ttvnw.akamaized.net/v1/segment/CsoBN06NSMlknciQP8zdCmSmxw4Zz7GxFwO-SNrfef7l7Z7x-pDKXl6F0jeUDQSkwEXm61AgNcRXavIb-g9kT8U4XkZaOBhtJa0DxO10EkIFpePqwhq7Vmazjn1E0cZ1vzp_dQmnBirLIYTUssV3NmwNAjA5-pIMqrj4ibG4h8r3xr2lRz-yAyzatBu0d9HgvGWYRvSWVm1I6bZ8ii_sNV1squ9LlvIEJ0uQ1bCvVnP7sMmurlnKvTx-VDwQ8veMH5G1FQbwm9ta8RmpLBIQHt-eAsho321hz6pZk697kBoMVpjw0pSuRgcYKTDb.ts
                    var current_server = msg_arg.match(/\/\/(?:vid[a-zA-Z0-9-_]+\.)?([a-zA-Z0-9-_.]+)\/v1\/segment\/.+\.ts/);

                    // 서버 명을 제대로 찾은 경우
                    if (current_server !== null) {
                        // 서버 주소 가져오기
                        current_server = current_server.pop();

                        // 기존에 가져온 이름과 동일한지 확인하여 다를 경우에만 DOM 재생성
                        if (nomo_global.prev_server !== current_server) {
                            NOMO_DEBUG("현재 서버:", current_server);

                            // 서버 이름 - 지역 매칭하기
                            var server_str = current_server.split(".")[0];
                            var server_name = "";
                            if (current_server.indexOf("akamai") !== -1) {
                                server_str = "AKAMAI";
                                server_name = "<br />(AKAMAI)";
                            } else {
                                for (var i = 0; i < server_list_2.length; i++) {
                                    if (server_str.indexOf(server_list_2[i][0]) !== -1) {
                                        server_name = "<br />(" + server_list_2[i][0].toUpperCase() + " / " + server_list_2[i][1] + ")";
                                        break;
                                    }
                                }
                            }


                            // 현재 서버를 server_list array 에 push
                            nomo_global.prev_server_list.push(server_str);
                            const MAX_SERVER_LIST_LENGTH = 3;
                            if (nomo_global.prev_server_list.length > MAX_SERVER_LIST_LENGTH) {
                                nomo_global.prev_server_list = nomo_global.prev_server_list.slice(nomo_global.prev_server_list.length - MAX_SERVER_LIST_LENGTH);
                            }

                            // 초기 접속 시
                            if(nomo_global.prev_server === ""){
                                // 로깅 하기
                                set_log(["s1", streamer_id, current_server]);
                            }
                            
                            var server_change_history = "";
                            // 초기 접속이 아니고 서버가 변경된 경우
                            if(nomo_global.SERVER_CHANGE_SHOW && nomo_global.prev_server !== ""){
                                server_change_history = "<br />" + nomo_global.prev_server_list.join(" → ").toUpperCase();
                                var prev_svr_str = nomo_global.prev_server_list[nomo_global.prev_server_list.length - 2].toUpperCase();
                                var curr_svr_str = server_str.toUpperCase();
                                
                                // server change text 표시 위한 container 확인
                                var $player_root_sc = $(".player-root");    // for embeded player, old twitch player
                                if($player_root_sc.length === 0){
                                    $player_root_sc = $(".highwind-video-player__container");   // for new twitch player
                                }
                                // container 존재 시 메시지 출력
                                if($player_root_sc.length !== 0){
                                    $(".tsi_sc").remove();
                                    var $sc_text = $(`<div class="tsi_sc" style="display:none;">Server Changed: ${prev_svr_str} → ${curr_svr_str}</div>`);
                                    $sc_text.prependTo($player_root_sc).fadeIn(500, function(){
                                        $(this).delay(15000).fadeOut(500, function(){
                                            $(this).delay(1000).remove();
                                        });
                                    })
                                    .on("click", function(){
                                        $(this).stop(false, false).fadeOut(500, function(){
                                            $(this).delay(1000).remove();
                                        });
                                    });
                                }
                                else{
                                    simple_message(`[TSI] Server Changed : ${prev_svr_str} → ${curr_svr_str}`, $("body"));
                                }
                                
                                // 로깅
                                NOMO_DEBUG("서버 리스트 갱신", nomo_global.prev_server_list);
                                set_log(["sc", streamer_id, current_server]);
                            }

                            // FIXER 에서 연결 시도 횟수 표시
                            var fixed_string = "";
                            if (nomo_global.FIXER) {
                                if (e.data.fixed.FIXED) {
                                    fixed_string = "(" + e.data.fixed.FIXER_count + "/" + nomo_global.FIXER_ATTEMPT_MAX + ") <br />";
                                } else {
                                    fixed_string = "(" + e.data.fixed.FIXER_count + "/" + nomo_global.FIXER_ATTEMPT_MAX + ") <br />";
                                }
                            }
                            var dom_string = fixed_string + current_server + server_name + server_change_history;

                            // DOM 생성
                            var $player_menu = $(".player-buttons-right");    // for embeded player, old twitch player
                            if($player_menu.length === 0){
                                $player_menu = $(".player-controls__right-control-group");   // for new twitch player
                            }
                            if ($player_menu.length !== 0) {
                                $player_menu.css("position","relative");
                                $(".player-buttons-right").find(".player-tip").css("z-index", 60);
                                $("#current_server").remove();
                                $(`<span id="current_server" style="display:none;">${dom_string}</span>`)
                                    .prependTo($player_menu)
                                    .fadeIn(500)
                                    // 가능한 경우 클릭 시 클립보드에 복사
                                    .on("click", function () {
                                        if (typeof GM_setClipboard === "function") {
                                            GM_setClipboard((current_server + server_name).replace("<br />", " "));
                                            $("#copied").remove();
                                            $(`<span id="copied" style="display:none">Copied!!</span>`)
                                                .prependTo($(this))
                                                .fadeIn(500)
                                                .animate({
                                                    opacity: 1
                                                }, 3000, function () {
                                                    $(this).fadeOut(500, function () {
                                                        $(this).remove();
                                                    });
                                                });
                                        }

                                        // ????
                                        FIXER_EGG_COUNT = FIXER_EGG_COUNT + 1;
                                        clearTimeout(SETTIMEOUT_FIXER_EGG);
                                        SETTIMEOUT_FIXER_EGG = setTimeout(function(){
                                            NOMO_DEBUG("FIXER_EGG_COUNT", FIXER_EGG_COUNT);
                                            if(FIXER_EGG_COUNT === 7){
                                                NOMO_DEBUG("FIXER EGG 7");
                                                TWITCH_SERVER_INFO_FIXER();
                                                $(".FIXER_EGG").remove();
                                                $(`<span class="FIXER_EGG"><br />FIXER ${nomo_global.FIXER ? "ON" : "OFF"}!!! Please refresh.</span>`).appendTo("#current_server");
                                            }
                                            else if(FIXER_EGG_COUNT === 8){
                                                NOMO_DEBUG("FIXER EGG 8");
                                                var FIXER_SERVER_PROMPT = prompt("고정할 서버(Target Server)에 포함된 문자열을 콤마로 구분하여 입력하세요.\n영문,숫자만 입력할 수 있습니다.\n예시1) sel, akamai\n예시2) sel03", nomo_global.FIXER_SERVER.join(", "));
                                                if(FIXER_SERVER_PROMPT === null){
                                                    NOMO_DEBUG("취소됨");
                                                }
                                                else if (FIXER_SERVER_PROMPT === ""){
                                                    TWITCH_SERVER_INFO_SET_VAL("FIXER_SERVER", []);
                                                }
                                                else{
                                                    // eslint-disable-next-line no-useless-escape
                                                    FIXER_SERVER_PROMPT = FIXER_SERVER_PROMPT.toLowerCase().replace(/[\{\}\[\]\/?.;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"\s]/gi, "").split(",");
                                                    TWITCH_SERVER_INFO_SET_VAL("FIXER_SERVER", FIXER_SERVER_PROMPT);
                                                    NOMO_DEBUG("FIXER_SERVER_PROMPT", FIXER_SERVER_PROMPT);
                                                }
                                            }
                                            FIXER_EGG_COUNT = 0;
                                        },1000);
                                    });
                            } // DOM 생성 끝
                            else{
                                simple_message(current_server + server_name);
                            }

                            nomo_global.prev_server = current_server;
                        } // 기존에 가져온 서버 이름과 동일한지 체크 끝
                    } // 정규표현식으로 .ts 파일 체크 끝
                } // indexOf('.hls.ttvnw.net') 체크 끝
            } // postMessage type 이 tsl 인지 체크 끝
            // fixer 메시지 수신
            else if (e.data.type === "tsi_fixer") {
                // 카운트 초과했는지 확인
                var FIXED_FAILED = false;
                if (e.data.fixed.FIXER_count >= nomo_global.FIXER_ATTEMPT_MAX) {
                    FIXED_FAILED = true;
                }

                // LOADER DOM 생성
                var $player_root = $(".player-root");    // for embeded player, old twitch player
                if($player_root.length === 0){
                    $player_root = $(".highwind-video-player__container");   // for new twitch player
                }
                if ($player_root.length !== 0) {
                    $("#fixer_loader").remove();
                    // fix 실패 시
                    if (!e.data.fixed.FIXED) {
                        $(`
                        <div id="fixer_loader">
                            <div class="loader_text">
                                Target Server : ${nomo_global.FIXER_SERVER.join(', ')}<br />
                                Connected Server : ${e.data.fixed.CURRENT_SERVER}<br />
                                connection attempts: <span${FIXED_FAILED ? ' style="color:red !important;"' : ''}>${e.data.fixed.FIXER_count}</span> / ${nomo_global.FIXER_ATTEMPT_MAX}
                                ${FIXED_FAILED ? "<br /><span style='color:red !important;'>SERVER FIX FAILED</span>" : ''}
                            </div>
                            <div class="loader_contents">Loading...</div>
                        </div>`)
                            .prependTo($player_root);

                        // 실패 메시지 2초 간 보여주고 DOM 제거
                        if (FIXED_FAILED) {
                            clearTimeout(SETTIMEOUT_FIXED_FAILED);
                            SETTIMEOUT_FIXED_FAILED = setTimeout(function () {
                                $("#fixer_loader").remove();
                            }, 2000);
                        }
                    }
                }
            }
            // else if(e.data.arg.name !== "enqueue" && e.data.arg.name !== "remove"){console.log(e.data.arg)}
        };

        ////////////////////////////////////////////////////////////////////////////////////
        // 최종 수정된 Worker
        ////////////////////////////////////////////////////////////////////////////////////
        NOMO_DEBUG("my_worker", my_worker);
        // Worker 를 생성하려고 했던 원래 함수로 return
        return my_worker;
    };
}
