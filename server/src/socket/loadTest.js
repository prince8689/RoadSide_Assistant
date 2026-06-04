// Simulate 50 concurrent connections
// Test server stability under load

const { io: Client } = require('socket.io-client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const generateToken = (id, role) => jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });

// We need valid user and mechanic tokens. Let's create dummy ones 
// since the JWT validation only checks token signature, not DB presence,
// except we might need DB presence for location update to pass the role check.
// Wait, the role is embedded in the JWT payload! `socket.data.user = decoded;`
// So we can just use fake UUIDs.
const USER_TOKEN = generateToken('00000000-0000-0000-0000-000000000001', 'user');
const MECHANIC_TOKEN = generateToken('00000000-0000-0000-0000-000000000002', 'mechanic');

const clients = [];
let connected = 0;
let errors = 0;

console.log('🚀 Starting load test with 50 connections...');

// Create 50 client connections
for (let i = 0; i < 50; i++) {
  const token = i % 2 === 0 ? USER_TOKEN : MECHANIC_TOKEN;
  const client = Client('http://localhost:5000', {
    auth: { token },
    reconnection: false
  });

  client.on('connect', () => {
    connected++;
    if (connected === 50) {
      console.log('✅ All 50 clients connected!');
      runLocationSpam();
    }
  });

  client.on('connect_error', (err) => {
    errors++;
    console.log(`❌ Connection error: ${err.message}. Total errors: ${errors}`);
  });

  clients.push(client);
}

// Spam location updates from all mechanic clients
const runLocationSpam = () => {
  console.log('📍 Sending 100 location updates...');
  let sent = 0;
  const interval = setInterval(() => {
    clients.forEach((client, i) => {
      if (i % 2 !== 0) { // mechanic clients only
        client.emit('mechanic:location:update', {
          lat: 28.6139 + (Math.random() * 0.01),
          lng: 77.2090 + (Math.random() * 0.01)
        });
        sent++;
      }
    });
    if (sent >= 100) {
      clearInterval(interval);
      console.log(`✅ Load test complete. Sent: ${sent}, Errors: ${errors}`);
      
      // Let it process then disconnect
      setTimeout(() => {
        clients.forEach(c => c.disconnect());
        process.exit(0);
      }, 2000);
    }
  }, 100);
};
