<div align="center">
  <img width="1200" height="475" alt="FundMe Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  <h1>FundMe - AI-Powered Deal Marketplace</h1>
  <p>Discover and fund exciting opportunities with our intelligent deal platform</p>
  <p><strong>Now with multilingual support for Shona and Ndebele</strong> 🌍</p>
</div>

## 🌟 Features

### Core Functionality
- **AI-Powered Deal Discovery**: Natural language search to find the perfect funding opportunities
- **3D Visualizations**: Interactive 3D representations of deals and funding progress
- **Multilingual Support**: Process queries in English, Shona, and Ndebele
- **Secure Transactions**: Built-in escrow and secure payment processing
- **Real-time Updates**: Live tracking of deals and funding status
- **User Verification**: KYC integration for secure transactions
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## 🏗️ System Architecture

The application follows a modern, event-driven architecture:

```
[User: React App] --(1. Audio/Text Input)--> [Frontend Logic]
       |
       |--(2. Shona/Ndebele?)--> [OLLAMA Server: Translate to English]
       |
       '--(3. English Prompt)--> [Convex Action: askAI]
                                     |
                                     '--(4. Call Gemini API w/ findDeals tool)--> [Google Gemini API]
                                                                                      |
                                     <--(5. Gemini executes tool)--------------------'
                                     |
                                     '--(6. Call Convex Query: findDeals)--> [Convex Database]
                                     |
      <--(9. Final UI Data)--- [Convex Action: askAI] <--(7. Gemini gets data, generates summary)-- [Google Gemini API]
                                     |
      <--(8. Return Data)----------'
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Convex account
- Clerk account
- Google Gemini API key
- (Optional) Self-hosted OLLAMA instance for Shona/Ndebele translation

### Installation

1. Clone the repository:
   ```bash
   git clone [your-repository-url]
   cd FundMe
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with:
   ```env
   VITE_CONVEX_URL=your_convex_url
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   GEMINI_API_KEY=your_gemini_api_key
   # For Shona/Ndebele translation (Phase 3)
   OLLAMA_API_URL=your_ollama_server_url
   ```

### Running Locally

Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **3D Rendering**: Three.js, custom GLSL shaders
- **State Management**: Convex for real-time data
- **Authentication**: Clerk with phone number auth
- **AI Integration**: Google Gemini API
- **Multilingual**: OLLAMA for Shona/Ndebele translation
- **Styling**: Tailwind CSS with Framer Motion
- **Deployment**: Netlify with Convex backend

## 📂 Project Structure

```
FundMe/
├── convex/            # Backend functions and database schema
│   ├── _generated/    # Auto-generated types
│   ├── ai.ts          # AI integration
│   ├── auth.config.js # Auth configuration
│   └── schema.ts      # Database schema
├── public/            # Static assets
├── src/
│   ├── components/    # Reusable UI components
│   ├── lib/           # Utility functions and helpers
│   ├── visual-3d.ts   # 3D visualization logic
│   ├── visual.ts      # Core visualization components
│   ├── store.ts       # Global state management
│   ├── utils.ts       # Helper functions
│   └── index.tsx      # Main application entry point
├── .env.local         # Local environment variables
├── netlify.toml       # Netlify deployment config
└── package.json       # Project dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_CONVEX_URL` | Convex deployment URL | ✅ Yes |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk authentication key | ✅ Yes |
| `GEMINI_API_KEY` | Gemini API key for AI features | ✅ Yes |
| `OLLAMA_API_URL` | URL for OLLAMA translation service | No (for Phase 3) |

## 🚀 Development Phases

### Phase 1: Core UI & Basic AI (Completed)
- [x] React + TypeScript foundation
- [x] 3D visualization components
- [x] Basic AI chat interface
- [x] Deal card components

### Phase 2: Authentication & Deal Management (Completed)
- [x] Clerk authentication
- [x] Convex database integration
- [x] Deal CRUD operations
- [x] AI-powered search

### Phase 3: Multilingual Support (In Progress)
- [ ] OLLAMA server setup
- [ ] Shona/Ndebele translation
- [ ] Language detection

### Phase 4: Payments & KYC (Planned)
- [ ] Payment processing
- [ ] KYC verification
- [ ] Deal funding flow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made with ❤️ by the FundMe Team
</div>
"# FundMe" 
