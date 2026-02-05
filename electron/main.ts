import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import * as ai from './services/ai.js'
import * as indexing from './services/indexing.js'
import { spawn } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? (process.env.DIST || '') : path.join((process.env.DIST || ''), '../public')

let win: BrowserWindow | null
let shellProcess: any | null = null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
        webPreferences: {
            preload: fs.existsSync(path.join(__dirname, 'preload.mjs'))
                ? path.join(__dirname, 'preload.mjs')
                : path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        titleBarStyle: 'hidden',
        width: 1280,
        height: 800,
        backgroundColor: '#020617'
    })

    if (VITE_DEV_SERVER_URL) {
        console.log('Loading Dev Server:', VITE_DEV_SERVER_URL)
        win.loadURL(VITE_DEV_SERVER_URL)
        win.webContents.openDevTools()

        // INTERACTIVE SPAWN TERMINAL 
        const shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash'
        console.log(`Terminal: Spawning ${shell}...`)

        // Locate the Java installation directory
        let initialJavaPath = '';
        try {
            const javaRoot = 'C:\\Program Files\\Java';
            if (fs.existsSync(javaRoot)) {
                const entries = fs.readdirSync(javaRoot);
                const jdk = entries.sort().reverse().find(e => e.startsWith('jdk'));
                if (jdk) {
                    const binPath = path.join(javaRoot, jdk, 'bin');
                    if (fs.existsSync(binPath)) initialJavaPath = binPath;
                }
            }
        } catch (e) { }

        shellProcess = spawn(shell, [], {
            cwd: process.cwd(),
            env: { ...process.env, TERM: 'xterm-256color' },
            shell: false
        })

        // Preload the Java path into the environment
        if (initialJavaPath && os.platform() === 'win32') {
            shellProcess.stdin.write(`set PATH=${initialJavaPath};%PATH%\r\n`);
            shellProcess.stdin.write(`cls\r\n`);
        }

        shellProcess.stdout.on('data', (data: Buffer | string) => {
            const output = data.toString()
            win?.webContents.send('terminal-data', output)
            detectErrors(output)
        })

        shellProcess.stderr.on('data', (data: Buffer | string) => {
            const output = data.toString()
            win?.webContents.send('terminal-data', output)
            detectErrors(output)
        })


        const detectErrors = (log: string) => {
            // Pattern 1: Command not recognized
            if (log.includes('is not recognized') || log.includes('command not found')) {
                if (log.toLowerCase().includes('javac') || log.toLowerCase().includes('java')) {
                    win?.webContents.send('ai-suggestion', {
                        error: "Java Compiler (JDK) Not Found",
                        fix: "It seems Java isn't in your PATH. Do you want to check if any Java version is installed?",
                        command: "java -version"
                    })
                } else {
                    win?.webContents.send('ai-suggestion', {
                        error: "Command Not Found",
                        fix: "I see that command isn't working. Should I check if Python is installed or try an alternative command?",
                        command: "py --version"
                    })
                }
            }
            // Pattern 2: Missing Python module
            if (log.includes('ModuleNotFoundError: No module named')) {
                const moduleMatch = log.match(/named ['"](.*)['"]/);
                const moduleName = moduleMatch ? moduleMatch[1] : 'required module';
                win?.webContents.send('ai-suggestion', {
                    error: `Missing Module: ${moduleName}`,
                    fix: `It looks like you're missing '${moduleName}'. Want me to install it for you?`,
                    command: `pip install ${moduleName}`
                })
            }
            // Pattern 3: Java Class Not Found
            if (log.includes('ClassNotFoundException') || log.includes('Could not find or load main class')) {
                const classMatch = log.match(/load main class (.*)/) || log.match(/Exception: (.*)/);
                const className = classMatch ? classMatch[1].trim() : 'the class';
                win?.webContents.send('ai-suggestion', {
                    error: "Java Runtime Error",
                    fix: `Java can't find '${className}'. Did you remember to compile it first with 'javac'?`,
                    command: `javac ${className}.java`
                })
            }
        }

        ipcMain.on('terminal-input', (_, data) => {
            if (shellProcess.stdin && shellProcess.stdin.writable) {
                shellProcess.stdin.write(data)
            }
        })

        // Give it a tiny kick to show the prompt
        setTimeout(() => {
            if (shellProcess.stdin && shellProcess.stdin.writable) {
                shellProcess.stdin.write('\r\n')
            }
        }, 1000)

        app.on('before-quit', () => {
            shellProcess.kill()
        })
    } else {
        win.loadFile(path.join(process.env.DIST || '', 'index.html'))
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(() => {
    createWindow();

    // AI Health Check Loop
    setInterval(async () => {
        if (!win || win.isDestroyed()) return;
        const available = await ai.isAvailable();
        const info = await ai.getModelInfo();
        win.webContents.send('ai-health', {
            status: available ? 'online' : 'offline',
            model: info.name
        });
    }, 10000);
});

// IPC Handlers
ipcMain.on('terminal-cd', (_, projectPath: string) => {
    if (shellProcess) {
        try {
            shellProcess.kill()
        } catch (e) { }
        shellProcess = null
    }

    setTimeout(() => {
        // Use Command Prompt on Windows for more reliable command parsing
        const shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash'
        console.log(`Terminal: Respawning in ${projectPath}...`)

        // Search for existing JDK installations to ensure tool availability
        let autoJavaPath = '';
        try {
            const javaRoot = 'C:\\Program Files\\Java';
            if (fs.existsSync(javaRoot)) {
                const entries = fs.readdirSync(javaRoot);
                // Select the most recent JDK version found
                const jdk = entries.sort().reverse().find(e => e.startsWith('jdk'));
                if (jdk) {
                    const binPath = path.join(javaRoot, jdk, 'bin');
                    if (fs.existsSync(binPath)) {
                        autoJavaPath = binPath;
                        console.log('Galaxy AI found Java at:', autoJavaPath);
                    }
                }
            }
        } catch (e) {
            console.error('Java Discovery Failed:', e);
        }

        shellProcess = spawn(shell, [], {
            cwd: projectPath,
            env: { ...process.env, TERM: 'xterm-256color' },
            shell: false
        })

        // Inject the detected Java path into the current shell session
        if (autoJavaPath && os.platform() === 'win32') {
            const setPath = `set PATH=${autoJavaPath};%PATH%`;
            shellProcess.stdin.write(`${setPath}\r\n`);
            shellProcess.stdin.write(`cls\r\n`);
        }

        shellProcess.stdout.on('data', (data: Buffer | string) => {
            if (win && !win.isDestroyed()) win.webContents.send('terminal-data', data.toString())
        })

        // Update the UI with the detected environment information
        if (autoJavaPath) {
            setTimeout(() => {
                if (win && !win.isDestroyed()) {
                    // Notify terminal of detected environment configuration
                    win.webContents.send('terminal-data', `\r\n\x1b[32mEnvironment configured: ${autoJavaPath}\x1b[0m\r\n`)
                    // Store path for use by compilation commands
                    win.webContents.send('java-home', autoJavaPath)
                }
            }, 500);
        }
        shellProcess.stderr.on('data', (data: Buffer | string) => {
            if (win && !win.isDestroyed()) win.webContents.send('terminal-data', data.toString())
        })

        if (win && !win.isDestroyed()) {
            win.webContents.send('terminal-data', `\r\n\x1b[36mProject directory synchronized: ${projectPath}\x1b[0m\r\n\r\n`)
        }
    }, 100)
})

ipcMain.handle('get-file-tree', async (_, projectPath: string) => {
    const getTree = (dir: string, depth = 0): any[] => {
        if (depth > 8) return []
        try {
            const files = fs.readdirSync(dir)
            const result: any[] = []
            for (const file of files) {
                const filePath = path.join(dir, file)
                try {
                    const stats = fs.statSync(filePath)
                    if (file === '.git' || file === 'node_modules/.bin') continue

                    if (stats.isDirectory()) {
                        // For node_modules we only go 1 level deep unless it's the root one
                        const children = (file === 'node_modules' && depth > 0) ? [] : getTree(filePath, depth + 1)
                        result.push({ name: file, path: filePath, type: 'directory', children })
                    } else {
                        result.push({ name: file, path: filePath, type: 'file' })
                    }
                } catch (e) { }
            }
            return result.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1))
        } catch (err) {
            return []
        }
    }
    try {
        const rootName = path.basename(projectPath)
        const children = getTree(projectPath)
        // Return as a single root node for the VS Code look
        return [{ name: rootName, path: projectPath, type: 'directory', children, isRoot: true }]
    } catch (err) { return [] }
})

ipcMain.handle('open-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    return canceled ? null : filePaths[0]
})

ipcMain.handle('read-file', async (_, filePath: string) => {
    try { return fs.readFileSync(filePath, 'utf-8') } catch { return null }
})

ipcMain.handle('save-file', async (_, { filePath, content }: { filePath: string; content: string }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
})

ipcMain.handle('create-file', async (_, filePath: string) => {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '', 'utf-8')
            return { success: true }
        }
        return { success: false, error: 'File already exists' }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
})

ipcMain.handle('create-folder', async (_, folderPath: string) => {
    try {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true })
            return { success: true }
        }
        return { success: false, error: 'Folder already exists' }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
})

ipcMain.handle('index-project', async (event, projectPath: string) => {
    try {
        await indexing.indexProject(projectPath, (msg) => event.sender.send('indexing-progress', msg))
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('search-code', async (_, query: string) => {
    try { return await indexing.searchCode(query) } catch { return [] }
})

ipcMain.handle('inline-predict', async (_, codePrefix: string) => {
    try {
        return await ai.predict(codePrefix)
    } catch {
        return ''
    }
})

ipcMain.handle('chat', async (_, messages: any[], projectContext: string) => {
    try {
        console.log('Main: Chat request received...')
        let finalMessages = [...messages]
        if (projectContext) {
            finalMessages.unshift({
                role: 'system',
                content: `You are Galaxy AI, a senior full-stack engineer. Focus on clean code. Context: \n\n${projectContext}`
            })
        }
        const aiResponse = await ai.chat(finalMessages)
        console.log('Main: AI Response successfully retrieved.')
        return { role: 'assistant', content: aiResponse.content || aiResponse }
    } catch (error: any) {
        console.error('Main: Chat Handler Error:', error.message)
        return { role: 'assistant', content: `Sorry, I hit a snag: ${error.message}` }
    }
})
