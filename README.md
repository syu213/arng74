# ARNG Hand Receipt Tracker

A modern, AI-powered hand receipt management system for Army National Guard units. Transform paper-based DA 2062 forms into searchable digital records with intelligent OCR extraction.

## 🎯 Features

- **📸 Camera Integration**: Direct camera capture with device initialization
- **🤖 AI-Powered OCR**: Gemini AI extracts data from receipt photos
- **📊 Real-time Analytics**: Dashboard with equipment tracking and insights
- **📋 Digital Ledger**: Searchable, filterable receipt database
- **📤 CSV Export**: Export data for PBOs and investigations
- **🔒 Client-Side Only**: All data stored locally on user devices
- **📱 Mobile Ready**: Responsive design for field operations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd arng74

# Install dependencies
npm install

# Configure Gemini API (optional)
cp .env.example .env
# Add your Gemini API key to .env file
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:8080
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## ⚙️ Configuration

### Gemini AI API Setup (Optional but Recommended)

1. **Get API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Create API Key**: Generate a new Gemini API key
3. **Configure**: Add to `.env` file:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

**Without Gemini API**: Manual data entry required for all receipt fields

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React hooks + localStorage
- **Routing**: React Router DOM
- **OCR**: Gemini AI vision API
- **Camera**: WebRTC MediaDevices API

### Project Structure
```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── CameraCapture.tsx   # Direct camera interface
│   ├── CaptureReceipt.tsx   # OCR data extraction
│   ├── Dashboard.tsx       # Analytics overview
│   └── ReceiptLedger.tsx   # Data management table
├── pages/
│   ├── Index.tsx           # Main application
│   └── NotFound.tsx        # 404 page
├── services/
│   └── gemini.ts           # Gemini AI API service
├── types/
│   └── receipt.ts          # TypeScript definitions
└── utils/
    └── storage.ts          # Local storage utilities
```

## 📱 Usage

### 1. Capture Receipt
- Click "Open Camera (AI Enhanced)"
- Grant camera permissions
- Position hand receipt (DA 2062) in frame
- Capture photo

### 2. AI Data Extraction
- Gemini AI automatically extracts:
  - Item name and description
  - Borrower name and rank
  - Transaction date
  - Serial numbers/NSNs
  - Equipment category
  - Condition and notes

### 3. Review & Save
- Verify extracted data
- Edit any fields as needed
- Save to digital ledger

### 4. Manage Data
- **Search**: Find receipts by item, borrower, or date
- **Filter**: Filter by equipment category
- **Export**: Download CSV for reporting
- **Analytics**: View dashboard statistics

## 🗄️ Data Storage

### Current Implementation
- **Location**: Browser localStorage
- **Format**: Base64 encoded images + JSON metadata
- **Scope**: Per-browser, per-device
- **Persistence**: Until browser data is cleared

### Deployment Considerations
- **Vercel/Netlify**: Each user has isolated local storage
- **No Server Costs**: No image storage or processing fees
- **Privacy**: No data transmitted to servers (except Gemini API)
- **Limitations**: Device-specific, not cloud-synced

### Future Storage Options
- Cloud storage integration (AWS S3, Firebase Storage)
- User authentication with cloud sync
- Database persistence
- Multi-device synchronization

## 🎓 Receipt Categories

Supported military equipment categories:
- **Weapons**: Rifles, pistols, machine guns, etc.
- **Optics**: Scopes, night vision, sights
- **Radios/Comms**: Radios, communication equipment
- **PPE**: Body armor, helmets, protective gear
- **Tools**: Maintenance tools, equipment
- **Vehicles**: Trucks, military vehicles
- **Medical**: Medical equipment and supplies
- **Other**: Miscellaneous equipment

## 🔧 Development

### Scripts
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint checking
```

### Environment Variables
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build
npm run build

# Deploy dist/ folder to Netlify
```

### Static Hosting
- Build with `npm run build`
- Upload `dist/` folder contents
- Ensure SPA routing configured

## 📋 Troubleshooting

### Camera Issues
- **Permission Denied**: Grant camera permissions in browser
- **Camera Not Found**: Ensure device has working camera
- **Black Screen**: Try refreshing and re-granting permissions

### Gemini API Issues
- **404 Error**: Check API key and model availability
- **Rate Limits**: Free tier has usage limits
- **Processing Failed**: Check network connection

### Data Issues
- **Lost Receipts**: Check if browser data was cleared
- **Export Problems**: Ensure receipts exist before exporting

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests if applicable
5. Submit pull request

## 📄 License

This project is for military and educational use.

## 🎖️ Military Context

Built specifically for Army National Guard units to:
- Eliminate paper-based receipt tracking
- Accelerate causative research from hours to seconds
- Provide digital audit trails for equipment accountability
- Support PBO investigations and property management

**Primary Use Case**: Transforming the traditional DA 2062 hand receipt process into an efficient, searchable digital system.
