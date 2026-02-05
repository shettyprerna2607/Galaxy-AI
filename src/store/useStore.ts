import { create } from 'zustand'

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
    action?: {
        action: string
        path: string
        content: string
    }
}

interface FileNode {
    name: string
    path: string
    type: 'file' | 'directory'
    children?: FileNode[]
}

interface OpenFile {
    path: string
    name: string
    content: string
    isDirty: boolean
}

interface AppState {
    activeProject: string | null
    fileTree: FileNode[]
    openFiles: OpenFile[]
    activeFileIndex: number
    messages: Message[]
    indexingStatus: string
    activeView: 'editor' | 'map'
    collapseAllSignal: number
    sidebarVisible: boolean
    chatPanelVisible: boolean
    aiEngineStatus: 'online' | 'offline' | 'checking'
    aiModelName: string

    // Actions
    setActiveProject: (path: string | null) => void
    setFileTree: (tree: FileNode[]) => void
    addMessage: (msg: Message) => void
    setIndexingStatus: (status: string) => void
    setAIEngineStatus: (status: 'online' | 'offline' | 'checking', modelName: string) => void
    setActiveView: (view: 'editor' | 'map') => void
    toggleSidebar: () => void
    toggleChatPanel: () => void
    triggerCollapseAll: () => void
    refreshFileTree: () => Promise<void>

    openFile: (path: string, name: string, content: string) => void
    closeFile: (index: number) => void
    setActiveFile: (index: number) => void
    updateFileContent: (content: string) => void
    saveActiveFile: () => void
}

export const useStore = create<AppState>((set) => ({
    activeProject: null,
    fileTree: [],
    openFiles: [],
    activeFileIndex: -1,
    messages: [],
    indexingStatus: 'Ready',
    activeView: 'editor',
    collapseAllSignal: 0,
    sidebarVisible: true,
    chatPanelVisible: true,
    aiEngineStatus: 'checking',
    aiModelName: 'Disconnected',

    setActiveProject: (path) => set({ activeProject: path }),
    setFileTree: (tree) => set({ fileTree: tree }),
    addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
    setIndexingStatus: (status) => set({ indexingStatus: status }),
    setAIEngineStatus: (status, modelName) => set({ aiEngineStatus: status, aiModelName: modelName }),
    setActiveView: (view) => set({ activeView: view }),
    toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
    toggleChatPanel: () => set((state) => ({ chatPanelVisible: !state.chatPanelVisible })),
    triggerCollapseAll: () => set((state) => ({ collapseAllSignal: state.collapseAllSignal + 1 })),
    refreshFileTree: async () => {
        const state = useStore.getState()
        if (state.activeProject) {
            const tree = await (window as any).ipcRenderer.invoke('get-file-tree', state.activeProject)
            set({ fileTree: tree })
        }
    },

    openFile: (path, name, content) => set((state) => {
        const existingIndex = state.openFiles.findIndex(f => f.path === path)
        if (existingIndex !== -1) {
            return { activeFileIndex: existingIndex }
        }
        const newFile = { path, name, content, isDirty: false }
        return {
            openFiles: [...state.openFiles, newFile],
            activeFileIndex: state.openFiles.length
        }
    }),

    closeFile: (index) => set((state) => {
        const newFiles = state.openFiles.filter((_, i) => i !== index)
        let newIndex = state.activeFileIndex
        if (newIndex >= newFiles.length) {
            newIndex = newFiles.length - 1
        }
        return {
            openFiles: newFiles,
            activeFileIndex: newIndex
        }
    }),

    setActiveFile: (index) => set({ activeFileIndex: index }),

    updateFileContent: (content) => set((state) => {
        if (state.activeFileIndex === -1) return state
        const newFiles = [...state.openFiles]
        newFiles[state.activeFileIndex] = {
            ...newFiles[state.activeFileIndex],
            content,
            isDirty: true
        }
        return { openFiles: newFiles }
    }),

    saveActiveFile: () => set((state) => {
        if (state.activeFileIndex === -1) return state
        const newFiles = [...state.openFiles]
        newFiles[state.activeFileIndex] = {
            ...newFiles[state.activeFileIndex],
            isDirty: false
        }
        return { openFiles: newFiles }
    })
}))
