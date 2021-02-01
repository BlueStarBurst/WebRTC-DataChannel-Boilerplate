import webrtc from './webrtc'
import React from 'react'
import render from 'react-dom'

var conn;
document.getElementById("container").style.display = 'none';

document.getElementById("conn").addEventListener("click", (e) => {
    if (document.getElementById("name").value != "") {
        connect(document.getElementById("name").value);
        document.getElementById("init").style.display = 'none';
        document.getElementById("container").style.display = 'block';
    }
});

document.getElementById("send").addEventListener("click", (e) => {
    message();
});

document.getElementById('message').onkeypress = function (e) {
    if (!e) e = window.event;
    var keyCode = e.code || e.key;
    if (keyCode == 'Enter') {
        message();
    }
}

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
    conn = new webrtc(_name);
    conn.onMessage = function (data) {
        addText(data.user, data.message);
    }
    conn.onConn = function (data) {
        document.getElementById("chat").innerHTML += "<br>>" + data + " has connected!";
    }
}

document.getElementById('quit').addEventListener('click', (e) => {
    window.closeCurrentWindow();
});

document.getElementById('minimize').addEventListener('click', (e) => {
    window.minimize();
});

document.getElementById('maximize').addEventListener('click', (e) => {
    window.minMaxWindow();
});

//render(<></>, document.getElementById("root"));

