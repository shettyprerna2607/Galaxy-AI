import React, { useState, useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { Terminal as TerminalIcon, X, Trash2, Zap, RefreshCw } from 'lucide-react'
import { GalaxyLogo } from '../shared/GalaxyLogo'
import { useStore } from '../../store/useStore'

export const Terminal: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<XTerm | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const [isOpen, setIsOpen] = useState(true)
    const [suggestion, setSuggestion] = useState<{ error: string, fix: string, command: string } | null>(null)

    useEffect(() => {
        if (!isOpen || !terminalRef.current) return

        let isMounted = true
        const term = new XTerm({
            theme: {
                background: '#020617',
                foreground: '#cbd5e1',
                cursor: '#3b82f6',
                selectionBackground: 'rgba(59, 130, 246, 0.3)',
            },
            fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
            fontSize: 12,
            allowTransparency: true,
            cursorBlink: true,
            scrollback: 1000,
            rows: 40, // Increased default rows
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)

        requestAnimationFrame(() => {
            if (!isMounted || !terminalRef.current) return
            try {
                term.open(terminalRef.current)
                // Small delay to ensure container has dimensions
                setTimeout(() => {
                    if (isMounted) fitAddon.fit()
                }, 100)
            } catch (e) { }
        })

        xtermRef.current = term
        fitAddonRef.current = fitAddon

        // Handle Resizing
        const resizeObserver = new ResizeObserver(() => {
            if (isMounted && terminalRef.current && terminalRef.current.clientWidth > 0) {
                try {
                    fitAddon.fit()
                } catch (e) { }
            }
        })
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current)
        }

        const ipc = (window as any).ipcRenderer
        const cleanupData = ipc.on('terminal-data', (data: string) => {
            if (term && isMounted) term.write(data)
        })

        const cleanupSuggestion = ipc.on('ai-suggestion', (data: any) => {
            if (isMounted) {
                setSuggestion(data)
                // Auto-hide suggestion after 10 seconds
                setTimeout(() => setSuggestion(null), 10000)
            }
        })

        term.writeln('\x1b[33mGalaxy Terminal Initializing...\x1b[0m')

        // Handle Backspace & Typing
        term.onData((data) => {
            if (isMounted) ipc.send('terminal-input', data)
        })

        // Handle Paste (Ctrl+V) and Copy (Ctrl+C)
        term.attachCustomKeyEventHandler((e) => {
            if (e.type === 'keydown') {
                // Ctrl + V (Paste)
                if (e.ctrlKey && e.key === 'v') {
                    navigator.clipboard.readText().then(text => {
                        ipc.send('terminal-input', text);
                    });
                    return false;
                }
                // Ctrl + C (Copy - only if something is selected)
                if (e.ctrlKey && e.key === 'c' && term.hasSelection()) {
                    navigator.clipboard.writeText(term.getSelection());
                    return false;
                }
            }
            return true;
        })

        // Right-Click Context Menu for Copy/Paste
        const handleContextMenu = async (e: MouseEvent) => {
            e.preventDefault();
            if (term.hasSelection()) {
                const selected = term.getSelection();
                await navigator.clipboard.writeText(selected);
                term.clearSelection();
            } else {
                const text = await navigator.clipboard.readText();
                ipc.send('terminal-input', text);
            }
        };

        const terminalEl = terminalRef.current;
        terminalEl?.addEventListener('contextmenu', handleContextMenu);

        const observer = new ResizeObserver(() => {
            if (!isMounted || !terminalRef.current) return
            if (terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
                try { fitAddon.fit() } catch (e) { }
            }
        })
        observer.observe(terminalRef.current)

        return () => {
            isMounted = false
            observer.disconnect()
            terminalEl?.removeEventListener('contextmenu', handleContextMenu);
            cleanupData()
            cleanupSuggestion()
            term.dispose()
            xtermRef.current = null
        }
    }, [isOpen])

    const handleApplyFix = () => {
        if (suggestion) {
            const ipc = (window as any).ipcRenderer
            ipc.send('terminal-input', suggestion.command + '\r\n')
            setSuggestion(null)
        }
    }

    const handleClear = () => {
        xtermRef.current?.clear()
        const ipc = (window as any).ipcRenderer
        // Clears the underlying shell buffer
        ipc.send('terminal-input', 'cls\r\n')
    }

    if (!isOpen) return (
        <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold z-50 transition-all border border-blue-400/30 active:scale-95"
        >
            <TerminalIcon size={16} /> TERMINAL
        </button>
    )

    return (
        <div className="flex flex-col border-t border-slate-800 bg-[#020617] relative w-full h-full">
            {suggestion && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-slate-900/90 border border-blue-500/50 backdrop-blur-xl p-3 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
                            <GalaxyLogo size={20} className="text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-0.5">{suggestion.error}</p>
                            <p className="text-[12px] text-slate-200 font-medium leading-tight">{suggestion.fix}</p>
                        </div>
                        <button
                            onClick={handleApplyFix}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            <Zap size={12} /> APPLY FIX
                        </button>
                        <button onClick={() => setSuggestion(null)} className="text-slate-500 hover:text-white transition-colors p-1">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between px-4 h-9 bg-slate-900/20 border-b border-slate-800/50">
                <div className="flex items-center gap-2">
                    <TerminalIcon size={14} className="text-blue-400" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Interactive Terminal</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const state = (useStore.getState() as any);
                            if (state.activeProject) {
                                (window as any).ipcRenderer.send('terminal-cd', state.activeProject);
                            }
                        }}
                        title="Sync with Project"
                        className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                    >
                        <RefreshCw size={13} />
                    </button>
                    <button onClick={handleClear} title="Clear Terminal" className="p-1.5 text-slate-400 hover:text-white transition-colors">
                        <Trash2 size={13} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>
            <div
                ref={terminalRef}
                className="flex-1 p-2 overflow-hidden"
            />
        </div>
    )
}
