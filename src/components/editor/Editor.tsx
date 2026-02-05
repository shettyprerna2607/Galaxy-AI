import React, { useEffect, useRef } from 'react'
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import { X, FileCode, Zap } from 'lucide-react'
import { GalaxyLogo } from '../shared/GalaxyLogo'
import { useStore } from '../../store/useStore'

export const Editor: React.FC = () => {
    const store = useStore()
    const { openFiles, activeFileIndex, setActiveFile, closeFile, updateFileContent } = store
    const editorRef = useRef<any>(null)
    const providerRef = useRef<any>(null)

    const activeFile = openFiles[activeFileIndex]

    const getLanguage = (fileName: string): string => {
        const ext = fileName.split('.').pop()?.toLowerCase()
        const map: Record<string, string> = {
            js: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
            py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown'
        }
        return map[ext || ''] || 'plaintext'
    }

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor

        // Cleanup old provider if exists
        if (providerRef.current) {
            providerRef.current.dispose()
        }

        // Check if the modern API exists
        if (monaco.languages && monaco.languages.registerInlineCompletionsProvider) {
            try {
                // Register for all languages using a broad selector
                providerRef.current = monaco.languages.registerInlineCompletionsProvider({ pattern: '**' }, {
                    provideInlineCompletions: async (model: any, position: any) => {
                        // Only suggest for the active model in this editor
                        if (model !== editor.getModel()) return { items: [] }

                        const textUntilPosition = model.getValueInRange({
                            startLineNumber: 1,
                            startColumn: 1,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column,
                        })

                        if (textUntilPosition.trim().length < 5) return { items: [] }

                        try {
                            const prediction = await (window as any).ipcRenderer.invoke('inline-predict', textUntilPosition.slice(-500))
                            if (!prediction) return { items: [] }

                            return {
                                items: [{
                                    insertText: prediction,
                                    range: new monaco.Range(
                                        position.lineNumber,
                                        position.column,
                                        position.lineNumber,
                                        position.column
                                    )
                                }]
                            }
                        } catch (e) {
                            return { items: [] }
                        }
                    },
                    freeInlineCompletions: () => { }
                })
            } catch (err) {
                console.error('Galaxy AI: Failed to register inline provider', err)
            }
        }

        editor.updateOptions({
            inlineSuggest: {
                enabled: true,
                showToolbar: 'always',
                mode: 'prefix'
            }
        })

        // Manual Save Shortcut
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
            const state = useStore.getState()
            const active = state.openFiles[state.activeFileIndex]
            if (active) {
                await (window as any).ipcRenderer.invoke('save-file', {
                    filePath: active.path,
                    content: active.content
                })
                state.saveActiveFile()
            }
        })
    }

    // Auto-Save Effect
    useEffect(() => {
        if (!activeFile || !activeFile.isDirty) return

        const timer = setTimeout(async () => {
            try {
                const result = await (window as any).ipcRenderer.invoke('save-file', {
                    filePath: activeFile.path,
                    content: activeFile.content
                })
                if (result.success) {
                    store.saveActiveFile()
                }
            } catch (err) {
                console.error('Save failed:', err)
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [activeFile?.content, activeFile?.path, activeFile?.isDirty])

    if (!activeFile) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020617] text-slate-500">
                <div className="w-20 h-20 bg-slate-800/10 rounded-2xl flex items-center justify-center mb-6 border border-slate-800/30 shadow-2xl">
                    <GalaxyLogo size={40} className="text-slate-700/50" />
                </div>
                <h2 className="text-xl font-bold text-slate-300 mb-2 font-outfit">Galaxy AI Editor</h2>
                <p className="text-xs text-slate-500">Open a galaxy of code to continue...</p>
            </div>
        )
    }

    const isBinary = activeFile.name.endsWith('.class') || activeFile.name.endsWith('.exe') || activeFile.name.endsWith('.dll')

    if (isBinary) {
        return (
            <div className="flex-1 flex flex-col bg-[#020617]">
                {/* Tabs */}
                <div className="flex items-center h-10 bg-slate-900/30 border-b border-slate-800/50 overflow-x-auto scrollbar-none px-2 gap-1">
                    {openFiles.map((file, index) => (
                        <div
                            key={file.path}
                            onClick={() => setActiveFile(index)}
                            className={`group flex items-center gap-2 h-[34px] px-3 rounded-t-lg transition-all border-x border-t cursor-pointer ${activeFileIndex === index
                                ? 'bg-slate-800/40 text-blue-400 border-slate-700/50'
                                : 'text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800/10'
                                }`}
                        >
                            <FileCode size={14} className={activeFileIndex === index ? 'text-blue-400' : 'text-slate-500'} />
                            <span className="text-[11px] font-bold whitespace-nowrap">{file.name}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); closeFile(index); }}
                                className="p-0.5 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                        <X size={32} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-200 mb-2">Binary File Detected</h3>
                    <p className="text-sm text-slate-400 max-w-md mb-6">
                        The file <code className="text-blue-400">{activeFile.name}</code> is a compiled binary and cannot be edited.
                        Please open the corresponding <span className="text-emerald-400">source file</span> to view or edit the code.
                    </p>
                    {activeFile.name.endsWith('.class') && (
                        <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-xl text-xs text-slate-300 flex flex-col items-center gap-2">
                            <span className="text-slate-500 uppercase tracking-widest font-bold">Recommended Action</span>
                            <span>Click on <strong className="text-blue-400">{activeFile.name.replace('.class', '.java')}</strong> in your explorer.</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col bg-[#020617] overflow-hidden relative">
            <div className="absolute top-2 right-4 z-20 flex items-center gap-3">
                {/* Run Button */}
                {(activeFile.name.endsWith('.java') || activeFile.name.endsWith('.py') || activeFile.name.endsWith('.js')) && (
                    <button
                        onClick={async () => {
                            // 1. Force Save
                            await (window as any).ipcRenderer.invoke('save-file', {
                                filePath: activeFile.path,
                                content: activeFile.content
                            })
                            store.saveActiveFile()

                            // 2. Execute Code
                            // Commands are run directly since the terminal is initialized in the project path
                            const ipc = (window as any).ipcRenderer

                            // Send Ctrl+C first to clear any junk, then run
                            if (activeFile.name.endsWith('.java')) {
                                const className = activeFile.name.replace('.java', '')

                                const cmd = `echo Compiling... && javac "${activeFile.name}" && echo Executing... && java "${className}"`;

                                ipc.send('terminal-input', `${cmd}\r\n`)
                            } else if (activeFile.name.endsWith('.py')) {
                                ipc.send('terminal-input', `python "${activeFile.name}"\r\n`)
                            } else if (activeFile.name.endsWith('.js')) {
                                ipc.send('terminal-input', `node "${activeFile.name}"\r\n`)
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-95 border border-emerald-400/20"
                    >
                        <Zap size={12} fill="currentColor" /> RUN CODE
                    </button>
                )}

                <div className="flex items-center gap-2 px-2 py-1 bg-blue-600/10 border border-blue-500/20 rounded-md backdrop-blur-md">
                    <GalaxyLogo size={12} className={`text-blue-400 ${activeFile.isDirty ? 'animate-spin' : 'animate-pulse'}`} />
                    <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase">
                        {activeFile.isDirty ? 'Saving...' : 'AI Predictions Active'}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center h-10 bg-slate-900/30 border-b border-slate-800/50 overflow-x-auto scrollbar-none px-2 gap-1">
                {openFiles.map((file, index) => (
                    <div
                        key={file.path}
                        onClick={() => setActiveFile(index)}
                        className={`group flex items-center gap-2 h-[34px] px-3 rounded-t-lg transition-all border-x border-t cursor-pointer ${activeFileIndex === index
                            ? 'bg-slate-800/40 text-blue-400 border-slate-700/50'
                            : 'text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800/10'
                            }`}
                    >
                        <FileCode size={14} className={activeFileIndex === index ? 'text-blue-400' : 'text-slate-500'} />
                        <span className="text-[11px] font-bold whitespace-nowrap">{file.name}</span>
                        {file.isDirty && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 mb-0.5 animate-pulse" />
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); closeFile(index); }}
                            className="p-0.5 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Editor */}
            <div className="flex-1">
                <MonacoEditor
                    height="100%"
                    language={getLanguage(activeFile.name)}
                    theme="vs-dark"
                    value={activeFile.content}
                    onMount={handleEditorMount}
                    onChange={(value) => updateFileContent(value || '')}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                        lineHeight: 22,
                        padding: { top: 16 },
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        automaticLayout: true,
                        renderLineHighlight: 'all',
                        overviewRulerBorder: false,
                        scrollBeyondLastLine: false,
                        inlineSuggest: { enabled: true },
                        formatOnPaste: true,
                        formatOnType: true
                    }}
                />
            </div>
        </div>
    )
}
