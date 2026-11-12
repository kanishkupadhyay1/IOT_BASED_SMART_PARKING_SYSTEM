import 'dotenv/config';
import { initDatabase, resolveDbPath } from './database.js';

initDatabase();
console.log(`SQLite database initialized at ${resolveDbPath()}`);
