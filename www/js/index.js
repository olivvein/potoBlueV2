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




var bluefruit = {
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    txCharacteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // transmit is from the phone's perspective
    rxCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e' // receive is from the phone's perspective
};

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
        var content = document.getElementById('content');
        var menu = document.getElementById('menu');
        content.load(page)
            .then(menu.close.bind(menu));
    },
    loadMainPage: function() {
        app.load("home.html");
        console.log("Main page");
        app.refreshDeviceList();
    },
    onDeviceReady: function() {
        app.refreshDeviceList();

    },
    refreshDeviceList: function() {
        console.log("debut refresh");
        var deviceList = document.getElementById('deviceList');
        if (deviceList) {
            deviceList.innerHTML = "";
        }
        //deviceList.innerHTML = "";
        console.log("Refresh");
        ble.scan([bluefruit.serviceUUID], 5, app.onDiscoverDevice, app.onError);
    },
    onDiscoverDevice: function(device) {
        var listItem = document.createElement('li'),
            html = '<div class="list-item__center"><ons-icon icon="md-input-power"></ons-icon><b>' + device.name + '</b>' +
            '&nbsp;|&nbsp;RSSI: ' + device.rssi + '&nbsp;|&nbsp; SSID: ' +
            device.id + '</div>';
        listItem.innerHTML = html;
        listItem.class = "list-item list-item--tappable";
        listItem.addEventListener("click", function(e) {
            app.connect(device.id);
        }, false);
        var deviceList = document.getElementById('deviceList');
        deviceList.appendChild(listItem);
        console.log(device.id);
    },
    connect: function(target) {
        console.log("Connection to " + target);
        var deviceId = target,
            onConnect = function(peripheral) {
                app.determineWriteType(peripheral);
                ble.startNotification(deviceId, bluefruit.serviceUUID, bluefruit.rxCharacteristic, app.onData, app.onError);
                myDevice = deviceId;
                app.load("action.html");
                app.askInfos();
            };
        ble.connect(deviceId, onConnect, app.onError);
    },
    disconnect: function() {
        var deviceId = myDevice;
        ble.disconnect(deviceId, app.loadMainPage, app.onError);
        window.plugins.insomnia.allowSleepAgain();
    },
    askInfos: function() {
        lastIndex = 0;
        buffLen = 500;
        requested = "infos";
        dataBuffer = new Uint8Array(buffLen);
        var dataToSend = "*kD0%mspEl,infos,0,1400000$";
        app.sendData(dataToSend);
    },
    modeDev: function() {

    },
    onError: function(reason) {
        alert("ERROR: " + JSON.stringify(reason)); // real apps should use notification.alert
    },
    sendData: function(dataToSend) { // send data to Arduino
        console.log("Sending data :");
        var success = function() {
            console.log("success");
            //resultDiv.innerHTML = resultDiv.innerHTML + "Sent: " + dataToSend + "<br/>";
            //resultDiv.scrollTop = resultDiv.scrollHeight;
        };

        var failure = function() {
            console.log("Failed writing data to the bluefruit le");
        };
        var messagee = dataToSend;
        console.log(messagee);
        console.log("to : " + myDevice);
        var deviceId = myDevice;



        if (messagee.length >= 18) {
            console.log("Message bigger than 18");
            var arraYofStringss = [];
            arraYofStringss = messagee.split(",");
            console.log(arraYofStringss);
            console.log(arraYofStringss.length);
            console.log(arraYofStringss[0]);
            var mleng = arraYofStringss.length;
            var ml = 0;

            for (var i = 0; i < mleng; i++) {
                var mm = arraYofStringss[i];
                if (i != mleng - 1) {
                    mm = mm + ',';
                }
                console.log("will send :");
                console.log(mm);
                var data = stringToBytes(mm);
                if (app.writeWithoutResponse) {
                    console.log("Write Without response ...");
                    ble.writeWithoutResponse(
                        deviceId,
                        bluefruit.serviceUUID,
                        bluefruit.txCharacteristic,
                        data, success, failure
                    );
                } else {
                    console.log("Write...");
                    ble.write(
                        deviceId,
                        bluefruit.serviceUUID,
                        bluefruit.txCharacteristic,
                        data, success, failure
                    );
                }
            };
        } else {
            console.log("message smaller than 16");
            var data = stringToBytes(messagee);
            if (app.writeWithoutResponse) {
                console.log("Write Without response ...");
                ble.writeWithoutResponse(
                    deviceId,
                    bluefruit.serviceUUID,
                    bluefruit.txCharacteristic,
                    data, success, failure
                );
            } else {
                console.log("Write...");
                ble.write(
                    deviceId,
                    bluefruit.serviceUUID,
                    bluefruit.txCharacteristic,
                    data, success, failure
                );
            }
        }



    },
    onData: function(data) {
        var temp = new Uint8Array(data);
        dataBuffer.set(temp, lastIndex);
        if (dataBuffer.indexOf(35) != -1) { //Si caractere de fin : #
            lastIndex = temp.length + lastIndex;
            console.log("lastIndex :" + lastIndex);
            debugLog("end of transmission de ouf");
            console.log("end of transmission de ouf");
            app.prepareData();
            lastIndex = 0;
        }
        if (requested != "infos") {
            /*
            var progressVal = document.getElementById("progressVal");
            progressVal.value = 100 * (lastIndex / myBle.data);
            var percent = document.getElementById("percent");
            percent.innerHTML = Math.round(100 * (lastIndex / myBle.data)) + "%";
            */
        }




        if (lastIndex > buffLen) {
            console.log("too big" + lastIndex);
        }
        lastIndex = temp.length + lastIndex;







    },
    prepareData: function(event) { // save data to text file
        /*
        resultDiv.innerHTML = resultDiv.innerHTML + "Debut Prepare <br/>";
        resultDiv.scrollTop = resultDiv.scrollHeight;
        */
        console.log("Debut Prepare");

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
        //progressVal.value = 0;
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
                //debugLog(ll[0] + " is : " + ll[1]);
                //debugLog(ll);
                if (ll[0] == "name") {
                    myBle.name = ll[1];
                    //blePos.innerHTML = posX + " " + posY;
                    bleName.innerHTML = myBle.name;
                }
                if (ll[0] == "date") {
                    myBle.date = ll[1];
                }
                if (ll[0] == "time") {
                    myBle.time = ll[1];
                    //var theTimeb = document.getElementById('theTimeb');
                    theTime.innerHTML = myBle.time;
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
                }
                if (ll[0] == "hysteresis") {
                    myBle.hysteresis = ll[1];
                }
                if (ll[0] == "data") {
                    myBle.data = Number(ll[1]) * 8;
                    dataNumber.innerHTML = Number(ll[1]);
                }
                if (ll[0] == "liveLeftMove") {
                    myBle.left = myBle.left + Number(ll[1]);
                    /*var theTimeb = document.getElementById('theTimeb');
                    theTimeb.innerHTML = myBle.left + "|" + myBle.right;
                    console.log(myBle.left + "|" + myBle.right);
                    console.log(ll);
                    */
                }
                if (ll[0] == "liveRightMove") {
                    myBle.right = myBle.right + Number(ll[1]);
                    /*
                    var theTimeb = document.getElementById('theTimeb');
                    theTimeb.innerHTML = myBle.left + "|" + myBle.right;
                    console.log(myBle.left + "|" + myBle.right);
                    console.log(ll);
                    */
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
            result.forEach(function(rr) {
                if (rr[2] != undefined) {
                    allDatas = allDatas + rr[0] + ',' + rr[1] + ',' + rr[2] + '\n';
                } else {
                    console.log("Wrong data :");
                    //console.log(rr);
                }
            });
            //app.requestAndroidFS("compressed");
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