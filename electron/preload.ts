import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
    on(channel: string, listener: (...args: any[]) => void) {
        const subscription = (_event: any, ...args: any[]) => listener(...args)
        ipcRenderer.on(channel, subscription)
        return () => {
            ipcRenderer.removeListener(channel, subscription)
        }
    },
    send(channel: string, ...args: any[]) {
        ipcRenderer.send(channel, ...args)
    },
    invoke(channel: string, ...args: any[]) {
        return ipcRenderer.invoke(channel, ...args)
    },

    // Custom APIs for easier access
    openDirectory: () => ipcRenderer.invoke('open-directory'),
    readFile: (path: string) => ipcRenderer.invoke('read-file', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
    indexProject: (path: string) => ipcRenderer.invoke('index-project', path),
    searchCode: (query: string) => ipcRenderer.invoke('search-code', query),
    chat: (messages: any[], context: string) => ipcRenderer.invoke('chat', messages, context),
})
