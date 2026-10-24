// Gera o par de chaves RSA do login (RS256) e imprime as duas linhas para colar no .env.
// Uso: npm run keys:generate
import { generateKeyPairSync } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

const base64 = (pem) => Buffer.from(pem).toString('base64')

console.log(`JWT_PRIVATE_KEY="${base64(privateKey)}"`)
console.log(`JWT_PUBLIC_KEY="${base64(publicKey)}"`)
