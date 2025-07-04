# BioDiversity Explorer

A comprehensive web application for visualizing biodiversity data from the Global Biodiversity Information Facility (GBIF), focused on Poland's rich ecosystem.

## 🌟 Features

- **Species Search**: Search by scientific or vernacular names
- **Interactive Maps**: Geographic distribution visualization
- **Timeline Charts**: Observation frequency over time
- **Real-time Data**: Live integration with GBIF API
- **Responsive Design**: Works on all devices
- **Fallback Mode**: Demo data when backend is unavailable

## 🏗️ Architecture

### Frontend (Next.js + React)
- **Framework**: Next.js 14 with App Router
- **UI Components**: shadcn/ui with Tailwind CSS
- **Charts**: Recharts for data visualization
- **State Management**: React hooks with custom API hooks
- **TypeScript**: Full type safety

### Backend (FastAPI + Python)
- **Framework**: FastAPI with async/await
- **External API**: GBIF REST API integration
- **Data Processing**: Real-time data transformation
- **Error Handling**: Comprehensive error management
- **Documentation**: Auto-generated OpenAPI docs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ and pip

### 1. Start the Backend

\`\`\`bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
\`\`\`

The FastAPI backend will be available at:
- API: http://localhost:8000
- Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 2. Start the Frontend

\`\`\`bash
npm install
npm run dev
\`\`\`

The Next.js frontend will be available at:
- Application: http://localhost:3000

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
\`\`\`

### Backend Configuration

The backend automatically configures:
- CORS for frontend communication
- GBIF API integration
- Poland geographic bounds filtering
- Request timeout and retry logic

## 📊 API Endpoints

### Species Search
\`\`\`
GET /api/v1/species/search?q={query}&limit={limit}
\`\`\`

### Species Observations
\`\`\`
GET /api/v1/species/{species_id}/observations?limit={limit}
\`\`\`

### Species Details
\`\`\`
GET /api/v1/species/{species_id}
\`\`\`

### Biodiversity Statistics
\`\`\`
GET /api/v1/stats
\`\`\`

### Health Check
\`\`\`
GET /health
\`\`\`

## 🧪 Testing

### Backend Tests
\`\`\`bash
cd backend
python -m pytest tests/ -v
\`\`\`

### Frontend Type Checking
\`\`\`bash
npm run type-check
\`\`\`

## 🎯 Usage Examples

### Search for Species
1. Enter a species name (e.g., "Pinus sylvestris" or "Eagle")
2. Select from search results
3. View geographic distribution and timeline

### Explore Data
- **Map View**: See where species have been observed
- **Timeline**: Understand observation patterns over time
- **Statistics**: Overview of Poland's biodiversity

## 🔄 Fallback Mode

When the FastAPI backend is unavailable:
- Frontend automatically switches to demo mode
- Uses realistic mock data for demonstration
- Shows clear status indicators
- Provides setup instructions

## 🛠️ Development

### Project Structure
\`\`\`
├── app/                    # Next.js app directory
├── components/            # React components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── types/                # TypeScript definitions
├── backend/              # FastAPI backend
│   ├── main.py          # FastAPI application
│   ├── tests/           # Backend tests
│   └── requirements.txt # Python dependencies
└── README.md
\`\`\`

### Key Components
- **API Client** (`lib/api.ts`): Handles all backend communication
- **Custom Hooks** (`hooks/use-api.ts`): React state management for API calls
- **Species Map** (`components/species-map.tsx`): Canvas-based map visualization
- **Timeline Chart** (`components/observation-timeline.tsx`): Recharts integration

## 🌍 Data Sources

- **Primary**: GBIF (Global Biodiversity Information Facility)
- **Geographic Scope**: Poland (49-54.5°N, 14.1-24.1°E)
- **Data Types**: Species records, occurrence observations, taxonomic information

## 📈 Performance

- **Caching**: Intelligent caching with fallback mechanisms
- **Debouncing**: Search input debouncing to reduce API calls
- **Error Handling**: Graceful degradation with retry logic
- **Responsive**: Optimized for various screen sizes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **GBIF.org** - Global Biodiversity Information Facility
- **shadcn/ui** - Beautiful UI components
- **FastAPI** - Modern Python web framework
- **Next.js** - React framework for production
