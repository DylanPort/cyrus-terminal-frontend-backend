////////////////////////////////////////////////////
// server.js
////////////////////////////////////////////////////
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { createLogger, format, transports } = require('winston');

// Load environment
dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Static folder
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Logger
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(logsDir, 'server.log') })
  ]
});

// ========== Global In-Memory DB Arrays ==========
let tokens = [];
let agents = [];

// ========== DB Load/Save Helpers ==========
const dbFilePath = path.join(__dirname, 'db.json');

function loadDbOnce() {
  console.log(`\n[DEBUG] loadDbOnce() called - Loading DB from: ${dbFilePath}`);
  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      tokens = parsed.tokens || [];
      agents = parsed.agents || [];
      logger.info(`Database loaded from db.json with ${tokens.length} tokens and ${agents.length} agents`);
      console.log(`[DEBUG] Loaded ${tokens.length} tokens, ${agents.length} agents from db.json\n`);
    } catch (err) {
      logger.error(`Error reading db.json: ${err.message}`);
      tokens = [];
      agents = [];
    }
  } else {
    // If file not exist, initialize empty
    tokens = [];
    agents = [];
    logger.info('db.json not found, starting with empty in-memory DB.');
    console.log('[DEBUG] db.json not found - using empty arrays\n');
  }
}

function saveDb() {
  console.log(`[DEBUG] saveDb() called - Saving ${tokens.length} tokens, ${agents.length} agents to: ${dbFilePath}`);
  try {
    const data = { tokens, agents };
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
    logger.info('Database saved to db.json');
  } catch (err) {
    logger.error(`Error writing to db.json: ${err.message}`);
  }
}

// Call loadDbOnce() when server starts
loadDbOnce();

// Agent process simulation (optional)
const agentProcesses = new Map();
const agentLogsDir = path.join(logsDir, 'agentLogs');
if (!fs.existsSync(agentLogsDir)) {
  fs.mkdirSync(agentLogsDir, { recursive: true });
  logger.info(`Created agent log directory at ${agentLogsDir}`);
}

function appendAgentLog(agentId, type, message) {
  const logFilePath = path.join(agentLogsDir, `${agentId}.log`);
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type.toUpperCase()}]: ${message}\n`;
  fs.appendFile(logFilePath, logEntry, err => {
    if (err) logger.error(`Failed to write log for Agent ${agentId}: ${err.message}`);
  });
}

function startAgentProcess(agent) {
  if (agentProcesses.has(agent.id)) {
    logger.warn(`Agent ${agent.username} is already running.`);
    return;
  }
  logger.info(`Starting AI Agent: ${agent.username} (ID: ${agent.id})`);
  const intervalId = setInterval(() => {
    const msg = `Agent ${agent.username} (${agent.id}) processing at ${new Date().toLocaleTimeString()}`;
    logger.info(msg);
    agent.logs.push({
      type: 'output',
      message: msg,
      timestamp: new Date()
    });
    appendAgentLog(agent.id, 'output', msg);
  }, 5000);
  agentProcesses.set(agent.id, intervalId);
  logger.info(`Agent ${agent.username} started successfully.`);
}

function stopAgentProcess(agent) {
  if (!agentProcesses.has(agent.id)) {
    logger.warn(`Agent ${agent.username} is not running.`);
    return;
  }
  logger.info(`Stopping AI Agent: ${agent.username} (ID: ${agent.id})`);
  clearInterval(agentProcesses.get(agent.id));
  agentProcesses.delete(agent.id);
  const stopMsg = `Agent ${agent.username} stopped at ${new Date().toLocaleTimeString()}`;
  agent.logs.push({
    type: 'output',
    message: stopMsg,
    timestamp: new Date()
  });
  appendAgentLog(agent.id, 'output', stopMsg);
  logger.info(`Agent ${agent.username} stopped successfully.`);
}

// =======================================
//               Token Endpoints
// =======================================

app.post('/api/tokens', (req, res) => {
  try {
    console.log('[DEBUG] /api/tokens POST - Creating new token...');
    const { title, ticker, description, imageUrl, twitterLink, websiteLink, telegramLink } = req.body;
    if (
      !title || typeof title !== 'string' ||
      !ticker || typeof ticker !== 'string' ||
      !description || typeof description !== 'string' ||
      !imageUrl || typeof imageUrl !== 'string'
    ) {
      console.log('[DEBUG] Token creation failed - Missing fields');
      return res.status(400).json({ success: false, message: 'Invalid data for token creation.' });
    }

    const existing = tokens.find(t => t.ticker.toLowerCase() === ticker.toLowerCase());
    if (existing) {
      console.log('[DEBUG] Token creation failed - Ticker already exists');
      return res.status(400).json({ success: false, message: 'Ticker symbol already exists.' });
    }

    const newToken = {
      id: uuidv4(),
      title,
      ticker,
      description,
      imageUrl,
      twitterLink: twitterLink || null,
      websiteLink: websiteLink || null,
      telegramLink: telegramLink || null,
      upvotes: 0,
      comments: [],
      views: 0,
      solTarget: 20, // default target of 20 SOL
      collectiveSOL: 0,
      upvotedWallets: [],
      migrated: false,
      committedWallets: []
    };
    tokens.push(newToken);

    // SAVE
    saveDb();

    console.log(`[DEBUG] Token created: ${newToken.ticker}, now have ${tokens.length} tokens total.`);
    return res.status(201).json({
      success: true,
      token: newToken,
      message: 'Token created successfully.',
      userBalance: 1000
    });
  } catch (e) {
    logger.error(`Create Token Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
});

app.get('/api/tokens', (req, res) => {
  try {
    console.log('[DEBUG] /api/tokens GET - Returning all tokens:', tokens.length);
    return res.status(200).json({
      success: true,
      tokens,
      userBalance: 1000
    });
  } catch (e) {
    logger.error(`Get All Tokens Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/api/tokens/:tokenId/upvote', (req, res) => {
  try {
    console.log('[DEBUG] /api/tokens/:tokenId/upvote POST...');
    const { tokenId } = req.params;
    const { walletId } = req.body;
    if (!walletId || typeof walletId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid walletId' });
    }
    const token = tokens.find(t => t.id === tokenId);
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }
    if (token.upvotedWallets.includes(walletId)) {
      return res.status(400).json({ success: false, message: 'Already upvoted this token.' });
    }
    token.upvotes += 1;
    token.upvotedWallets.push(walletId);

    // SAVE
    saveDb();
    console.log(`[DEBUG] Upvoted token: ${token.ticker}, total upvotes: ${token.upvotes}`);

    return res.status(200).json({
      success: true,
      token,
      message: 'Token upvoted successfully.'
    });
  } catch (e) {
    logger.error(`Upvote Token Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/api/tokens/:tokenId/commit', (req, res) => {
  try {
    console.log('[DEBUG] /api/tokens/:tokenId/commit POST...');
    const { tokenId } = req.params;
    const { walletId, amount } = req.body;
    if (!walletId || typeof walletId !== 'string' || !amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid commit data.' });
    }
    const token = tokens.find(t => t.id === tokenId);
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found.' });
    }
    if (token.collectiveSOL >= token.solTarget) {
      return res.status(400).json({ success: false, message: 'Token already reached its SOL target.' });
    }
    token.collectiveSOL += amount;
    token.committedWallets.push({ walletId, amount });

    // If hits target => set migrated
    if (token.collectiveSOL >= token.solTarget) {
      token.migrated = true;
    }

    // SAVE
    saveDb();
    console.log(`[DEBUG] Committed ${amount} SOL to ${token.ticker}. Current total: ${token.collectiveSOL}`);

    return res.status(200).json({
      success: true,
      token,
      userBalance: 1000 - amount,
      message: `Committed ${amount} SOL to ${token.title}.`
    });
  } catch (e) {
    logger.error(`Commit SOL Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Refund entire commit => minus fees, only if collectiveSOL<solTarget
app.post('/api/tokens/:tokenId/refund', (req, res) => {
  try {
    console.log('[DEBUG] /api/tokens/:tokenId/refund POST...');
    const { tokenId } = req.params;
    const { walletId } = req.body;
    if (!walletId || typeof walletId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid walletId for refund.' });
    }
    const token = tokens.find(t => t.id === tokenId);
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found.' });
    }
    // if token already at/above target => no refunds
    if (token.collectiveSOL >= token.solTarget) {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund, token already reached target'
      });
    }
    const commitEntry = token.committedWallets.find(c => c.walletId === walletId);
    if (!commitEntry) {
      return res.status(400).json({
        success: false,
        message: 'You have not committed anything on this token.'
      });
    }
    const amount = commitEntry.amount;
    token.collectiveSOL -= amount;
    if (token.collectiveSOL < 0) token.collectiveSOL = 0;
    token.committedWallets = token.committedWallets.filter(c => c.walletId !== walletId);

    const fee = 0.01 * amount;
    const refunded = amount - fee;

    // SAVE
    saveDb();
    console.log(`[DEBUG] Refunded ${refunded} SOL (fee=${fee}) for ${token.ticker}. New total: ${token.collectiveSOL}`);

    return res.status(200).json({
      success: true,
      token,
      refunded,
      fee,
      message: 'Refunded successfully.'
    });
  } catch (e) {
    logger.error(`Refund SOL Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Trending => top 5 by upvotes
app.get('/api/tokens/trending', (req, res) => {
  try {
    console.log('[DEBUG] /api/tokens/trending GET...');
    const trending = [...tokens].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5);
    return res.status(200).json({ success: true, trending });
  } catch (e) {
    logger.error(`Get Trending Tokens Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Add comment
app.post('/api/tokens/:tokenId/comments', (req, res) => {
  try {
    console.log('[DEBUG] /api/tokens/:tokenId/comments POST...');
    const { tokenId } = req.params;
    const { user, comment } = req.body;
    if (!user || typeof user !== 'string' || !comment || typeof comment !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid comment data.' });
    }
    const token = tokens.find(t => t.id === tokenId);
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found.' });
    }
    const newComment = {
      user,
      comment,
      timestamp: new Date(),
      replies: []
    };
    token.comments.push(newComment);

    // SAVE
    saveDb();
    console.log(`[DEBUG] Added comment by ${user} to ${token.ticker}. Total comments: ${token.comments.length}`);

    return res.status(201).json({
      success: true,
      comment: newComment,
      message: 'Comment added successfully.'
    });
  } catch (e) {
    logger.error(`Add Comment Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

////////////////////////////////////////////////////
// AI Agents
////////////////////////////////////////////////////
app.post('/api/agents/create', async (req, res) => {
  try {
    console.log('[DEBUG] /api/agents/create POST...');
    const { publicKey, email, username, password, character } = req.body;
    if (!publicKey || !email || !username || !password || !character) {
      return res.status(400).json({ success: false, message: 'Invalid agent data.' });
    }
    const found = agents.find(a => a.username === username && a.publicKey === publicKey);
    if (found) {
      return res.status(400).json({ success: false, message: 'Agent username already exists for this user.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const newAgent = {
      id: uuidv4(),
      publicKey,
      email,
      username,
      password: hashed,
      character,
      running: false,
      logs: []
    };
    agents.push(newAgent);

    // SAVE
    saveDb();
    console.log(`[DEBUG] Created AI Agent: ${username}, total agents: ${agents.length}`);

    return res.status(201).json({ success: true, agent: newAgent, message: 'AI Agent created successfully.' });
  } catch (e) {
    logger.error(`Create AI Agent Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/agents', (req, res) => {
  try {
    console.log('[DEBUG] /api/agents GET...');
    const { publicKey } = req.query;
    if (!publicKey) {
      return res.status(400).json({ success: false, message: 'Public Key required.' });
    }
    const userAgents = agents.filter(a => a.publicKey === publicKey);
    console.log(`[DEBUG] Found ${userAgents.length} agents for publicKey=${publicKey}`);
    return res.status(200).json({ success: true, agents: userAgents });
  } catch (e) {
    logger.error(`Get Agents Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/agents/start', (req, res) => {
  try {
    console.log('[DEBUG] /api/agents/start POST...');
    const { publicKey, agentId } = req.body;
    if (!publicKey || !agentId) {
      return res.status(400).json({ success: false, message: 'PublicKey and agentId required' });
    }
    const agent = agents.find(a => a.id === agentId && a.publicKey === publicKey);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'AI Agent not found.' });
    }
    if (agent.running) {
      return res.status(400).json({ success: false, message: 'Agent already running.' });
    }
    agent.running = true;
    startAgentProcess(agent);

    // Save
    saveDb();
    console.log(`[DEBUG] Started agent: ${agent.username}`);

    return res.status(200).json({ success: true, message: 'AI Agent started successfully.' });
  } catch (e) {
    logger.error(`Start AI Agent Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/agents/stop', (req, res) => {
  try {
    console.log('[DEBUG] /api/agents/stop POST...');
    const { publicKey, agentId } = req.body;
    if (!publicKey || !agentId) {
      return res.status(400).json({ success: false, message: 'PublicKey and agentId required' });
    }
    const agent = agents.find(a => a.id === agentId && a.publicKey === publicKey);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'AI Agent not found.' });
    }
    if (!agent.running) {
      return res.status(400).json({ success: false, message: 'Agent is not running.' });
    }
    agent.running = false;
    stopAgentProcess(agent);

    // Save
    saveDb();
    console.log(`[DEBUG] Stopped agent: ${agent.username}`);

    return res.status(200).json({ success: true, message: 'AI Agent stopped successfully.' });
  } catch (e) {
    logger.error(`Stop AI Agent Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/agents/delete', (req, res) => {
  try {
    console.log('[DEBUG] /api/agents/delete POST...');
    const { publicKey, agentId } = req.body;
    if (!publicKey || !agentId) {
      return res.status(400).json({ success: false, message: 'PublicKey and agentId required.' });
    }
    const idx = agents.findIndex(a => a.id === agentId && a.publicKey === publicKey);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'AI Agent not found.' });
    }
    const agentToDelete = agents[idx];
    if (agentToDelete.running) {
      stopAgentProcess(agentToDelete);
    }
    agents.splice(idx, 1);

    // Save
    saveDb();
    console.log(`[DEBUG] Deleted agent: ${agentToDelete.username}, total agents: ${agents.length}`);

    return res.status(200).json({ success: true, message: 'AI Agent deleted successfully.' });
  } catch (e) {
    logger.error(`Delete AI Agent Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/agents/logs', (req, res) => {
  try {
    console.log('[DEBUG] /api/agents/logs GET...');
    const { publicKey, agentId } = req.query;
    if (!publicKey || !agentId) {
      return res.status(400).json({ success: false, message: 'PublicKey and agentId required' });
    }
    const agent = agents.find(a => a.id === agentId && a.publicKey === publicKey);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'AI Agent not found.' });
    }
    console.log(`[DEBUG] Returning logs for agent: ${agent.username}`);
    return res.status(200).json({ success: true, logs: agent.logs });
  } catch (e) {
    logger.error(`Get AI Agent Logs Error: ${e.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Serve index.html or any other front-end route
app.get('*', (req, res) => {
  console.log('[DEBUG] Catch-all route - serving index.html');
  res.sendFile(path.join(publicDir, 'index.html'));
});

// 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  console.log(`[DEBUG] Server listening on port ${PORT}\n`);
});
