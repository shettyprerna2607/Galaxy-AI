import React, { useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useStore } from '../../store/useStore'
import { Orbit } from 'lucide-react'

export const StarMap: React.FC = () => {
    const { fileTree, openFile, setActiveView } = useStore()

    const graphData = useMemo(() => {
        const nodes: any[] = []
        const links: any[] = []

        const traverse = (tree: any[], parentId?: string) => {
            tree.forEach(node => {
                nodes.push({
                    id: node.path,
                    name: node.name,
                    type: node.type,
                    val: node.type === 'directory' ? 5 : 2
                })

                if (parentId) {
                    links.push({
                        source: parentId,
                        target: node.path,
                        value: 2
                    })
                }

                if (node.children) {
                    traverse(node.children, node.path)
                }
            })
        }

        traverse(fileTree)
        return { nodes, links }
    }, [fileTree])

    const handleNodeClick = async (node: any) => {
        if (node.type === 'file') {
            const content = await (window as any).ipcRenderer.invoke('read-file', node.id)
            openFile(node.id, node.name, content || '')
            setActiveView('editor')
        }
    }

    return (
        <div className="flex-1 bg-[#020617] relative overflow-hidden">
            <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
                <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-xl border border-blue-500/20 px-4 py-2.5 rounded-2xl shadow-2xl">
                    <Orbit className="text-blue-400 animate-pulse" size={20} />
                    <div>
                        <h2 className="text-[13px] font-bold text-slate-100 uppercase tracking-widest font-outfit">Project Galaxy</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Click stars to orbit files</p>
                    </div>
                </div>
            </div>

            <ForceGraph2D
                graphData={graphData}
                backgroundColor="#020617"
                nodeLabel="name"
                nodeRelSize={6}
                nodeColor={(node: any) => node.type === 'directory' ? '#3b82f6' : '#cbd5e1'}
                linkColor={() => '#1e293b'}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                onNodeClick={handleNodeClick}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.name
                    const fontSize = 12 / globalScale
                    ctx.font = `${fontSize}px Inter`
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillStyle = node.type === 'directory' ? '#3b82f6' : '#94a3b8'

                    // Draw outer glow for directory stars
                    if (node.type === 'directory') {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
                        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                        ctx.fill();
                    }

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.type === 'directory' ? '#3b82f6' : '#cbd5e1';
                    ctx.fill();

                    if (globalScale > 2) {
                        ctx.fillText(label, node.x, node.y + 10)
                    }
                }}
            />
        </div>
    )
}
