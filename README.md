# 🌌 Galaxy AI

Galaxy AI is a local AI coding assistant that runs completely offline on your computer. It uses powerful AI models to help you write, fix, and understand code without ever sending your data to the cloud.

---

## ✨ Key Features

-   **🛸 StarMap Visualization**: Experience your codebase as a celestial galaxy. Files and directories are represented as stars in a dynamic 2D force-directed graph. Navigate your project with orbital mechanics.
-   **🤖 Local AI Engine**: Powered by **Ollama**, supporting models like `DeepSeek-Coder`, `Llama 3`, and `Qwen 2.5`. Your code never leaves your machine.
-   **🔍 Semantic Context Search**: Utilizes **LanceDB** (a vector search engine) and `nomic-embed-text` to index your project. Galaxy AI understands the *meaning* of your code, not just keywords.
-   **💻 Pro-Grade Editor**: Integrated **Monaco Editor** (the engine behind VS Code) with full syntax highlighting, intelligent code completion, and inline AI suggestions.
-   **📟 Smart AI Terminal**: A built-in Xterm-based terminal that detects errors (e.g., missing dependencies, Java classpath issues) and provides one-click AI fixes.
-   **💬 Codebase Chat**: A persistent AI chat panel that maintains context across multiple files, allows for multi-turn conversations, and can even automatically create or modify files.
-   **📦 Automated Env Detection**: Intelligent discovery of JDKs and local runtimes to ensure your development environment is always ready.

---
## 🛠️ Tech Stack

### Frontend & UI
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Desktop Core
- **Native Shell**: [Electron 34](https://www.electronjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Terminal**: [Xterm.js](https://xtermjs.org/)

### AI & Data Engine
- **LLM Runtime**: [Ollama](https://ollama.com/)
- **Vector DB**: [LanceDB](https://lancedb.com/)
- **Embeddings**: `nomic-embed-text`
- **Models**: `deepseek-coder:6.7b`, `llama3:8b`, `qwen2.5:7b`
