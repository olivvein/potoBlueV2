// (c) 2014 Don Coleman
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* global mainPage, deviceList, refreshButton */
/* global detailPage, resultDiv, messageInput, sendButton, disconnectButton */
/* global ble  */
/* jshint browser: true , devel: true*/
'use strict';


var x = 0;
var lasty = 0;
var lastyk = 0;
var lastyl = 0;
var lastym = 0;
var posX;
var posY;
var theMin = 999;
var theMax = 0;
var canvas;
var theBiggestNumber = "14776335";
var password = "21827880";
var myPassword = "";
var httpd = null;
var ipWifi = "0.0.0.0";



var hash = function(s) {
    /* Simple hash function. */
    var a = 1,
        c = 0,
        h, o;
    if (s) {
        a = 0;
        /*jshint plusplus:false bitwise:false*/
        for (h = s.length - 1; h >= 0; h--) {
            o = s.charCodeAt(h);
            a = (a << 6 & 268435455) + o + (o << 14);
            c = a & 266338304;
            a = c !== 0 ? a ^ c >> 21 : a;
        }
    }
    return String(a);
};

function dubToUnix(dub) {
    var unix = 0;
    unix = (dub * 100000) + 1483228800000;
    return Number(unix);
}

function unixToDub(unix) {
    var dub = 0;
    dub = (unix - 1483228800000) / 100000;
    return Number(dub);
}

function dynamicSort(property) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function(a, b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}
var timesInfos = [];
var objD = {};
var modal = document.querySelector('ons-modal');
var myDeviceName = "";
var theMode = "normal";
var toiMemeTuSais = "kD0%mspEl";
var myDevice = "";
var buffLen = 10000;
var dataBuffer = new Uint8Array(buffLen);
var lastIndex = 0;
var requested = "infos";
var allDatas = "";
var myBle = {};
myBle.data = buffLen;
myBle.right = 0;
myBle.left = 0;
myBle.from = "0";
myBle.to = "14776335";

var dataFrom = "0";
var dataTo = "0";
var theFileList = [];


function startServer(wwwroot) {
    if (httpd) {
        httpd.getURL(function(url) {
            if (url.length > 0) {
                document.getElementById('url').innerHTML = "server is up: <a href='" + url + "' target='_blank'>" + url + "</a>";
            } else {
                httpd.startServer({
                    'www_root': wwwroot,
                    'port': 8080
                }, function(url) {
                    //document.getElementById('url').innerHTML = "server is started: <a href='" + url + "' target='_blank'>" + url + "</a>";
                    updateStatus();
                }, function(error) {
                    document.getElementById('url').innerHTML = 'failed to start server: ' + error;
                });
            }

        }, function() {});
    } else {
        console.log('CorHttpd plugin not available/ready for start.');
    }
}

function stopServer() {
    if (httpd) {
        httpd.stopServer(function() {
            //document.getElementById('url').innerHTML = 'server is stopped.';
            updateStatus();
        }, function(error) {
            document.getElementById('url').innerHTML = 'failed to stop server' + error;
        });
    } else {
        console.log('CorHttpd plugin not available/ready.');
    }
}



function createFile(dirEntry, fileName, isAppend) {
    dirEntry.getFile(fileName, { create: true, exclusive: false }, function(fileEntry) {
        writeFile(fileEntry, null, isAppend);
    }, debugLog("File created done"));

}

function writeFile(fileEntry, dataObj) {
    fileEntry.createWriter(function(fileWriter) {
        fileWriter.onwriteend = function() {
            console.log("Successful file write...");
            readFile(fileEntry);
        };
        fileWriter.G = function(e) {
            console.log("Failed file write: " + e.toString());
        };
        if (!dataObj) {
            dataObj = new Blob([allDatas], { type: 'text/plain' });
        }
        allDatas = "";
        fileWriter.write(dataObj);
    });
};

function readFile(fileEntry) {
    fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function() {
            console.log("Successful file read: " + fileEntry.fullPath);
        };
        reader.readAsText(file);
    }, debugLog("read done"));
}

var bluefruit = {
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    txCharacteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // transmit is from the phone's perspective
    rxCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e' // receive is from the phone's perspective
};


function myDecode(base62String) {
    var val = 0,
        i = 0,
        length = base62String.length,
        characterSet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for (; i < length; i++) {
        val += characterSet.indexOf(base62String[i]) * Math.pow(62, length - i - 1);
    }
    return val;
};




function bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

function debugLog(string) {
    console.log(string);
};

function stringToBytes(string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
        array[i] = string.charCodeAt(i);
    }
    return array.buffer;
}


var app = {
    initialize: function() {
        this.bindEvents();
        window.plugins.insomnia.keepAwake();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    open: function() {
        var menu = document.getElementById('menu');
        menu.open();
    },
    load: function(page) {
        if ((page == "action.html") || (page == "settings.html")) {
            if (myDevice == "") {
                alert("Vous n'êtes pas connecté...");
            } else {
                if (page == "settings.html") {
                    theMode = "settings";
                }
                if (page == "action.html") {
                    theMode = "action";
                }
                var content = document.getElementById('content');
                var menu = document.getElementById('menu');
                content.load(page).then(menu.close.bind(menu));
                app.askInfosN();
            }
        } else {

            var content = document.getElementById('content');
            var menu = document.getElementById('menu');
            content.load(page).then(menu.close.bind(menu));
            if (page == "chart.html") {
                theMode = "chart";
                canvas = document.getElementById("myCanvas");
                canvas.width = window.innerWidth;
            }
        }

    },
    loadMainPage: function() {
        app.load("home.html");
        console.log("Main page");
        app.refreshDeviceList();
        ipWifiState.innerHTML = ipWifi;
    },
    onDeviceReady: function() {

        httpd = (cordova && cordova.plugins && cordova.plugins.CorHttpd) ? cordova.plugins.CorHttpd : null;
        startServer("/");
        app.refreshDeviceList();
        app.getFileList();
        app.thePassword();
        app.getFilePassword();
        networkinterface.getWiFiIPAddress(
            function(ip, subnet) {
                ipWifi = ip;
                ipWifiState.innerHTML = ipWifi;

                console.log(ip + ":" + subnet);
            },
            function(err) {
                console.log("Err network: " + err);
            }
        );
    },
    thePassword: function() {
        var modal1 = document.getElementById('modal1');

        if (myPassword != password) {
            modal1.show();
        } else {
            modal1.hide();
        }
    },
    checkPassword: function() {
        var modal1 = document.getElementById('modal1');
        console.log("Checking password : " + hash(passwordV.value) + " vs :" + password);
        if (hash(passwordV.value) == password) {
            console.log("ok");
            app.createPassword(hash(passwordV.value));
            modal1.hide();
        } else {
            passwordV.value = "Mauvais Mot De Passe";
        }
    },
    refreshDeviceList: function() {
        console.log("debut refresh");
        var deviceList = document.getElementById('deviceList');
        if (deviceList) {
            deviceList.innerHTML = "";
        }
        console.log("Refresh");
        ble.scan([bluefruit.serviceUUID], 5, app.onDiscoverDevice, app.onError);
    },
    requestAndroidFS: function(filename) {
        debugLog("Requesting File System");
        window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function(dirEntry) {
            console.log('file system open: ' + dirEntry.name);
            dirEntry.getDirectory('potoBlueV2', { create: true }, function(subDirEntry) {
                var isAppend = true;
                var theFilename = filename + ".txt";
                createFile(subDirEntry, theFilename, isAppend);
            }, console.log);
        }, app.getFileList);
    },
    createPassword: function(filename) {
        debugLog("Requesting File System");
        window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function(dirEntry) {
            console.log('file system open: ' + dirEntry.name);
            dirEntry.getDirectory('potoBlueV2pass', { create: true }, function(subDirEntry) {
                var isAppend = true;
                var theFilename = filename;
                createFile(subDirEntry, theFilename, isAppend);
            }, console.log);
        }, app.getFileList);
    },
    getFileList: function() {
        debugLog("Requesting File System");
        window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function(dirEntry) {
            console.log('file system open: ' + dirEntry.name);
            theFileList = [];
            dirEntry.getDirectory('potoBlueV2', { create: true }, function(subDirEntry) {
                console.log("Subentry");
                var reader = subDirEntry.createReader();
                reader.readEntries(
                    function(entries) {
                        entries.forEach(function(ent) {
                            var file = ent.fullPath.split("/")[2];
                            var fiVal = file.split("_");
                            var name = fiVal[0];
                            var from = fiVal[1];
                            var to = fiVal[2];
                            to = to.substring(0, to.length - 4);
                            console.log(name + " - " + from + " - " + to);
                            var obj = {};
                            obj.name = name;
                            obj.from = Number(from);
                            obj.to = Number(to);
                            theFileList.push(obj);
                        });
                    },
                    function(err) {
                        console.log(err);
                    }
                );

            }, console.log);
        }, debugLog("Fs done"));
    },
    getFilePassword: function() {
        debugLog("Requesting File System");
        window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function(dirEntry) {
            console.log('file system open: ' + dirEntry.name);
            theFileList = [];
            dirEntry.getDirectory('potoBlueV2pass', { create: true }, function(subDirEntry) {
                console.log("Subentry");
                var reader = subDirEntry.createReader();
                reader.readEntries(
                    function(entries) {
                        entries.forEach(function(ent) {
                            var file = ent.fullPath.split("/")[2];
                            console.log(file);
                            myPassword = file;
                            app.thePassword();
                        });
                    },
                    function(err) {
                        console.log(err);
                    }
                );

            }, console.log);
        }, debugLog("Fs done"));
    },
    onDiscoverDevice: function(device) {
        var listItem = document.createElement('li'),
            html = '<div class="list-item__center"><ons-icon icon="md-input-power"></ons-icon><b>' + device.name + '</b>' +
            '&nbsp;|&nbsp;RSSI: ' + device.rssi + '&nbsp;|&nbsp; SSID: ' +
            device.id + '</div>';
        listItem.innerHTML = html;
        listItem.class = "list-item list-item--tappable";
        listItem.addEventListener("click", function(e) {
            app.connect(device.id, device.name);
        }, false);
        var deviceList = document.getElementById('deviceList');
        deviceList.appendChild(listItem);
        console.log(device.id, device.name);
    },
    connect: function(target, nameT) {
        console.log("Connection to " + target);
        var deviceId = target,
            onConnect = function(peripheral) {
                app.determineWriteType(peripheral);
                ble.startNotification(deviceId, bluefruit.serviceUUID, bluefruit.rxCharacteristic, app.onData, app.onError);
                myDevice = deviceId;
                myDeviceName = nameT;
                app.load("action.html");
                app.askInfosN();
            };
        ble.connect(deviceId, onConnect, app.onError);
    },
    disconnect: function() {
        var deviceId = myDevice;
        app.sendCommand("end");
        ble.disconnect(deviceId, app.loadMainPage, app.onError);
        window.plugins.insomnia.allowSleepAgain();
        myDevice="";
    },
    askInfos: function(from, to) {
        console.log("asking infos :", from, to);
        lastIndex = 0;
        buffLen = 500;
        requested = "infos";
        dataBuffer = new Uint8Array(buffLen);
        var dataToSend = "*" + toiMemeTuSais + ",infos," + from + "," + to + "$";
        myBle.right = 0;
        myBle.left = 0;
        myBle.from = from;
        myBle.to = to;
        app.sendData(dataToSend);
    },
    askInfosN: function() {
        console.log("asking infos :");
        lastIndex = 0;
        buffLen = 500;
        requested = "infos";
        dataBuffer = new Uint8Array(buffLen);
        var dataToSend = "*" + toiMemeTuSais + ",infos$";
        myBle.right = 0;
        myBle.left = 0;
        app.sendData(dataToSend);
    },
    askInfosRange: function() {
        //app.getFileList();
        var infosList = document.getElementById('infosList');
        infosList.innerHTML = "";
        var min = 0;
        var max = 14776335;
        var theMin = myBle.dataMin;
        var theMax = myBle.dataMax;
        var theWin = [];
        //theWin.push();
        theFileList = theFileList.sort(dynamicSort("from"));

        for (var jj = 0; jj < theFileList.length; jj++) {
            console.log(theFileList[jj].name + " - " + myDeviceName)
            if (theFileList[jj].name == myBle.name) {
                var listItem4 = document.createElement('li'),
                    html9 = '<div class="list-item__center">De:<b>' + moment(dubToUnix(theMin)).format("DD/MM/YYYY hh:mm:ss") + '</b>' +
                    '&nbsp;|&nbsp;à: ' + moment(dubToUnix(theFileList[jj].from)).format("DD/MM/YYYY hh:mm:ss");
                listItem4.innerHTML = html9;
                listItem4.class = "list-item list-item--tappable";
                console.log("1:  " + moment(dubToUnix(theMin)).format("DD/MM/YYYY hh:mm:ss") + " - " + moment(dubToUnix(theFileList[jj].from)).format("DD/MM/YYYY hh:mm:ss"));

                listItem4.addEventListener("click", function(e) {
                    var iiner = e.target.innerHTML;

                    var fromD = iiner.substring(iiner.indexOf(":<b>") + 4);
                    fromD = fromD.substring(0, fromD.indexOf("</b>"));

                    var toD = iiner.substring(iiner.indexOf("à: ") + 3);
                    var fromDate = unixToDub(moment(fromD, "DD/MM/YYYY hh:mm:ss"));
                    var toDate = unixToDub(moment(toD, "DD/MM/YYYY hh:mm:ss"));
                    console.log("From: " + fromDate);
                    console.log("To: " + toDate);
                    app.askInfos(String(fromDate), String(toDate));
                }, false);
                infosList.appendChild(listItem4);

                theMin = theFileList[jj].to;
                console.log("Debut debug : ");
                var nnkk = Number(theFileList[jj].to) - Number(432);
                console.log(theFileList[jj].from + " - " + nnkk);
                console.log(moment(dubToUnix(theFileList[jj].from)) + " - " + moment(dubToUnix(nnkk)));
                var tiF = moment(dubToUnix(theFileList[jj].from)).format("DD/MM/YYYY hh:mm:ss");
                var tiT = moment(dubToUnix(nnkk)).format("DD/MM/YYYY hh:mm:ss");
                console.log(tiF + " - " + tiT);
                var theDDd = Number(unixToDub(moment(tiT, "DD/MM/YYYY hh:mm:ss")));
                console.log(unixToDub(moment(tiF, "DD/MM/YYYY hh:mm:ss")) + " - " + theDDd);

                var listItem5 = document.createElement('li'),
                    html91 = '<div class="list-item__center">Vous avez depuis :<b>' + moment(dubToUnix(theFileList[jj].from)).format("DD/MM/YYYY hh:mm:ss") + '</b>' +
                    "&nbsp;|&nbsp;jusqu'à: " + moment(dubToUnix(theFileList[jj].to)).format("DD/MM/YYYY hh:mm:ss");
                listItem5.innerHTML = html91;
                listItem5.class = "list-item list-item--tappable";
                console.log("2:  " + moment(dubToUnix(theFileList[jj].from)).format("DD/MM/YYYY hh:mm:ss") + " - " + moment(dubToUnix(theFileList[jj].to)).format("DD/MM/YYYY hh:mm:ss"));
                //console.log(theFileList[jj].to);
                listItem5.addEventListener("click", function(e) {
                    var iiner = e.target.innerHTML;
                    var fromD = iiner.substring(iiner.indexOf(":<b>") + 4);
                    fromD = fromD.substring(0, fromD.indexOf("</b>"));

                    var toD = iiner.substring(iiner.indexOf("à: ") + 3);
                    var fromDate = unixToDub(moment(fromD, "DD/MM/YYYY hh:mm:ss"));
                    var toDate = unixToDub(moment(toD, "DD/MM/YYYY hh:mm:ss").add(13, "h"));
                    console.log(toDate);
                    app.askInfos(String(fromDate), String(toDate));
                }, false);
                infosList.appendChild(listItem5);
                //console.log(jj);
                //console.log(theFileList.length - 1);
                if (jj == theFileList.length - 1) {
                    //console.log("should happend .......");
                    var listItem1 = document.createElement('li'),
                        html1 = '<div class="list-item__center">De :<b>' + moment(dubToUnix(theFileList[jj].to)).format("DD/MM/YYYY hh:mm:ss") + '</b>' +
                        '&nbsp;|&nbsp;à: ' + moment(dubToUnix(theMax)).format("DD/MM/YYYY hh:mm:ss") + '</div>';
                    listItem1.innerHTML = html1;
                    listItem1.class = "list-item list-item--tappable";
                    //console.log("3:  " + moment(dubToUnix(theFileList[jj].to)).format("DD/MM/YYYY hh:mm:ss") + " - " + moment(dubToUnix(14776335)).format("DD/MM/YYYY hh:mm:ss"));

                    listItem1.addEventListener("click", function(e) {
                        var iiner = e.target.innerHTML;

                        var fromD = iiner.substring(iiner.indexOf(":<b>") + 4);
                        fromD = fromD.substring(0, fromD.indexOf("</b>"));
                        //console.log(fromD);

                        var toD = iiner.substring(iiner.indexOf("à: ") + 3);
                        var fromDate = unixToDub(moment(fromD, "DD/MM/YYYY hh:mm:ss"));
                        var toDate = unixToDub(moment(toD, "DD/MM/YYYY hh:mm:ss"));

                        app.askInfos(String(fromDate), String(toDate));
                    }, false);
                    infosList.appendChild(listItem1);
                }
            }

        };
        //app.getFileList();
    },
    sendCommand: function(command) {
        lastIndex = 0;
        buffLen = 500;
        requested = "infos";
        dataBuffer = new Uint8Array(buffLen);
        var dataToSend = "*" + toiMemeTuSais + "," + command + "$";
        app.sendData(dataToSend);
    },
    sendCommandG: function(command) {
        lastIndex = 0;
        buffLen = 500;
        requested = "graph";
        dataBuffer = new Uint8Array(buffLen);
        var dataToSend = "*" + toiMemeTuSais + "," + command + "$";
        app.sendData(dataToSend);
    },
    askAllDatas: function() {
        lastIndex = 0;
        buffLen = myBle.data;
        dataBuffer = new Uint8Array(buffLen);
        requested = "sendAll2";
        //console.log("Asking All Datas...");
        modal.show();
        var dataToSend = "*" + toiMemeTuSais + ",data$";
        app.sendData(dataToSend);
    },
    modeDev: function() {
        console.log("livecount is :" + livecountState.checked);
        console.log("graphMode is :" + chartState.checked);
        console.log("the input date : " + dateState.value);
        console.log(dateState.value);
        var inputedDate = moment(dateState.value, "YYYY-MM-DD").format("DD/MM/YYYY");
        console.log("Date modif is : " + inputedDate);
        if (inputedDate != myBle.date) {
            console.log("Ble Date : " + myBle.date);
            console.log("Sending date = " + inputedDate);
            var theD = inputedDate.split("/");
            var theCommand = "setDate," + theD[0] + "," + theD[1] + "," + theD[2];
            console.log(theCommand);
            app.sendCommand(theCommand);
        }
        if (timeState.value != myBle.time) {
            console.log("Ble Time : " + myBle.time);
            console.log("Sending date = " + timeState.value);
            var theD = timeState.value.split(":");
            var theCommand = "setTime," + theD[0] + "," + theD[1] + "," + theD[2];
            console.log(theCommand);
            app.sendCommand(theCommand);
        }
        if (livecountState.checked != myBle.liveCount) {
            console.log("Sending Livecount = " + Number(livecountState.checked));
            var theCommand = "liveCount," + Number(livecountState.checked);
            app.sendCommand(theCommand);
        }
        if (nameState.value != myBle.name) {
            console.log("Sending Name = " + nameState.value);
            var theCommand = "setName," + nameState.value;
            app.sendCommand(theCommand);
        }
        if (formatState.checked == true) {
            console.log("Sending Format = ");
            var theCommand = "format";
            app.sendCommand(theCommand);
        }
        if (Number(chartState.checked) != Number(myBle.chartMode)) {
            console.log("Sending Graph = " + chartState.checked);
            var theCommand = "chart," + Number(chartState.checked) + ",35";
            requested = "graph";
            app.sendCommandG(theCommand);
        }
        if (Number(blueState.checked) != Number(myBle.bluetoothMode)) {
            console.log("Sending BluetoothMode = " + blueState.checked);
            var theCommand = "btMode," + Number(blueState.checked);
            app.sendCommand(theCommand);
        }
        if (highState.value != myBle.tresholdHigh) {
            console.log("Sending High = " + highState.value);
            var theCommand = "high," + highState.value;
            console.log(theCommand);
            app.sendCommand(theCommand);
        }
        if (lowState.value != myBle.tresholdLow) {
            console.log("Sending High = " + lowState.value);
            var theCommand = "low," + lowState.value;
            console.log(theCommand);
            app.sendCommand(theCommand);
        }
        if (hystState.value != myBle.hysteresis) {
            console.log("Sending hyst = " + hystState.value);
            var theCommand = "hyst," + hystState.value;
            console.log(theCommand);
            app.sendCommand(theCommand);
        }
    },
    onError: function(reason) {
        alert("ERROR: " + JSON.stringify(reason)); // real apps should use notification.alert
    },
    sendData: function(dataToSend) { // send data to Arduino
        //console.log("Sending data :");
        var success = function() {
            //console.log("success");
        };
        var failure = function() {
            console.log("Failed writing data to the bluefruit le");
        };
        var messagee = dataToSend;
        console.log(messagee);
        console.log("to : " + myDevice);
        var deviceId = myDevice;
        if (messagee.length >= 18) {
            //console.log("Message bigger than 18");
            var arraYofStringss = [];
            arraYofStringss = messagee.split(",");
            //console.log(arraYofStringss);
            //console.log(arraYofStringss.length);
            //console.log(arraYofStringss[0]);
            var mleng = arraYofStringss.length;
            var ml = 0;
            for (var i = 0; i < mleng; i++) {
                var mm = arraYofStringss[i];
                if (i != mleng - 1) {
                    mm = mm + ',';
                }
                //console.log("will send :");
                //console.log(mm);
                var data = stringToBytes(mm);
                if (app.writeWithoutResponse) {
                    //console.log("Write Without response ...");
                    ble.writeWithoutResponse(
                        deviceId,
                        bluefruit.serviceUUID,
                        bluefruit.txCharacteristic,
                        data, success, failure
                    );
                } else {
                    //console.log("Write...");
                    ble.write(
                        deviceId,
                        bluefruit.serviceUUID,
                        bluefruit.txCharacteristic,
                        data, success, failure
                    );
                }
            };
        } else {
            //console.log("message smaller than 16");
            var data = stringToBytes(messagee);
            if (app.writeWithoutResponse) {
                //console.log("Write Without response ...");
                ble.writeWithoutResponse(
                    deviceId,
                    bluefruit.serviceUUID,
                    bluefruit.txCharacteristic,
                    data, success, failure
                );
            } else {
                //console.log("Write...");
                ble.write(
                    deviceId,
                    bluefruit.serviceUUID,
                    bluefruit.txCharacteristic,
                    data, success, failure
                );
            }
        }
    },
    sizeCanvas: function() {
        canvas = document.getElementById("myCanvas");
        canvas.width = window.innerWidth;
    },
    onData: function(data) {

        if (requested == "graph") {

            canvas = document.getElementById("myCanvas");
            if (theMode == "chart" && canvas != undefined) {
                var rangeMin = document.getElementById('zoomViewMin');
                var rangeMax = document.getElementById('zoomViewMax');

                var widthC = canvas.width;
                var ctx = canvas.getContext("2d");
                //canvas.width = window.innerWidth;
                //canvas.height = window.innerHeight;

                var temp = new Uint8Array(data);
                dataBuffer.set(temp, lastIndex);
                lastIndex = temp.length + lastIndex;
                if (dataBuffer.indexOf(10) != -1) { //Si caractere de fin : #
                    var myDatas = "";
                    //console.log("eol");
                    //console.log(dataBuffer.length);
                    if (dataBuffer.length < buffLen + 1) {
                        dataBuffer.forEach(function(tt) {
                            //console.log(tt);
                            if (tt != 0) {
                                myDatas = myDatas + String.fromCharCode(tt);
                            }
                        });
                        //console.log(myDatas);
                        var miDa = myDatas.split(",");
                        //console.log(miDa.length);
                        //console.log(miDa[2]);


                        //console.log(theMin + " - " + theMax);
                        rangeMin = document.getElementById('zoomViewMin');
                        rangeMax = document.getElementById('zoomViewMax');



                        var mapToNumber = function(x, in_min, in_max, out_min, out_max) {
                            return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
                        }

                        var formulaSimple = function(chiffre) {
                            return 200 - mapToNumber(Number(chiffre), 200 - rangeMin.value * 20, rangeMax.value * 20, 0, 200);
                            //return 200 - Number(chiffre) / 4;
                        }

                        x = x + 1;
                        if (x >= widthC) {
                            x = 0;
                            ctx.beginPath();
                            ctx.rect(0, 0, widthC, 200);
                            ctx.fillStyle = "white";
                            ctx.fill();
                        }
                        ctx.beginPath();
                        ctx.moveTo(x - 1, formulaSimple(lasty));
                        ctx.lineTo(x, formulaSimple(miDa[0]));
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "#ff00ff";
                        ctx.stroke();
                        lasty = Number(miDa[0]);
                        //console.log(miDa[0] + "," + miDa[1] + "," + miDa[2] + "," + miDa[3]);


                        ctx.beginPath();
                        ctx.moveTo(x - 1, formulaSimple(lastyk));
                        ctx.lineTo(x, formulaSimple(miDa[1]));
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "#00ff00";
                        ctx.stroke();
                        lastyk = Number(miDa[1]);





                        ctx.beginPath();
                        ctx.moveTo(x - 1, formulaSimple(lastyl));
                        ctx.lineTo(x, formulaSimple(miDa[2]));
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "#0000ff";
                        ctx.stroke();
                        lastyl = Number(miDa[2]);


                        miDa[3] = miDa[3].substring(0, miDa[3].length - 2);

                        ctx.beginPath();
                        ctx.moveTo(x - 1, formulaSimple(lastym));
                        ctx.lineTo(x, formulaSimple(miDa[3]));
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "#ff0000";
                        ctx.stroke();
                        lastym = Number(miDa[3]);


                    }

                    myDatas = "";
                    dataBuffer = new Uint8Array(buffLen);
                    lastIndex = 0;
                }

            }



        } else {


            var temp = new Uint8Array(data);
            dataBuffer.set(temp, lastIndex);
            if (dataBuffer.indexOf(35) != -1) { //Si caractere de fin : #
                lastIndex = temp.length + lastIndex;
                //console.log("lastIndex :" + lastIndex);
                //debugLog("end of transmission de ouf");
                //console.log("end of transmission de ouf");
                app.prepareData();
                lastIndex = 0;
            }
            if (requested != "infos") {

                var progressVal = document.getElementById("progressVal");
                progressVal.value = 100 * (lastIndex / myBle.data);
                /*var percent = document.getElementById("percent");
                percent.innerHTML = Math.round(100 * (lastIndex / myBle.data)) + "%";
                */
            }
            if (lastIndex > buffLen) {
                console.log("too big" + lastIndex);
            }
            lastIndex = temp.length + lastIndex;



        }



    },
    prepareData: function(event) { // save data to text file
        /*
        resultDiv.innerHTML = resultDiv.innerHTML + "Debut Prepare <br/>";
        resultDiv.scrollTop = resultDiv.scrollHeight;
        */
        //console.log("Debut Prepare");

        var stringArray = Array.prototype.slice.call(dataBuffer).map(String);
        var myData = "";
        stringArray.forEach(function(dd) {
            myData = myData + String.fromCharCode(dd);
            if (requested == "sendAll2") {
                if (String.fromCharCode(dd) == "$$") {
                    if (requested != "infos") {
                        myData = myData + "\n";
                    }
                }
            } else {
                if (String.fromCharCode(dd) == "$") {
                    if (requested != "infos") {
                        myData = myData + "\n";
                    }
                }
            }

        });
        stringArray = [];
        dataBuffer = new Uint8Array(buffLen);
        lastIndex = 0;
        progressVal.value = 0;
        //resultDiv.innerHTML = resultDiv.innerHTML + "Fin <br/>";
        //resultDiv.scrollTop = resultDiv.scrollHeight;

        if (requested == "infos") {
            var result = [];
            var infoss = myData.split('$');
            infoss.forEach(function(line) {
                if (line.indexOf("#") != -1) {} else {
                    var isStar = line.indexOf("*");
                    if (isStar != -1) {
                        line = line.substring(isStar + 1);
                    }
                    var arr = line.split(',');

                    result.push(arr);
                }

            });
            result.forEach(function(ll) {
                //console.log(ll);
                console.log(ll[0] + " is : " + ll[1]);
                //debugLog(ll);
                if (ll[0] == "name") {
                    myBle.name = ll[1];
                    //blePos.innerHTML = posX + " " + posY;
                    bleName.innerHTML = myBle.name;
                    if (theMode == "settings") {
                        nameState.value = myBle.name;
                    }
                }
                if (ll[0] == "firmware") {
                    myBle.firmware = ll[1];
                }
                if (ll[0] == "dataCorrupted") {
                    myBle.dataCorrupted = ll[1];
                }
                if (ll[0] == "diagPir") {
                    myBle.diagPir = ll[1];
                }
                if (ll[0] == "diagFlash") {
                    myBle.diagFlash = ll[1];
                }
                if (ll[0] == "dataMin") {
                    myBle.dataMin = ll[1];
                    if (theMode == "action") {
                        datasRange.innerHTML = moment(dubToUnix(myBle.dataMin)).format("DD/MM/YYYY hh:mm:ss") + " - " + moment(dubToUnix(myBle.dataMax)).format("DD/MM/YYYY hh:mm:ss");

                    }
                }
                if (ll[0] == "dataMax") {
                    myBle.dataMax = ll[1];
                    if (theMode == "action") {
                        datasRange.innerHTML = moment(dubToUnix(myBle.dataMin)).format("DD/MM/YYYY hh:mm:ss") + " - " + moment(dubToUnix(myBle.dataMax)).format("DD/MM/YYYY hh:mm:ss");
                    }
                }
                if (ll[0] == "date") {
                    myBle.date = moment(ll[1], "DD.MM.YYYY").format("DD/MM/YYYY");

                    if (theMode == "settings") {
                        dateState.value = moment(myBle.date, "DD/MM/YYYY").format("YYYY-MM-DD");
                    }

                }
                if (ll[0] == "time") {
                    myBle.time = ll[1];
                    //var theTimeb = document.getElementById('theTimeb');
                    theTime.innerHTML = myBle.time;
                    if (theMode == "settings") {

                        timeState.value = myBle.time;
                    }
                }
                if (ll[0] == "temp") {
                    myBle.temp = ll[1];
                    temperature.innerHTML = myBle.temp;
                }
                if (ll[0] == "voltage") {
                    myBle.voltage = ll[1];
                    voltage.innerHTML = myBle.voltage + " V";
                }
                if (ll[0] == "scale") {
                    myBle.scale = ll[1];
                }
                if (ll[0] == "liveCount") {
                    myBle.liveCount = ll[1];
                    if (ll[1] == "0") {
                        myBle.liveCount = false;
                    } else {
                        myBle.liveCount = true;
                    }
                    if (theMode == "settings") {
                        livecountState.checked = Number(myBle.liveCount);

                    }

                }
                if (ll[0] == "hysteresis") {
                    myBle.hysteresis = ll[1];
                    if (theMode == "settings") {
                        hystState.value = myBle.hysteresis;

                    }
                }
                if (ll[0] == "thresholdHigh") {
                    myBle.tresholdHigh = ll[1];
                    if (theMode == "settings") {
                        highState.value = myBle.tresholdHigh;

                    }
                }
                if (ll[0] == "thresholdLow") {
                    myBle.tresholdLow = ll[1];
                    if (theMode == "settings") {
                        lowState.value = myBle.tresholdLow;

                    }
                }
                if (ll[0] == "chartMode") {
                    myBle.chartMode = ll[1];
                    if (theMode == "settings") {
                        chartState.checked = Number(myBle.chartMode);

                    }
                }
                if (ll[0] == "bluetoothMode") {
                    myBle.bluetoothMode = ll[1];
                    if (theMode == "settings") {
                        blueState.checked = Number(myBle.bluetoothMode);

                    }
                }
                if (ll[0] == "data") {
                    myBle.data = Number(ll[1]) * 8;
                    dataNumber.innerHTML = Number(ll[1]);
                }
                if (ll[0] == "liveLeftMove") {
                    myBle.left = myBle.left + Number(ll[1]);
                    if (theMode == "action") {
                        liveNumber.innerHTML = myBle.left + "|" + myBle.right;
                    }
                }
                if (ll[0] == "liveRightMove") {
                    myBle.right = myBle.right + Number(ll[1]);
                    if (theMode == "action") {
                        liveNumber.innerHTML = myBle.left + "|" + myBle.right;
                    }

                }

            });
            lastIndex = 0;
            buffLen = 10000;
            dataBuffer = new Uint8Array(buffLen);
            //resultDiv.scrollTop = resultDiv.scrollHeight;
        }
        if (requested == "sendAll") {
            var liness = myData.split("$");
            var result = [];
            liness.forEach(function(line) {
                if (line.indexOf("#") != -1) {} else {
                    var isStar = line.indexOf("*");
                    line = line.substring(isStar + 1);
                    var time = myDecode(line.substring(0, 4));
                    var gauche = myDecode(line.substring(4, 5));
                    var droite = myDecode(line.substring(5, 6));
                    var theArr = [];
                    theArr.push(time);
                    theArr.push(gauche);
                    theArr.push(droite);
                    result.push(theArr);
                }

            });
            allDatas = 'time,gauche,droite\n';
            result.forEach(function(rr) {
                if (rr[2] != undefined) {
                    allDatas = allDatas + rr[0] + ',' + rr[1] + ',' + rr[2] + '\n';
                } else {
                    console.log("Wrong data :");
                    console.log(rr);
                }
            });
            //app.requestAndroidFS("sendAll");
        }
        if (requested == "sendAll2") {
            console.log("Receiving compressed");
            myData.replace("#", "");
            var liness = myData.split("$$");
            var result = [];
            liness.forEach(function(line) {
                //console.log(line);


                if (line.indexOf("#") != -1) {
                    console.log("End Of Transmission");
                } else {
                    //console.log(line);
                    //console.log("line :");
                    //console.log(line);
                    var dataType = line.split("$");
                    var timeBig = dataType[0].substring(1);
                    var isStar1 = timeBig.indexOf("*");
                    timeBig = timeBig.substring(isStar1 + 1);
                    //console.log(timeBig);
                    var compressedData = dataType[1].substring(1);
                    var dLength = myDecode(dataType[2].substring(1));
                    //console.log("received length:" + dLength + " = " + compressedData.length);
                    //console.log("")

                    for (var jj = 0; jj < dLength; jj++) {
                        //console.log("chunk:");
                        var mm = jj * 4;
                        var myChunk = compressedData.substring(mm, mm + 4);
                        //console.log(myChunk);
                        var isStar = myChunk.indexOf("*");
                        myChunk = myChunk.substring(isStar + 1);
                        myChunk = timeBig + myChunk;
                        var time = myDecode(myChunk.substring(0, 4));
                        var gauche = myDecode(myChunk.substring(4, 5));
                        var droite = myDecode(myChunk.substring(5, 6));
                        var theArr = [];
                        theArr.push(time);
                        theArr.push(gauche);
                        theArr.push(droite);
                        //console.log(time + "," + gauche + "," + droite);
                        result.push(theArr);
                    }
                }


            });
            allDatas = 'time,gauche,droite\n';
            var firstTime = "";
            var lastTime = "";
            result.forEach(function(rr) {

                if (rr[2] != undefined) {
                    if (firstTime == "") {
                        firstTime = rr[0];
                    }
                    lastTime = rr[0];
                    allDatas = allDatas + rr[0] + ',' + rr[1] + ',' + rr[2] + '\n';
                    //console.log(rr[0] + ',' + rr[1] + ',' + rr[2]);
                } else {
                    console.log("Wrong data :");
                    //console.log(rr);
                }
            });
            modal.hide();
            app.requestAndroidFS(myBle.name + "_" + firstTime + "_" + lastTime);


        }
        //resultDiv.innerHTML = resultDiv.innerHTML + "The data: <br/>";
        //resultDiv.innerHTML = resultDiv.innerHTML + myData;
        myData = "";
        //modal.hide();



    },
    determineWriteType: function(peripheral) {
        // Adafruit nRF8001 breakout uses WriteWithoutResponse for the TX characteristic
        // Newer Bluefruit devices use Write Request for the TX characteristic

        var characteristic = peripheral.characteristics.filter(function(element) {
            if (element.characteristic.toLowerCase() === bluefruit.txCharacteristic) {
                return element;
            }
        })[0];

        if (characteristic.properties.indexOf('WriteWithoutResponse') > -1) {
            app.writeWithoutResponse = true;
        } else {
            app.writeWithoutResponse = false;
        }

    }
};