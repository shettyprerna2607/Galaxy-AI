"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(channel, listener) {
    const subscription = (_event, ...args) => listener(...args);
    electron.ipcRenderer.on(channel, subscription);
    return () => {
      electron.ipcRenderer.removeListener(channel, subscription);
    };
  },
  send(channel, ...args) {
    electron.ipcRenderer.send(channel, ...args);
  },
  invoke(channel, ...args) {
    return electron.ipcRenderer.invoke(channel, ...args);
  },
  // Custom APIs for easier access
  openDirectory: () => electron.ipcRenderer.invoke("open-directory"),
  readFile: (path) => electron.ipcRenderer.invoke("read-file", path),
  writeFile: (path, content) => electron.ipcRenderer.invoke("write-file", path, content),
  indexProject: (path) => electron.ipcRenderer.invoke("index-project", path),
  searchCode: (query) => electron.ipcRenderer.invoke("search-code", query),
  chat: (messages, context) => electron.ipcRenderer.invoke("chat", messages, context)
});
