#!/usr/bin/env node
/**
 * Generate AES-256 encryption key for shipping data
 * 
 * Usage: node scripts/generate-encryption-keys.js
 * 
 * Add the output to BOTH:
 * - frontend/.env.local
 * - backend/.env.local
 */

const crypto = require('crypto');

const key = crypto.randomBytes(32).toString('base64');

console.log('🔐 Generated AES-256 encryption key:\n');
console.log('=' .repeat(60));
console.log('Add to BOTH frontend/.env.local AND backend/.env.local:');
console.log('=' .repeat(60));
console.log(`ENCRYPTION_KEY=${key}`);
console.log('=' .repeat(60));
console.log('\n✅ This key is used to encrypt/decrypt shipping addresses.');
console.log('⚠️  Keep it secret! Never commit to git.');
