# Crawler Screenshot

A web application for capturing screenshots of websites with a crawler backend and a modern web frontend.

## Project Structure

```
crawler-screenshot/
├── crawler-web/     # Next.js frontend application
└── crawler-backend/ # Node.js backend service
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Install dependencies for both frontend and backend:
```bash
npm install
```

### Development

Start the frontend development server:
```bash
npm run dev:frontend
```

Start the backend development server:
```bash
npm run dev:backend
```

### Building for Production

Build the frontend:
```bash
npm run build:frontend
```

Build the backend:
```bash
npm run build:backend
```

### Running in Production

Start the frontend:
```bash
npm run start:frontend
```

Start the backend:
```bash
npm run start:backend
```

## Development Status

### Current Version (v0.1.0)
- Basic functionality implemented
- Frontend with Next.js and Tailwind CSS
- Backend crawler service with Node.js
- Basic screenshot capture functionality
- Basic web interface for operation

### Upcoming Improvements

#### Frontend
- Enhance UI/UX design
  - Improve responsive design
  - Add better loading states
  - Enhance error handling UI
  - Add more interactive feedback
- Add more user-friendly features
  - Better progress visualization
  - Screenshot preview
  - Batch operation support
  - History of captured screenshots

#### Backend
- Improve crawler stability
  - Better error handling and recovery
  - Retry mechanism optimization
  - Memory usage optimization
  - Connection pool management
- Performance enhancements
  - Parallel processing optimization
  - Resource management improvements
  - Caching mechanism
- Add monitoring and logging
  - System health monitoring
  - Detailed operation logs
  - Performance metrics

### Contributing
Feel free to contribute to this project by submitting issues or pull requests.
