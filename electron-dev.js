const electron = require('electron');
const fs = require('fs');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let menuTemplate = [
    {
        label: 'Electron',
        submenu: [
            {
                label: 'Quit',
                accelerator: 'Command+Q',
                click: function () {
                    app.quit();
                }
            },
        ]
    },
    {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]},
    {
        label: 'View',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'Command+R',
                click: function () {
                    BrowserWindow.getFocusedWindow().reloadIgnoringCache();
                }
            },
            {
                label: 'Toggle DevTools',
                accelerator: 'Alt+Command+I',
                click: function () {
                    BrowserWindow.getFocusedWindow().toggleDevTools();
                }
            }
        ]
    }
];

const path = require('path');
const url = require('url');

console.log(__dirname);
console.log(process.env.NODE_ENV);

function debounce(func, ms) {
    let ts;
    return function() {
        clearTimeout(ts);
        ts = setTimeout(() => func.apply(this, arguments), ms);
    };
}

if (process.env.NODE_ENV !== 'production') {
    const watchPath = path.join(__dirname, "./build/static");

    fs.watch(
        watchPath,
        { encoding: 'buffer' },
        debounce((eventType, filename) => {
            watchPathExists = fs.existsSync(watchPath);
            console.log(`Reloading electron: ${watchPathExists}`);
            if (watchPathExists) {
                mainWindow.destroy();
                createWindow();
            }
        }, 50)

    );
}

function createWindow() {
    // Create the browser window.
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
    mainWindow = new BrowserWindow({width: 1200, height: 780, webPreferences: { nodeIntegration: true }});


    // and load the index.html of the app.
    // mainWindow.loadURL('http://localhost:3000');
    mainWindow.loadFile(path.join(__dirname, "./build/index.html"));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })

    mainWindow.webContents.on('crashed', () => {
        console.log(`mainWindow crashed. re-creating.`)
        mainWindow.destroy();
        createWindow();
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
