/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./client/app.js":
/*!***********************!*\
  !*** ./client/app.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _webrtc__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./webrtc */ "./client/webrtc.js");

var conn;
document.getElementById("container").style.display = 'none';
document.getElementById("conn").addEventListener("click", e => {
  if (document.getElementById("name").value != "") {
    connect(document.getElementById("name").value);
    document.getElementById("init").style.display = 'none';
    document.getElementById("container").style.display = 'block';
  }
});
document.getElementById("send").addEventListener("click", e => {
  message();
});

document.getElementById('message').onkeypress = function (e) {
  if (!e) e = window.event;
  var keyCode = e.code || e.key;

  if (keyCode == 'Enter') {
    message();
  }
};

function message() {
  if (document.getElementById("message").value != "") {
    conn.sendToAll("message", document.getElementById("message").value);
    addText(conn.user, document.getElementById("message").value);
    document.getElementById("message").value = "";
  }
}

function addText(sender, message) {
  document.getElementById("chat").innerHTML += "<br> " + sender + ": " + message;
}

function connect(_name) {
  conn = new _webrtc__WEBPACK_IMPORTED_MODULE_0__.default(_name);

  conn.onMessage = function (data) {
    addText(data.user, data.message);
  };

  conn.onConn = function (data) {
    document.getElementById("chat").innerHTML += "<br>>" + data + " has connected!";
  };
}

/***/ }),

/***/ "./client/webrtc.js":
/*!**************************!*\
  !*** ./client/webrtc.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => /* binding */ webrtc
/* harmony export */ });
class webrtc {
  constructor(_name) {
    this.STUN = {
      urls: 'stun:stun.l.google.com:19302'
    };
    this.config = {
      iceServers: [this.STUN]
    };
    this.user = _name;
    this.peers = {};
    this.channels = {};
    this.serverConnection;
    this.server();
  }

  async server() {
    this.serverConnection = await this.connect();

    this.serverConnection.onmessage = message => {
      const data = JSON.parse(message.data);

      switch (data.type) {
        case "connect":
          break;

        case "login":
          this.users(data);
          break;

        case "updateUsers":
          this.updateUsers(data);
          break;

        case "offer":
          this.onOffer(data);
          break;

        case "answer":
          this.onAnswer(data);
          break;

        case "candidate":
          this.onCandidate(data);
          break;

        case "error":
          this.onError(data);
          break;

        case "leave":
          this.onLeave(data);
          break;

        default:
          break;
      }
    };

    this.send({
      type: "login",
      name: this.user
    });
  }

  async onLeave(data) {
    delete this.peers[data.user.userName];
    delete this.channels[data.user.userName];
  }

  async connect() {
    return new Promise(function (resolve, reject) {
      var server = new WebSocket("ws://localhost:9000");

      server.onopen = function () {
        resolve(server);
      };

      server.onerror = function (err) {
        reject(err);
      };
    });
  }

  async offerToAll() {
    Object.keys(this.peers).forEach(async element => {
      const offer = await this.peers[element].createOffer();
      await this.peers[element].setLocalDescription(offer);
      this.send({
        type: "offer",
        offer: offer,
        name: element
      });
    });
  }

  async onAnswer({
    answer,
    sender
  }) {
    console.log(`Got an answer from ${sender}`);
    this.peers[sender].setRemoteDescription(new RTCSessionDescription(answer));
    console.log(this.channels);
    console.log(this.peers);
  }

  async onOffer({
    offer,
    name
  }) {
    console.log(`Got an offer from ${name}`);
    this.peers[name].setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peers[name].createAnswer();
    await this.peers[name].setLocalDescription(answer);
    this.send({
      type: "answer",
      answer: this.peers[name].localDescription,
      name,
      sender: this.user
    });
    console.log(this.peers);
  }

  async onCandidate(data) {
    this.peers[data.sender].addIceCandidate(data.candidate);
  }

  users(data) {
    if (!data.success) {
      return;
    }

    data.users.forEach(element => {
      if (!this.peers[element.userName]) {
        this.createPeer(element.userName);
      }
    });
    this.offerToAll();
  }

  updateUsers(data) {
    if (!this.peers[data.user.userName]) {
      this.createPeer(data.user.userName);
    }
  }

  createPeer(_name) {
    var peerConnection = new RTCPeerConnection(this.config);

    peerConnection.onicecandidate = ({
      candidate
    }) => {
      if (candidate) {
        this.send({
          name: _name,
          sender: this.user,
          type: "candidate",
          candidate
        });
      }
    };

    this.channels[_name] = peerConnection.createDataChannel("data");
    const self = this;

    peerConnection.ondatachannel = function (ev) {
      console.log('Data channel is created!');

      ev.channel.onopen = function () {
        console.log('Data channel is open and ready to be used.');
      };

      ev.channel.onmessage = function (event) {
        var data = JSON.parse(event.data);
        console.log(data);

        switch (data.type) {
          case "message":
            self.onMessage(data);

          default:
            break;
        }
      };
    };

    peerConnection.onconnectionstatechange = function (event) {
      switch (peerConnection.connectionState) {
        case "connected":
          console.log(`The connection with ${_name} was successful!`);
          self.onConn(_name);
          break;

        case "connecting":
          setTimeout(self.reconnect(_name), 10000);
          break;

        case "disconnected":
        case "failed":
          console.log(`The connection with ${_name} failed or disconnected`);
          peerConnection.restartIce();
          break;

        case "closed":
          console.log(`The connection with ${_name} was closed`);
          break;
      }
    };
    /*
    peerConnection.onnegotiationneeded = async ev => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        self.send({ type: "offer", offer: offer, name: _name });
    };*/


    this.peers[_name] = peerConnection;
  }

  reconnect(_name) {
    if (this.peers[_name].connectionState == "connecting") {
      this.peers[_name].restartIce();
    }
  }

  send(data) {
    this.serverConnection.send(JSON.stringify(data));
  }

  onError({
    message
  }) {
    console.log(message);
  }

  sendToAll(type, message = "") {
    Object.keys(this.channels).forEach(key => {
      if (this.channels[key].readyState == 'open') {
        this.channels[key].send(JSON.stringify({
          type: type,
          user: this.user,
          message: message
        }));
      }
    });
  }

}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__("./client/app.js");
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;
//# sourceMappingURL=renderer.bundle.js.map