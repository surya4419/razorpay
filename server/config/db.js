import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongodInstance = null;

export async function connectDB() {
  const dbPath = path.resolve(__dirname, '../data/db');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  // First try direct connection to configured URI (if local mongod or Atlas is available)
  if (config.mongoUri && !config.mongoUri.includes('placeholder')) {
    try {
      console.log(`Connecting to MongoDB URI: ${config.mongoUri}...`);
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 2500,
      });
      console.log('MongoDB connected successfully via URI.');
      return mongoose.connection;
    } catch (err) {
      console.warn(`Standard MongoDB connection to ${config.mongoUri} was not reachable (${err.message}).`);
      console.log('Initializing embedded persistent Mongo instance in server/data/db...');
    }
  }

  // Fallback to embedded Mongo instance with persistence on disk
  try {
    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbPath: dbPath,
        storageEngine: 'wiredTiger'
      }
    });

    const uri = mongodInstance.getUri();
    console.log(`Embedded MongoDB started at: ${uri} (Persisted at ${dbPath})`);
    await mongoose.connect(uri);
    console.log('Embedded MongoDB connected successfully with persistence.');
    return mongoose.connection;
  } catch (embeddedErr) {
    console.warn('Persistent storage engine fallback error, starting in-memory server without dbPath:', embeddedErr.message);
    mongodInstance = await MongoMemoryServer.create();
    const uri = mongodInstance.getUri();
    await mongoose.connect(uri);
    console.log(`Embedded in-memory MongoDB connected at: ${uri}`);
    return mongoose.connection;
  }
}

export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}
