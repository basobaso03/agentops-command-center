import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import agentsRouter from './routes/agents.js';
import chatRouter from './routes/chat.js';
import dashboardRouter from './routes/dashboard.js';
import knowledgebaseRouter from './routes/knowledgebase.js';
import logsRouter from './routes/logs.js';
import workflowsRouter from './routes/workflows.js';

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const rateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);
const rateLimitStore = new Map();

function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.ip || request.socket?.remoteAddress || 'unknown';
}

function corsOriginValidator(origin, callback) {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error('Not allowed by CORS'));
}

function rateLimiter(request, response, next) {
  if (request.path === '/api/health') {
    return next();
  }

  const ip = getClientIp(request);
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || now - current.windowStart >= rateLimitWindowMs) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return next();
  }

  current.count += 1;

  if (current.count > rateLimitMaxRequests) {
    const retryAfterSeconds = Math.ceil((rateLimitWindowMs - (now - current.windowStart)) / 1000);
    response.setHeader('Retry-After', String(Math.max(1, retryAfterSeconds)));
    return response.status(429).json({ error: 'Rate limit exceeded. Please try again shortly.' });
  }

  return next();
}

setInterval(() => {
  const now = Date.now();

  for (const [ip, value] of rateLimitStore.entries()) {
    if (now - value.windowStart >= rateLimitWindowMs) {
      rateLimitStore.delete(ip);
    }
  }
}, rateLimitWindowMs).unref();

app.use(
  cors({
    origin: corsOriginValidator,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);
app.use(express.json());
app.use(rateLimiter);

app.use('/api/agents', agentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/kb', knowledgebaseRouter);
app.use('/api/logs', logsRouter);
app.use('/api/workflows', workflowsRouter);

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (request, response) => {
  response.json({ message: 'AgentOps server scaffold is running.' });
});

app.use((request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

app.use((error, request, response, next) => {
  console.error(error);

  if (String(error?.message || '').includes('Not allowed by CORS')) {
    return response.status(403).json({ error: 'Origin is not allowed.' });
  }

  const statusCode = Number(error?.status || error?.statusCode || 500);

  if (statusCode >= 500) {
    const errorPayload = { error: 'Internal server error' };

    if (process.env.NODE_ENV === 'development') {
      errorPayload.details = String(error?.message || error);
    }

    return response.status(500).json(errorPayload);
  }

  return response.status(statusCode).json({ error: error?.message || 'Request failed' });
});

app.listen(port, () => {
  console.log(`AgentOps server listening on port ${port}`);
});
