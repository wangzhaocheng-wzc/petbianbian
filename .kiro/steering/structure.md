# Project Structure & Organization

## Root Level Structure
```
pet-health-community/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
├── shared/            # Shared TypeScript types and utilities
├── .kiro/             # Kiro AI assistant configuration
├── package.json       # Root package.json with workspace scripts
└── README.md          # Project documentation
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── components/    # Reusable React components
│   │   └── Layout.tsx # Main layout with navigation
│   ├── pages/         # Route-based page components
│   │   ├── Home.tsx
│   │   ├── PoopAnalysis.tsx
│   │   ├── Records.tsx
│   │   ├── Community.tsx
│   │   └── Profile.tsx
│   ├── App.tsx        # Main app component with routing
│   └── main.tsx       # Vite entry point
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Backend Structure (`backend/`)
```
backend/
├── src/
│   ├── models/        # Mongoose data models
│   │   ├── User.ts
│   │   └── Pet.ts
│   ├── routes/        # Express route handlers
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── pets.ts
│   │   ├── analysis.ts
│   │   └── community.ts
│   └── server.ts      # Express server setup
├── uploads/           # File upload storage
├── package.json
├── tsconfig.json
└── .env.example       # Environment variables template
```

## Shared Types (`shared/`)
- `types.ts` - Common TypeScript interfaces used by both frontend and backend
- Includes: User, Pet, PoopRecord, CommunityPost, Comment, HealthAnalysis

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (e.g., `Layout.tsx`, `PoopAnalysis.tsx`)
- **Pages**: PascalCase (e.g., `Home.tsx`, `Profile.tsx`)
- **Models**: PascalCase (e.g., `User.ts`, `Pet.ts`)
- **Routes**: lowercase (e.g., `auth.ts`, `users.ts`)
- **Directories**: lowercase (e.g., `components/`, `models/`)

### Code Conventions
- **Interfaces**: PascalCase with `I` prefix for Mongoose models (e.g., `IUser`, `IPet`)
- **Types**: PascalCase (e.g., `User`, `Pet`, `HealthAnalysis`)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Functions**: camelCase

## Route Organization

### Frontend Routes
- `/` - Home page
- `/analysis` - Poop analysis tool
- `/records` - Health records and statistics
- `/community` - Community posts and social features
- `/profile` - User profile and settings

### Backend API Routes
- `/api/auth` - Authentication endpoints
- `/api/users` - User management
- `/api/pets` - Pet management
- `/api/analysis` - Poop analysis functionality
- `/api/community` - Community features
- `/api/health` - Health check endpoint

## File Upload Organization
- Static files served from `/uploads` endpoint
- Organized by type (avatars, analysis images, community posts)
- File size limit: 10MB for images

## Configuration Files
- **Frontend**: `vite.config.ts`, `tailwind.config.js`
- **Backend**: `tsconfig.json`, `.env`
- **Root**: `package.json` with workspace scripts