export default class webrtc {

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
                    break
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
        })
    }

    async onLeave(data) {
        delete this.peers[data.user.userName];
        delete this.channels[data.user.userName];
    }

    async connect() {
        return new Promise(function (resolve, reject) {
            var server = new WebSocket("ws://blueserver.us.to:26950/");
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
            this.send({ type: "offer", offer: offer, name: element });
        });
    }

    async onAnswer({ answer, sender }) {
        console.log(`Got an answer from ${sender}`);
        this.peers[sender].setRemoteDescription(new RTCSessionDescription(answer));

        console.log(this.channels);
        console.log(this.peers);
    }

    async onOffer({ offer, name }) {
        console.log(`Got an offer from ${name}`);

        this.peers[name].setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peers[name].createAnswer();
        await this.peers[name].setLocalDescription(answer);
        this.send({ type: "answer", answer: this.peers[name].localDescription, name, sender: this.user })

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

        peerConnection.onicecandidate = ({ candidate }) => {
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
            }
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
        }

        /*
        peerConnection.onnegotiationneeded = async ev => {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            self.send({ type: "offer", offer: offer, name: _name });
        };*/

        this.peers[_name] = peerConnection;
    }

    reconnect(_name) {
        if (this.peers[_name].connectionState == "connecting")
        {
            this.peers[_name].restartIce();
        }
    }

    send(data) {
        this.serverConnection.send(JSON.stringify(data));
    }

    onError({ message }) {
        console.log(message);
    }

    sendToAll(type, message = "") {
        Object.keys(this.channels).forEach((key) => {
            if (this.channels[key].readyState == 'open') {
                this.channels[key].send(JSON.stringify({ type: type, user: this.user, message: message }));
            }
        })
    }

}