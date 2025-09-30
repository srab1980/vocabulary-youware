# Vocabulary Learning Application with YouWare Branding

A comprehensive vocabulary learning application built with React, TypeScript, and Cloudflare Workers. This application allows users to import vocabulary spreadsheets, generate AI illustrations for words, and export illustrated vocabulary lists.

## 🌟 Features

- 📚 **Vocabulary Management** - Import, create, edit, and organize vocabulary words
- 🎨 **AI-Generated Illustrations** - Automatically generate images for words using AI
- 📊 **Interactive Tables** - View and manage vocabulary in an interactive table format
- 📤 **Excel Export** - Export vocabulary with embedded images to Excel format
- 🌐 **Multi-language Support** - Support for bilingual vocabulary learning
- ⚡ **Fast Performance** - Built with Vite for rapid development and production builds
- ☁️ **Cloudflare Backend** - Serverless backend with Cloudflare Workers and D1 database
- 🖼️ **ComfyUI Integration** - Generate images using local ComfyUI installations

## 🛠️ Tech Stack

### Frontend
- React 18.3.1 + TypeScript 5.8.3
- Vite 7.0.0 (Build tool)
- Tailwind CSS 3.4.17 (CSS framework)
- Zustand 4.4.7 (State management)
- React Router DOM 6.30.1 (Routing)
- Lucide React (Icon library)
- Framer Motion 11.0.8 (Animations)
- XLSX 0.18.5 (Excel processing)

### Backend
- Cloudflare Workers (Serverless compute)
- Cloudflare D1 (SQLite database)
- Itty Router (Lightweight routing)
- XLSX 0.18.5 (Excel processing)

## 🚀 Quick Start

1. **Install frontend dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Visit http://localhost:5173 to view the application

3. **Install backend dependencies**:
   ```bash
   cd backend && npm install
   ```

4. **Start backend server**:
   ```bash
   npm run dev --prefix backend
   ```
   The backend will be available at http://127.0.0.1:8787

5. **(Optional) Start ComfyUI server**:
   If you want to use ComfyUI for image generation:
   ```bash
   # Install ComfyUI following the official instructions
   # Start ComfyUI server
   python main.py --port 8188
   ```
   ComfyUI will be available at http://127.0.0.1:8188

6. **Build for production**:
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
.
├── src/                 # Frontend source code
│   ├── api/             # API client code
│   ├── assets/          # Static assets
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── store/           # Zustand stores for state management
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── backend/             # Backend source code
│   ├── src/             # Worker source code
│   └── wrangler.toml    # Cloudflare Workers configuration
├── public/              # Public assets
└── dist/                # Production build output
```

## 📤 Excel Import/Export Features

### Import
- Supports Excel (.xlsx, .xls) and CSV files
- Automatically parses bilingual vocabulary spreadsheets
- Preview import before saving to database

### Export
- Export vocabulary lists to Excel format
- Embed images directly in exported files
- Support for large vocabulary lists with character limit protection

## 🎨 AI Image Generation

The application integrates with multiple AI services to automatically generate illustrations for vocabulary words:

### Supported Providers
- **Hugging Face** - Use Stable Diffusion models
- **OpenAI** - Use DALL-E models
- **Qwen** - Use Alibaba's Qwen models
- **ComfyUI** - Use local ComfyUI installations

### ComfyUI Integration
The application can connect to a local ComfyUI instance running on port 8188 to generate images using custom workflows.

To use ComfyUI:
1. Install and run ComfyUI on your local machine
2. Select "ComfyUI" as the image provider in the application
3. (Optional) Provide an API key if your ComfyUI instance requires authentication

The application includes a basic workflow template at `public/comfyui-workflow-template.json` that you can customize for your specific needs.

## 🗄️ Database Structure

The application uses Cloudflare D1 (SQLite) for data storage:
- **Categories** - Organize words into categories
- **Words** - Store vocabulary words with translations and metadata
- **Tags** - Tag words for additional organization

## 🌐 API Endpoints

### Categories
- `GET /api/categories` - Retrieve all categories
- `POST /api/categories` - Create a new category
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category

### Words
- `GET /api/words` - Retrieve all words
- `POST /api/words` - Create a new word
- `PUT /api/words/:id` - Update a word
- `DELETE /api/words/:id` - Delete a word

### Export
- `POST /api/export` - Export vocabulary to Excel format

### AI Providers
- `POST /api/qwen/image` - Proxy for Qwen image generation
- `POST /api/comfyui/image` - Proxy for ComfyUI image generation
- `GET /api/comfyui/result/:promptId` - Poll for ComfyUI generation results

## 📤 Deployment

1. **Frontend Deployment**:
   - Build the application: `npm run build`
   - Deploy the contents of the `dist/` folder to any static hosting service

2. **Backend Deployment**:
   - Navigate to the backend directory: `cd backend`
   - Deploy to Cloudflare Workers: `npm run deploy`

## 📝 Recent Improvements

- Fixed Excel export character limit issues (32,767 character limit)
- Added icon preview functionality for better user experience
- Removed authentication requirements for local development
- Improved error handling and user feedback
- Added ComfyUI integration for local AI image generation

For more detailed technical information, see [YOUWARE.md](./YOUWARE.md).