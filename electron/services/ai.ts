const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

export interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export async function isAvailable() {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`).catch(() => null);
        return response && response.ok;
    } catch { return false; }
}

export async function getModelInfo() {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            signal: AbortSignal.timeout(3000)
        })

        if (!response.ok) return { id: 'deepseek-coder:6.7b', name: 'DeepSeek Coder 6.7B' }

        const data = await response.json() as any
        const models = data.models.map((m: any) => m.name)

        const priorities = [
            { id: 'deepseek-coder:6.7b', label: 'DeepSeek 6.7B' },
            { id: 'llama3:8b', label: 'Llama 3 8B' },
            { id: 'deepseek-coder:latest', label: 'DeepSeek' },
            { id: 'llama3:latest', label: 'Llama 3' },
            { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B' }
        ];

        for (const p of priorities) {
            if (models.includes(p.id)) return { id: p.id, name: p.label };
        }

        return { id: models[0] || 'deepseek-coder:6.7b', name: models[0]?.split(':')[0] || 'Local Model' }
    } catch (e) {
        return { id: 'deepseek-coder:6.7b', name: 'DeepSeek 6.7B' }
    }
}

async function getAvailableModel() {
    return (await getModelInfo()).id;
}

export async function chat(messages: Message[]) {
    const model = await getAvailableModel()
    console.log(`AI: Using model "${model}" for chat...`)

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: `You are Galaxy AI, a world-class Senior Software Engineer.
                        - You provide clean, modern, and efficient code.
                        - You think step-by-step and explain your logic briefly.
                        - If the user needs a file created, you MUST respond ONLY with this JSON: {"action": "create_file", "path": "filename.ext", "content": "..."}.
                        - You are professional, proactive, and always aim for production-grade quality.`
                    },
                    ...messages
                ],
                stream: false
            }),
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(120000) // Increased to 2 minutes for large code generation
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`Ollama Error: ${text.slice(0, 100)}`)
        }

        const data = await response.json() as any
        return data.message
    } catch (error: any) {
        console.error('AI Chat Error:', error.message)
        throw error
    }
}

export async function predict(codePrefix: string) {
    const model = await getAvailableModel()
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            body: JSON.stringify({
                model,
                prompt: `Complete this code (provide only the code completion, no explanation):\n\n${codePrefix}`,
                stream: false,
                options: {
                    num_predict: 20, // Keep it short and fast
                    temperature: 0.1,
                }
            }),
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(2000) // Fast timeout for inline ghost text
        })

        if (!response.ok) return ''
        const data = await response.json() as any
        return data.response.trim()
    } catch (error) {
        return ''
    }
}

export async function generateEmbeddings(text: string) {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
            method: 'POST',
            body: JSON.stringify({ model: 'nomic-embed-text:latest', prompt: text }),
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) return []
        const data = await response.json() as any
        return data.embedding || []
    } catch (error) {
        return []
    }
}
