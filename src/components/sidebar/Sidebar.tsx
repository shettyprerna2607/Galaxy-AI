import React, { useState, useEffect } from 'react'
import {
    FolderOpen, CheckCircle2, Circle, ChevronRight, ChevronDown,
    Folder, FilePlus, FolderPlus, RefreshCw, ChevronsUp, X, Check, Zap,
    Coffee, Code2, FileText, Globe, Palette, FileCode, Binary,
    FileJson, FileType2
} from 'lucide-react'
import { GalaxyLogo } from '../shared/GalaxyLogo'
import { useStore } from '../../store/useStore'

const FileIcon: React.FC<{ name: string; type: 'file' | 'directory'; isOpen?: boolean }> = ({ name, type, isOpen }) => {
    if (type === 'directory') {
        return <Folder size={14} className={`${isOpen ? 'text-blue-400 fill-blue-400/20' : 'text-slate-400'}`} />
    }

    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'java': return <Coffee size={14} className="text-orange-400" />
        case 'ts':
        case 'tsx': return <Code2 size={14} className="text-blue-400" />
        case 'js':
        case 'jsx': return <FileType2 size={14} className="text-yellow-400" />
        case 'json': return <FileJson size={14} className="text-yellow-500" />
        case 'html': return <Globe size={14} className="text-orange-500" />
        case 'css': return <Palette size={14} className="text-pink-400" />
        case 'md': return <FileText size={14} className="text-blue-300" />
        case 'py': return <Binary size={14} className="text-emerald-400" />
        default: return <FileCode size={14} className="text-slate-400" />
    }
}

const FileTreeNode: React.FC<{ node: any; depth: number }> = ({ node, depth }) => {
    const [isOpen, setIsOpen] = useState(node.isRoot || false)
    const { openFile, collapseAllSignal } = useStore()

    useEffect(() => {
        if (collapseAllSignal > 0 && !node.isRoot) {
            setIsOpen(false)
        }
    }, [collapseAllSignal, node.isRoot])

    const handleClick = async () => {
        if (node.type === 'directory') {
            setIsOpen(!isOpen)
        } else {
            const content = await (window as any).ipcRenderer.invoke('read-file', node.path)
            openFile(node.path, node.name, content || '')
        }
    }

    const isIgnored = ['node_modules', 'dist', 'dist-electron', '.git'].includes(node.name)

    return (
        <div className="select-none">
            <div
                onClick={handleClick}
                className={`flex items-center gap-1.5 py-[3px] px-2 hover:bg-slate-800/50 rounded cursor-pointer group transition-colors relative
                    ${node.isRoot ? 'mb-1 py-1 bg-slate-800/20 border-y border-slate-800/10' : ''}
                    ${isIgnored ? 'opacity-50 grayscale-[0.5]' : ''}
                `}
                style={{ paddingLeft: `${depth * 14 + 12}px` }}
            >
                {node.type === 'directory' ? (
                    isOpen ? <ChevronDown size={14} className="text-slate-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />
                ) : (
                    <div className="w-[14px] shrink-0" />
                )}

                <FileIcon name={node.name} type={node.type} isOpen={isOpen} />

                <span className={`text-[13px] truncate transition-colors group-hover:text-white
                    ${node.isRoot ? 'font-bold text-slate-200' : 'text-slate-300'}
                `}>
                    {node.name}
                </span>
            </div>

            {node.type === 'directory' && isOpen && node.children && (
                <div className="relative">
                    {/* Vertical guide line */}
                    {!node.isRoot && (
                        <div
                            className="absolute left-0 top-0 bottom-0 w-[1px] bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                            style={{ marginLeft: `${depth * 14 + 19}px` }}
                        />
                    )}
                    <div>
                        {node.children.map((child: any) => (
                            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export const Sidebar: React.FC = () => {
    const { activeProject, setActiveProject, indexingStatus, setIndexingStatus, fileTree, setFileTree, activeView, setActiveView, refreshFileTree, triggerCollapseAll, aiEngineStatus, aiModelName } = useStore()
    const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null)
    const [newName, setNewName] = useState('')

    const handleOpenFolder = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        try {
            const ipc = (window as any).ipcRenderer
            if (!ipc) return

            const path = await ipc.invoke('open-directory')
            if (path) {
                setActiveProject(path)
                ipc.send('terminal-cd', path)
                setIndexingStatus('Starting index...')

                // Fetch file tree
                const tree = await ipc.invoke('get-file-tree', path)
                setFileTree(tree)

                // Start background indexing
                ipc.invoke('index-project', path)
            }
        } catch (error: any) {
            console.error('Sidebar Error:', error)
        }
    }

    const handleCreateSubmit = async () => {
        if (!newName || !activeProject) return

        const ipc = (window as any).ipcRenderer
        const targetPath = `${activeProject}/${newName}`

        try {
            if (isCreating === 'file') {
                await ipc.invoke('create-file', targetPath)
            } else {
                await ipc.invoke('create-folder', targetPath)
            }
            await refreshFileTree()
            setIsCreating(null)
            setNewName('')
        } catch (err) {
            console.error('Creation failed:', err)
        }
    }

    return (
        <div className="w-full h-full bg-[#0f172a] border-r border-slate-800 flex flex-col no-drag shadow-2xl">
            <div className="h-10 drag-area w-full shrink-0 flex items-center px-4 justify-between border-b border-slate-800/30">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40" />
                </div>
                <div className="flex items-center gap-2 opacity-80">
                    <GalaxyLogo size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">Galaxy AI</span>
                </div>
            </div>

            <div className="p-4 border-b border-slate-800/50">
                <button
                    onClick={handleOpenFolder}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                    <FolderOpen size={16} />
                    Open Project
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                {activeProject ? (
                    <div>
                        <div className="px-4 mb-2 flex items-center justify-between group/explorer">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Explorer</div>
                            <div className="flex gap-2 items-center">
                                <div className="flex gap-1 opacity-0 group-hover/explorer:opacity-100 transition-opacity">
                                    <button onClick={() => setIsCreating('file')} title="New File" className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-blue-400 transition-colors">
                                        <FilePlus size={12} />
                                    </button>
                                    <button onClick={() => setIsCreating('folder')} title="New Folder" className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-blue-400 transition-colors">
                                        <FolderPlus size={12} />
                                    </button>
                                    <button onClick={() => refreshFileTree()} title="Refresh" className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-blue-400 transition-colors">
                                        <RefreshCw size={12} />
                                    </button>
                                    <button onClick={() => triggerCollapseAll()} title="Collapse All" className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-blue-400 transition-colors">
                                        <ChevronsUp size={12} />
                                    </button>
                                </div>
                                <div className="flex gap-1 bg-slate-800/50 p-0.5 rounded-md border border-slate-700/30">
                                    <button
                                        onClick={() => setActiveView('editor')}
                                        className={`p-1 rounded ${activeView === 'editor' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <FileCode size={11} />
                                    </button>
                                    <button
                                        onClick={() => setActiveView('map')}
                                        className={`p-1 rounded ${activeView === 'map' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <Circle size={11} fill={activeView === 'map' ? 'currentColor' : 'none'} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Creation UI */}
                        {isCreating && (
                            <div className="px-4 mb-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-1 bg-slate-900 border border-blue-500/30 rounded-md p-1">
                                    {isCreating === 'file' ? <FileCode size={12} className="text-blue-400" /> : <Folder size={12} className="text-blue-400" />}
                                    <input
                                        autoFocus
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateSubmit()
                                            if (e.key === 'Escape') setIsCreating(null)
                                        }}
                                        placeholder={`New ${isCreating}...`}
                                        className="flex-1 bg-transparent text-[12px] text-slate-200 outline-none px-1"
                                    />
                                    <button onClick={handleCreateSubmit} className="p-1 hover:text-emerald-400 transition-colors">
                                        <Check size={12} />
                                    </button>
                                    <button onClick={() => setIsCreating(null)} className="p-1 hover:text-red-400 transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-[1px]">
                            {fileTree.map(node => (
                                <FileTreeNode key={node.path} node={node} depth={0} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-500 mt-20 px-8">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                            <GalaxyLogo size={30} className="text-slate-600/50" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">No Project</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            Open a folder to start building like a pro.
                        </p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-900/50 border-t border-slate-800/50 backdrop-blur-md space-y-4">
                <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Indexing Status</div>
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-slate-700/30">
                        {indexingStatus === 'Ready' || indexingStatus.includes('complete') ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                        ) : (
                            <Circle size={14} className="text-blue-400 animate-pulse" />
                        )}
                        <span className="truncate font-medium">{indexingStatus}</span>
                    </div>
                </div>

                <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Engine Health</div>
                    <div className={`flex items-center gap-2.5 text-[11px] p-2 rounded-lg border ${aiEngineStatus === 'online'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/5 border-red-500/20 text-red-400'
                        }`}>
                        {aiEngineStatus === 'online' ? (
                            <Zap size={14} fill="currentColor" />
                        ) : (
                            <X size={14} />
                        )}
                        <div className="flex-1 truncate font-medium flex flex-col">
                            <span>{aiEngineStatus === 'online' ? aiModelName : 'Engine Offline'}</span>
                            {aiEngineStatus !== 'online' && (
                                <a
                                    href="https://ollama.com"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] text-blue-400 hover:underline mt-0.5"
                                >
                                    Setup Ollama →
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
