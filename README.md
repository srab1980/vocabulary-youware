# AI React Website Template

A flexible, feature-rich React template designed for AI-generated websites with modern development tools and libraries.

## ✨ Key Features

- 🚀 **React 18 + TypeScript** - Modern development experience
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- ⚡ **Vite** - Fast build tool
- 🌐 **i18next** - Complete internationalization solution
- 🎯 **Zustand** - Lightweight state management
- ✨ **Framer Motion** - Smooth animation effects
- 🎭 **Headless UI** - Accessible UI components
- 📦 **Lucide React** - Beautiful icon library
- 🛣️ **React Router** - Single-page application routing

## 🛠️ Tech Stack

### Core Technologies
- React 18.3.1 + TypeScript 5.8.3
- Vite 7.0.0 (Build tool)
- Tailwind CSS 3.4.17 (CSS framework)

### Feature Libraries
- React Router DOM 6.30.1 (Routing)
- Zustand 4.4.7 (State management)
- i18next + react-i18next (Internationalization)
- Framer Motion 11.0.8 (Animations)
- Headless UI 1.7.18 (UI components)
- Lucide React (Icon library)

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Visit http://localhost:5173 to view the application

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview build**:
   ```bash
   npm run preview
   ```

5. **Start backend server**:
   ```bash
   cd backend && npm install && npm run dev
   ```
   The backend will be available at http://127.0.0.1:8787

## 📁 Project Structure

```
src/
├── api/             # API related code
├── assets/          # Static assets
├── components/      # Reusable components
├── layouts/         # Layout components  
├── pages/           # Page components
├── styles/          # Style files
├── types/           # TypeScript type definitions
├── App.tsx          # Main application component
└── main.tsx         # Application entry point
```

## ✨ New Features

### Image Export
The application now supports embedding images directly in exported Excel files. When you export vocabulary, any images associated with words or categories will be embedded in the Excel file rather than just including URLs.

For more details about this feature, see [IMAGE_EXPORT.md](./IMAGE_EXPORT.md).

## More Information

For more detailed project structure, tech stack, configuration instructions and development guide, please refer to the [YOUWARE.md](./YOUWARE.md) file.