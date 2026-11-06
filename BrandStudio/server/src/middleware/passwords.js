import crypto from 'crypto';
const safeEqual = (a,b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
export const hashPassword = async (password) => { const salt=crypto.randomBytes(16).toString('hex'); const key=await new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,k)=>e?reject(e):resolve(k))); return `${salt}:${key.toString('hex')}`; };
export const checkPassword = async (password,stored) => { const [salt,hex]=String(stored||'').split(':'); if(!salt||!hex) return false; const key=await new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,k)=>e?reject(e):resolve(k))); return safeEqual(key.toString('hex'),hex); };
