# Technology Stack & Build System

## Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom primary color theme (orange-based)
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **File Upload**: React Dropzone
- **HTTP Client**: Axios

## Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **File Upload**: Multer
- **Validation**: Express Validator
- **Environment**: dotenv

## Development Tools
- **Package Manager**: npm
- **Process Manager**: Concurrently (for running frontend/backend together)
- **Dev Server**: Nodemon (backend), Vite dev server (frontend)
- **TypeScript**: Strict mode enabled

## Common Commands

### Development
```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend in development
npm run dev

# Start frontend only
npm run dev:frontend

# Start backend only  
npm run dev:backend
```

### Build & Production
```bash
# Build both frontend and backend
npm run build

# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend

# Start production backend
cd backend && npm start
```

### Project Structure Commands
```bash
# Frontend development server (from frontend/)
npm run dev

# Backend development server (from backend/)
npm run dev

# Preview frontend build (from frontend/)
npm run preview
```

## Environment Configuration
- Backend uses `.env` file for configuration
- MongoDB connection via `MONGODB_URI`
- Server port via `PORT` (defaults to 5000)
- File uploads stored in `/uploads` directory

## API Conventions
- Base API path: `/api`
- RESTful endpoints with proper HTTP methods
- JSON request/response format
- Error handling with consistent error messages in Chinese
- Health check endpoint: `/api/health`