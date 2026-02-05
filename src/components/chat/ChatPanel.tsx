import React, { useState, useRef, useEffect } from 'react'
import { Send, Zap, Check, Plus, FilePlus } from 'lucide-react'
import { GalaxyLogo } from '../shared/GalaxyLogo'
import { useStore } from '../../store/useStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export const ChatPanel: React.FC = () => {
    const { messages, addMessage, activeProject, openFiles, activeFileIndex, updateFileContent, refreshFileTree, openFile } = useStore()
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set())
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    const handleApplyCode = async (code: string, messageIndex: number) => {
        const activeFile = openFiles[activeFileIndex]

        if (!activeFile) {
            if (!activeProject) {
                alert("Please open a project folder first!")
                return
            }
            const fileName = prompt("No file active. Enter a name for this new file (e.g. script.py):", "generated_code.py")
            if (!fileName) return

            try {
                const fullPath = `${activeProject}/${fileName}`
                await (window as any).ipcRenderer.invoke('save-file', {
                    filePath: fullPath,
                    content: code
                })
                await refreshFileTree()
                openFile(fullPath, fileName, code)
                setAppliedIndices(prev => new Set(prev).add(messageIndex))
            } catch (err) {
                console.error('Failed to create file on apply:', err)
            }
            return
        }

        try {
            updateFileContent(code)
            await (window as any).ipcRenderer.invoke('save-file', {
                filePath: activeFile.path,
                content: code
            })
            setAppliedIndices(prev => new Set(prev).add(messageIndex))
        } catch (err) {
            console.error('Failed to apply changes:', err)
        }
    }

    const handleCreateFile = async (action: { path: string, content: string }, index: number) => {
        if (!activeProject) return;

        try {
            const fullPath = `${activeProject}/${action.path}`;
            await (window as any).ipcRenderer.invoke('save-file', {
                filePath: fullPath,
                content: action.content
            });
            await refreshFileTree();
            openFile(fullPath, action.path, action.content);
            setAppliedIndices(prev => new Set(prev).add(index));
        } catch (err) {
            console.error('Action-To-Code Error:', err);
        }
    }

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        let userMsgContent = input.trim()
        const userMessage = { role: 'user' as const, content: userMsgContent }
        const currentMessages = [...messages]

        setInput('')
        addMessage(userMessage)
        setIsLoading(true)

        try {
            let context = ""
            const activeFile = openFiles[activeFileIndex]
            if (activeFile) {
                context += `\n\nActive File: ${activeFile.name}\n\`\`\`\n${activeFile.content}\n\`\`\`\n\n`
            }

            const response = await (window as any).ipcRenderer.invoke('chat', [...currentMessages, userMessage], context)

            if (response && response.content) {
                try {
                    const data = JSON.parse(response.content);
                    if (data.action === 'create_file') {
                        addMessage({
                            role: 'assistant',
                            content: `I've prepared a new file for you: **${data.path}**. Click the button below to create it in your project automatically.`,
                            action: data
                        });
                    } else {
                        addMessage({ role: 'assistant', content: response.content })
                    }
                } catch (e) {
                    addMessage({ role: 'assistant', content: response.content })
                }
            }
        } catch (error: any) {
            addMessage({ role: 'assistant', content: `Error: ${error.message}` })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full h-full bg-[#0f172a] border-l border-slate-800 flex flex-col shadow-2xl z-20">
            {/* Header */}
            <div className="h-12 flex items-center px-4 border-b border-slate-800/50 bg-slate-900/40">
                <GalaxyLogo size={18} className="text-blue-400 mr-2.5" />
                <h2 className="text-[12px] font-bold text-slate-200 uppercase tracking-widest font-outfit">Galaxy AI</h2>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center scale-110">
                        <GalaxyLogo size={60} className="mb-4 text-blue-500/50" />
                        <p className="text-xs font-medium tracking-wide">Enter the cosmos of code</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-xl text-[13px] max-w-[90%] ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800/50 border border-slate-800 text-slate-200'}`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        const codeString = String(children).replace(/\n$/, '')
                                        return match ? (
                                            <div className="my-2 rounded-lg overflow-hidden border border-slate-700">
                                                <div className="flex justify-between items-center bg-slate-900 px-3 py-1.5 border-b border-slate-700">
                                                    <span className="text-[10px] text-slate-500 font-mono uppercase">{match[1]}</span>
                                                    <button
                                                        onClick={() => handleApplyCode(codeString, i)}
                                                        className="text-[10px] flex items-center gap-1 hover:text-blue-400 transition-colors"
                                                    >
                                                        <Zap size={10} /> {appliedIndices.has(i) ? 'APPLIED' : 'APPLY'}
                                                    </button>
                                                </div>
                                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} customStyle={{ margin: 0, padding: '10px', fontSize: '11px', background: '#020617' }}>
                                                    {codeString}
                                                </SyntaxHighlighter>
                                            </div>
                                        ) : (
                                            <code className="bg-slate-900/50 px-1 rounded text-blue-400 font-mono" {...props}>{children}</code>
                                        )
                                    }
                                }}
                            >
                                {msg.content}
                            </ReactMarkdown>

                            {msg.action && (
                                <div className="mt-4 p-3 bg-blue-600/10 border border-blue-500/30 rounded-xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                            <FilePlus size={16} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-blue-400">ACTION REQUIRED</p>
                                            <p className="text-[12px] text-slate-200">Create {msg.action.path}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCreateFile(msg.action!, i)}
                                        disabled={appliedIndices.has(i)}
                                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${appliedIndices.has(i)
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg active:scale-95'
                                            }`}
                                    >
                                        {appliedIndices.has(i) ? <><Check size={14} /> FILE CREATED</> : <><Plus size={14} /> GENERATE FILE</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4 min-w-[200px] shadow-xl">
                            <div className="relative">
                                <GalaxyLogo size={20} className="text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
                                <div className="absolute inset-0 bg-blue-400/20 blur-md animate-pulse rounded-full" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-blue-400 tracking-widest uppercase">Galaxy AI thinking</span>
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                    <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-900/40 border-t border-slate-800/50 shadow-inner">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Talk to Galaxy AI..."
                        className="w-full bg-[#020617] border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-[13px] text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all resize-none min-h-[50px] max-h-[150px]"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-30 transition-all shadow-lg"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}
