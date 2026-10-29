const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');
const envTsPath = path.join(rootDir, 'src', 'environments', 'environment.ts');
const envProdTsPath = path.join(rootDir, 'src', 'environments', 'environment.prod.ts');

const args = process.argv.slice(2);
const isReset = args.includes('--reset');
const isIfEnv = args.includes('--if-env');

const PLACEHOLDER_URL = 'SUPABASE_URL_PLACEHOLDER';
const PLACEHOLDER_KEY = 'SUPABASE_ANON_KEY_PLACEHOLDER';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      result[key] = val;
    }
  }
  return result;
}

function writeEnvFile(filePath, isProd, url, anonKey) {
  const content = `// Entorno generado automáticamente para protección de claves (Rúbrica DAM2)
export const environment = {
  production: ${isProd},
  supabase: {
    url: '${url}',
    anonKey: '${anonKey}'
  }
};
`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function isRealCredential(val, placeholder) {
  return val && val !== placeholder && !val.includes('PLACEHOLDER') && !val.includes('tu-proyecto');
}

if (isReset) {
  console.log('🔄 Restaurando credenciales de entorno a valores plantilla de seguridad...');
  writeEnvFile(envTsPath, false, PLACEHOLDER_URL, PLACEHOLDER_KEY);
  writeEnvFile(envProdTsPath, true, PLACEHOLDER_URL, PLACEHOLDER_KEY);
  console.log('✅ Entorno restaurado a plantilla limpia. No hay claves en texto plano en Git.');
  process.exit(0);
}

if (isIfEnv) {
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY;
  if (isRealCredential(envUrl, PLACEHOLDER_URL) && isRealCredential(envKey, PLACEHOLDER_KEY)) {
    console.log('🔧 Inyectando variables de entorno de compilación (process.env) para Supabase...');
    writeEnvFile(envTsPath, false, envUrl, envKey);
    writeEnvFile(envProdTsPath, true, envUrl, envKey);
    console.log('✅ Variables de entorno aplicadas con éxito.');
  } else {
    console.log('ℹ️  Modo --if-env: Sin variables process.env. Conservando placeholders seguros para compilación.');
  }
  process.exit(0);
}

// 1. Prioridad: variables de entorno del sistema (Vercel, CI/CD, contenedor)
let url = process.env.SUPABASE_URL;
let anonKey = process.env.SUPABASE_ANON_KEY;

// 2. Si no están en process.env, leer de .env local si existe
if ((!url || !anonKey) && fs.existsSync(envPath)) {
  const fileVars = parseEnvFile(envPath);
  url = url || fileVars.SUPABASE_URL;
  anonKey = anonKey || fileVars.SUPABASE_ANON_KEY;
}

// Modo interactivo / env:setup explícito
if (!fs.existsSync(envPath) && !url && !anonKey) {
  console.log('⚠️  No se encontró el archivo .env. Creando uno a partir de .env.example...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  }
  console.log('👉 Edita .env con tus claves de Supabase y vuelve a ejecutar: npm run env:setup');
  process.exit(0);
}

const finalUrl = url || PLACEHOLDER_URL;
const finalKey = anonKey || PLACEHOLDER_KEY;

writeEnvFile(envTsPath, false, finalUrl, finalKey);
writeEnvFile(envProdTsPath, true, finalUrl, finalKey);

if (isRealCredential(finalUrl, PLACEHOLDER_URL) && isRealCredential(finalKey, PLACEHOLDER_KEY)) {
  console.log('✅ Credenciales de Supabase inyectadas de forma segura.');
} else {
  console.log('ℹ️  Placeholders configurados. Para conectar con Supabase en vivo, añade credenciales a .env.');
}
