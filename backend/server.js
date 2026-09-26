const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { findAvailablePort } = require('./utils/portDetector');

// Fix DNS resolution for MongoDB Atlas (querySrv ECONNREFUSED)
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (error) {
  console.warn('Could not set DNS servers:', error.message);
}

dotenv.config();

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT) || 3001;

// Configured allowed origins for CORS
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim());
const defaultDevOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
const corsOrigins = Array.from(new Set([...allowedOrigins, ...defaultDevOrigins]));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS Blocked] Origin: ${origin}`);
    return callback(new Error(`CORS policy error: Origin ${origin} is not allowed`));
  },
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.headers.origin || 'direct/local'}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/institutions', require('./routes/institutions'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/student', require('./routes/student'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/exam-planner', require('./routes/examPlanner'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/profile-requests', require('./routes/profileRequests'));
app.use('/api/notifications', require('./routes/notifications'));

// Root route for easy verification
app.get('/', (req, res) => {
  res.send('✅ Acadivio AI Backend is Running! Access /api endpoints for data.');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Acadivio AI API is running',
    database: 'MongoDB',
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: app.get('port') || DEFAULT_PORT
  });
});

// Get current port (for frontend auto-detection)
app.get('/api/port', (req, res) => {
  res.json({
    port: app.get('port') || DEFAULT_PORT,
    url: `http://localhost:${app.get('port') || DEFAULT_PORT}`
  });
});

const http = require('http');
const { Server } = require('socket.io');

// Start server with automatic port detection and single database connection pool startup
async function startServer() {
  try {
    // Validate required JWT_SECRET at server launch
    if (!process.env.JWT_SECRET) {
      console.error('❌ FATAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
      process.exit(1);
    }

    // Connect to MongoDB ONCE at server startup
    console.log('🔄 Initializing MongoDB database connection...');
    await connectDB();
    console.log('✅ MongoDB connection established successfully!');

    const port = await findAvailablePort(DEFAULT_PORT, 10);

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO with strict CORS origins matching Express config
    const io = new Server(server, {
      cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Make io accessible to routes
    app.set('io', io);

    // Socket.IO connection handler
    io.on('connection', (socket) => {
      console.log(`🔌 New client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    server.listen(port, () => {
      app.set('port', port);
      console.log(`🚀 Acadivio AI Backend API is running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);

      if (port !== DEFAULT_PORT) {
        console.log(`⚠️  Port ${DEFAULT_PORT} was busy, using port ${port} instead`);
        console.log(`💡 Update your frontend .env.local: NEXT_PUBLIC_API_URL=http://localhost:${port}`);
      } else {
        console.log(`✅ Using default port ${DEFAULT_PORT}`);
      }
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} became busy, restart the server to find a new port`);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // Graceful Shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 ${signal} received. Closing HTTP server & MongoDB connection pool...`);
      server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start backend server:', error.message);
    process.exit(1);
  }
}

// Export app for serverless / testing
module.exports = app;

// Only start server if running directly
if (require.main === module) {
  startServer();
}
