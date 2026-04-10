import { EventEmitter } from 'node:events';

const agentLogEmitter = new EventEmitter();

agentLogEmitter.setMaxListeners(0);

export function publishAgentLog(entry) {
  agentLogEmitter.emit('log', entry);
}

export function registerAgentLogStream(response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  response.write(': connected\n\n');

  const heartbeatId = setInterval(() => {
    response.write(': heartbeat\n\n');
  }, 30000);

  const handleLog = (entry) => {
    response.write(`data: ${JSON.stringify(entry)}\n\n`);
  };

  agentLogEmitter.on('log', handleLog);

  const cleanup = () => {
    clearInterval(heartbeatId);
    agentLogEmitter.off('log', handleLog);
  };

  response.on('close', cleanup);
  response.on('finish', cleanup);
}