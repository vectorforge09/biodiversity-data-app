# BioDiversity Explorer

A comprehensive web application for visualizing **live biodiversity data** from the **Global Biodiversity Information Facility (GBIF)**, with a focus on Poland's rich ecosystem.

## 🌟 **NEW: Live GBIF Integration**

This application now connects directly to the GBIF API to provide:
- **Real-time species data** from GBIF's extensive database
- **Live occurrence records** with actual coordinates and dates
- **Current biodiversity statistics** for Poland
- **Authentic taxonomic information** and vernacular names

## Features

### 🔍 Species Search (Live Data)
- Search real species from GBIF database by scientific names
- Search by vernacular/common names in multiple languages
- Real-time results with authentic taxonomic classifications
- Access to over 1.8 million species records

### 🗺️ Geographic Visualization (Real Coordinates)
- Display actual observation locations from GBIF occurrences
- Real coordinates from scientific observations and citizen science
- Geographic distribution across Poland with authentic data points
- Filtered for high-quality, georeferenced records only

### 📊 Temporal Analysis (Historical Data)
- Timeline charts using real observation dates from GBIF
- Historical data spanning decades of scientific observations
- Actual observation frequency patterns over time
- Integration with citizen science and research data

### 📈 Live Statistics
- Real-time biodiversity statistics for Poland from GBIF
- Current species counts and occurrence numbers
- Kingdom-level breakdowns with live data
- Updated statistics with API status monitoring

### 🎨 User Experience
- Responsive design for all device sizes
- Clean, modern interface with intuitive navigation
- Default dashboard with biodiversity statistics
- Featured species showcase
- Loading states and error handling

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Next.js 14** - Full-stack React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI component library
- **Recharts** - Responsive chart library for data visualization
- **Lucide React** - Beautiful icon library

### Backend (API Routes)
- **Next.js API Routes** - Serverless API endpoints
- **TypeScript** - Type-safe backend development
- **RESTful API Design** - Clean, predictable API structure

### Performance Optimizations
- **Client-side caching** - Reduced API calls
- **Lazy loading** - Components loaded on demand
- **Debounced search** - Optimized search performance
- **Responsive images** - Optimized for different screen sizes
- **Code splitting** - Smaller bundle sizes

## Project Structure

\`\`\`
biodiversity-app/
├── app/
│   ├── api/
│   │   └── biodiversity/
│   │       ├── search/route.ts          # GBIF species search integration
│   │       ├── observations/[id]/route.ts   # GBIF occurrence data fetching
│   │       ├── species/[id]/route.ts        # Detailed species information
│   │       └── stats/route.ts               # Live biodiversity statistics
│   ├── globals.css                      # Global styles
│   ├── layout.tsx                       # Root layout
│   └── page.tsx                         # Main application page
├── components/
│   ├── ui/                              # shadcn/ui components
│   ├── species-map.tsx                  # Geographic visualization
│   └── observation-timeline.tsx         # Temporal visualization
├── types/
│   └── biodiversity.ts                  # TypeScript type definitions
└── README.md                            # Project documentation
\`\`\`

## API Endpoints

### Species Search
\`\`\`
GET /api/biodiversity/search?q={query}
\`\`\`
Search for species by scientific or vernacular names.

**Response:**
\`\`\`json
{
  "results": [
    {
      "id": "1",
      "scientificName": "Pinus sylvestris",
      "vernacularName": "Scots Pine",
      "kingdom": "Plantae",
      "family": "Pinaceae"
    }
  ],
  "total": 1
}
\`\`\`

### Species Observations
\`\`\`
GET /api/biodiversity/observations/{speciesId}
\`\`\`
Get observation data for a specific species.

**Response:**
\`\`\`json
{
  "observations": [
    {
      "id": "obs_1_1",
      "speciesId": "1",
      "eventDate": "2023-06-15",
      "decimalLatitude": 52.2297,
      "decimalLongitude": 21.0122,
      "locality": "Warsaw, Poland"
    }
  ],
  "total": 1
}
\`\`\`

### Biodiversity Statistics
\`\`\`
GET /api/biodiversity/stats
\`\`\`
Get general biodiversity statistics for Poland.

## Design Decisions

### 1. **Component Architecture**
- **Modular Design**: Separated concerns with dedicated components for map, timeline, and search
- **Reusable Components**: Used shadcn/ui for consistent design system
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures

### 2. **State Management**
- **React Hooks**: Used useState and useEffect for local component state
- **Prop Drilling**: Simple prop passing for component communication
- **No External State Library**: Kept complexity low for this scope

### 3. **Data Visualization**
- **Canvas for Maps**: Custom canvas implementation for geographic plotting
- **Recharts for Timeline**: Professional charting library for temporal data
- **Responsive Design**: Charts adapt to different screen sizes

### 4. **Performance Considerations**
- **Memoization**: Used useMemo for expensive calculations
- **Debounced Search**: Prevented excessive API calls
- **Lazy Loading**: Components loaded only when needed
- **Optimized Rendering**: Efficient re-rendering strategies

### 5. **User Experience**
- **Progressive Disclosure**: Information revealed as user interacts
- **Loading States**: Clear feedback during data fetching
- **Error Handling**: Graceful degradation when data unavailable
- **Accessibility**: Semantic HTML and ARIA labels

## API Integration Details

### GBIF API Endpoints Used

1. **Species Search**: `https://api.gbif.org/v1/species/search`
   - Searches across scientific and vernacular names
   - Filters for accepted species-level taxa
   - Returns taxonomic hierarchy and classifications

2. **Occurrence Data**: `https://api.gbif.org/v1/occurrence/search`
   - Fetches real observation records for Poland (country=PL)
   - Filters for georeferenced records only
   - Excludes records with geospatial issues

3. **Species Details**: `https://api.gbif.org/v1/species/{key}`
   - Detailed taxonomic information
   - Vernacular names in multiple languages
   - Taxonomic status and classification

4. **Statistics**: `https://api.gbif.org/v1/occurrence/search` (with facets)
   - Live counts of species and occurrences
   - Kingdom-level statistics
   - Real-time data aggregation

### Performance Optimizations

- **Intelligent Caching**: API responses cached for 5-30 minutes depending on data type
- **Request Optimization**: Efficient API calls with proper parameters
- **Error Handling**: Graceful fallbacks when GBIF API is unavailable
- **Rate Limiting**: Respectful API usage following GBIF guidelines
- **Geographic Filtering**: Pre-filtered for Poland coordinates (49-54.5°N, 14.1-24.1°E)

### Data Quality Measures

- **Georeferenced Only**: Only includes records with valid coordinates
- **Quality Filtering**: Excludes records with known geospatial issues
- **Species Level**: Focuses on accepted species-level classifications
- **Country Validation**: Verified Poland-specific records
- **Coordinate Validation**: Bounds checking for Polish territory

## Technical Implementation

### API Route Structure
\`\`\`
/api/biodiversity/
├── search/route.ts              # GBIF species search integration
├── observations/[id]/route.ts   # GBIF occurrence data fetching
├── species/[id]/route.ts        # Detailed species information
└── stats/route.ts               # Live biodiversity statistics
\`\`\`

### Error Handling & Resilience
- Comprehensive error handling for API failures
- Fallback data when GBIF API is unavailable
- User-friendly error messages
- API status monitoring and display
- Automatic retry mechanisms

### Caching Strategy
- **Search Results**: 5 minutes (frequent updates for user experience)
- **Observations**: 10 minutes (balance between freshness and performance)
- **Species Details**: 15 minutes (relatively stable taxonomic data)
- **Statistics**: 30 minutes (aggregate data changes slowly)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd biodiversity-app
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open your browser**
   Navigate to \`http://localhost:3000\`

### Building for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Data Attribution

This application uses data from:
- **GBIF.org** (Global Biodiversity Information Facility)
- **Citizen Science Projects** (iNaturalist, eBird, etc.)
- **Natural History Museums** worldwide
- **Research Institutions** and **Universities**
- **Government Agencies** and **NGOs**

All data is properly attributed to GBIF and original data publishers as per GBIF's data use requirements.

## Usage Examples

### Search Real Species
\`\`\`
Try searching for:
- "Pinus sylvestris" (Scots Pine)
- "Cervus elaphus" (Red Deer) 
- "Lynx lynx" (Eurasian Lynx)
- "Pine" (common name search)
\`\`\`

### Explore Real Data
- Select any species to see actual observation locations
- View real dates from scientific collections and observations
- Explore authentic distribution patterns across Poland

## Usage Guide

### 1. **Species Search**
- Enter a species name in the search bar
- Use either scientific names (e.g., "Pinus sylvestris") or common names (e.g., "Pine")
- Select from the dropdown results to view detailed information

### 2. **Viewing Observations**
- After selecting a species, view its geographic distribution on the map
- Red dots represent observation locations across Poland
- Check the timeline chart to see observation patterns over time

### 3. **Exploring Data**
- Use the default dashboard to see overall biodiversity statistics
- Browse featured species for quick exploration
- Navigate between different species to compare distributions

## Data Sources

This application uses mock data that simulates the structure and patterns of real GBIF (Global Biodiversity Information Facility) data. In a production environment, this would connect to:

- **GBIF API**: \`https://api.gbif.org/v1/\`
- **Species Data**: Taxonomic information and classifications
- **Occurrence Data**: Geographic and temporal observation records

## API Rate Limits & Usage

- Respectful API usage following GBIF guidelines
- Built-in caching to minimize API calls
- User-Agent identification for proper attribution
- No API key required (GBIF's open data policy)

## Future Enhancements

### Technical Improvements
- **Real GBIF Integration**: Connect to actual GBIF API
- **Database Integration**: PostgreSQL with PostGIS for spatial queries
- **Caching Layer**: Redis for improved performance
- **Authentication**: User accounts and saved searches

### Feature Additions
- **Advanced Filtering**: Date ranges, geographic bounds, taxonomic filters
- **Data Export**: CSV/JSON export functionality
- **Comparison Tools**: Side-by-side species comparison
- **Mobile App**: React Native companion app

### Performance Optimizations
- **Server-Side Rendering**: Improved SEO and initial load times
- **CDN Integration**: Faster asset delivery
- **Database Indexing**: Optimized query performance
- **Pagination**: Handle large datasets efficiently

## Contributing to GBIF

This application demonstrates the power of open biodiversity data. Users can contribute to GBIF through:
- **iNaturalist**: Citizen science observations
- **eBird**: Bird observations and checklists
- **Local Museums**: Specimen digitization projects
- **Research Projects**: Scientific data sharing

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **GBIF.org** - For providing free, open access to biodiversity data
- **Data Publishers** - Museums, research institutions, and citizen scientists worldwide
- **GBIF Secretariat** - For maintaining the global biodiversity data infrastructure
- **shadcn/ui** - Beautiful and accessible UI components
- **Recharts** - Powerful charting library for React
- **Tailwind CSS** - Utility-first CSS framework
