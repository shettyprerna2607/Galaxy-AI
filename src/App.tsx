import { useEffect } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { Sidebar } from './components/sidebar/Sidebar'
import { Editor } from './components/editor/Editor'
import { ChatPanel } from './components/chat/ChatPanel'
import { Terminal } from './components/terminal/Terminal'
import { StarMap } from './components/starmap/StarMap'
import { useStore } from './store/useStore'
import { Folders, MessageSquare } from 'lucide-react'

function App() {
  const { setIndexingStatus, activeView, sidebarVisible, chatPanelVisible, toggleSidebar, toggleChatPanel } = useStore()

  useEffect(() => {
    const ipc = (window as any).ipcRenderer
    if (ipc) {
      const unsubIndexing = ipc.on('indexing-progress', (msg: string) => {
        setIndexingStatus(msg)
      })
      const unsubHealth = ipc.on('ai-health', (data: { status: 'online' | 'offline', model: string }) => {
        useStore.getState().setAIEngineStatus(data.status, data.model)
      })
      return () => {
        unsubIndexing()
        unsubHealth()
      }
    }
  }, [setIndexingStatus])

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#020617] text-slate-200 font-inter flex">
      {/* Mini Activity Bar */}
      <div className="w-12 h-full bg-[#0f172a] border-r border-slate-800 flex flex-col items-center py-4 gap-4 shrink-0 z-30">
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg transition-all ${sidebarVisible ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          title="Toggle Explorer"
        >
          <Folders size={20} />
        </button>
        <button
          onClick={toggleChatPanel}
          className={`p-2 rounded-lg transition-all ${chatPanelVisible ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          title="Toggle AI Chat"
        >
          <MessageSquare size={20} />
        </button>
      </div>

      <Group orientation="horizontal" className="flex-1">
        {/* Left Sidebar */}
        {sidebarVisible && (
          <>
            <Panel defaultSize="250px" minSize="150px" maxSize="400px" className="flex flex-col">
              <Sidebar />
            </Panel>
            <Separator className="w-[1px] bg-slate-800 hover:bg-blue-500/50 transition-colors cursor-col-resize" />
          </>
        )}

        {/* Middle Content */}
        <Panel className="flex-1 flex flex-col min-w-0 bg-[#020617]">
          <Group orientation="vertical">
            <Panel className="relative overflow-hidden flex flex-col">
              {activeView === 'editor' ? <Editor /> : <StarMap />}
            </Panel>

            <Separator className="h-[1px] bg-slate-800 hover:bg-blue-500/50 transition-colors cursor-row-resize" />

            {/* Terminal */}
            <Panel defaultSize="25%" minSize="10%" maxSize="80%" className="flex flex-col bg-[#020617]">
              <Terminal />
            </Panel>
          </Group>
        </Panel>

        {/* Right Chat Panel */}
        {chatPanelVisible && (
          <>
            <Separator className="w-[1px] bg-slate-800 hover:bg-blue-500/50 transition-colors cursor-col-resize" />
            <Panel defaultSize="350px" minSize="300px" maxSize="500px" className="flex flex-col">
              <ChatPanel />
            </Panel>
          </>
        )}
      </Group>
    </div>
  )
}

export default App
