import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

export default defineConfig({
  test: {
    environment: 'node',
  },
});
