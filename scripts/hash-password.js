/**
 * Script utilitario para generar el hash de la contraseña de administración.
 * Utiliza crypto.scryptSync con una sal criptográfica aleatoria.
 * Uso: node scripts/hash-password.js [tu_contraseña]
 */

import crypto from 'node:crypto';

const password = process.argv[2] || 'clip2026';
const salt = crypto.randomBytes(16).toString('hex');
const derivedKey = crypto.scryptSync(password, salt, 64);
const passwordHash = `${salt}:${derivedKey.toString('hex')}`;

console.log('========================================================');
console.log('Generador de Hash Seguro de Contraseña (scrypt)');
console.log('========================================================');
console.log(`Contraseña utilizada : ${password}`);
console.log(`Hash generado        : ${passwordHash}`);
console.log('\nPega este hash en tu archivo .env:');
console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
console.log('========================================================');

