
import { createHash, randomBytes } from 'node:crypto';
const password = process.argv[2];
if (!password) { console.error('用法: node scripts/hash-password.mjs "你的密码"'); process.exit(1); }
console.log('ADMIN_PASSWORD_SHA256=' + createHash('sha256').update(password).digest('hex'));
console.log('SESSION_SECRET=' + randomBytes(32).toString('hex'));
