const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let win;

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            enableRemoteModule: true,
            preload: path.join(__dirname, "preload.js")
        },
        frame: false
    });

    // and load the index.html of the app.
    win.loadFile(path.join(__dirname, "index.html"));
}

app.on('ready', createWindow);