import * as lancedb from '@lancedb/lancedb'
import fs from 'node:fs'
import path from 'node:path'
import { glob } from 'glob'
import { generateEmbeddings } from './ai.js'

let db: lancedb.Connection | null = null
let table: lancedb.Table | null = null

const DB_PATH = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share'), 'galaxy-ai/vectors')

export async function initDB() {
    try {
        if (!fs.existsSync(path.dirname(DB_PATH))) {
            fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
        }
        db = await lancedb.connect(DB_PATH)
    } catch (e) {
        console.error('Indexing: DB Init failed:', e)
    }
}

export async function indexProject(projectPath: string, onProgress?: (msg: string) => void) {
    try {
        if (!db) await initDB()
        if (!db) return

        onProgress?.('Scanning files...')
        const files = await glob('**/*.{ts,tsx,js,jsx,py,java,c,cpp,h,go,rs,css,html}', {
            cwd: projectPath,
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/dist-electron/**'],
            absolute: true
        })

        const results = []
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            onProgress?.(`Processing ${i + 1}/${files.length}`)

            const content = fs.readFileSync(file, 'utf-8')
            if (content.length > 5000) continue // Skip very large files to avoid hanging

            const chunks = [content.slice(0, 500)] // Just index the first 500 chars for now for speed
            for (const chunk of chunks) {
                try {
                    const embedding = await generateEmbeddings(chunk)
                    results.push({
                        vector: embedding,
                        text: chunk,
                        path: file,
                        filename: path.basename(file)
                    })
                } catch (e) {
                    console.warn(`Indexing: Could not generate embedding for ${file}`)
                }
            }
        }

        if (results.length > 0) {
            table = await db.createTable('code_snippets', results, { mode: 'overwrite' })
        }
        onProgress?.('Indexing complete!')
    } catch (error) {
        console.error('Indexing: Project indexing failed:', error)
        onProgress?.('Indexing failed')
    }
}

export async function searchCode(query: string, limit: number = 3) {
    try {
        if (!table) return []
        const queryEmbedding = await generateEmbeddings(query)
        const results = await table.search(queryEmbedding).limit(limit).toArray()
        return results
    } catch (e) {
        console.error('Indexing: Search failed:', e)
        return []
    }
}
