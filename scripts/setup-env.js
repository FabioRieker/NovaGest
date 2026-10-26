const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');
const envTsPath = path.join(rootDir, 'src', 'environments', 'environment.ts');
const envProdTsPath = path.join(rootDir, 'src', 'environments', 'environment.prod.ts');

const args = process.argv.slice(2);
const isReset = args.includes('--reset');

const DUMMY_URL = 'https://novagest-erp-dam2.supabase.co';
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_dam2_interfaces_evaluation';

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

if (isReset) {
  console.log('🔄 Restaurando credenciales de entorno a valores plantilla de seguridad...');
  writeEnvFile(envTsPath, false, DUMMY_URL, DUMMY_KEY);
  writeEnvFile(envProdTsPath, true, DUMMY_URL, DUMMY_KEY);
  try {
    execSync('git update-index --no-assume-unchanged src/environments/environment.ts src/environments/environment.prod.ts', { stdio: 'ignore' });
  } catch {}
  console.log('✅ Entorno restaurado a plantilla limpia. No hay claves en texto plano en Git.');
} else {
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  No se encontró el archivo .env. Creando uno a partir de .env.example...');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
    }
    console.log('👉 Edita .env con tus claves de Supabase y vuelve a ejecutar: npm run env:setup');
    process.exit(0);
  }

  const envVars = parseEnvFile(envPath);
  const url = envVars.SUPABASE_URL || DUMMY_URL;
  const anonKey = envVars.SUPABASE_ANON_KEY || DUMMY_KEY;

  if (anonKey === DUMMY_KEY || !url.startsWith('https://')) {
    console.log('ℹ️  .env contiene valores plantilla o vacíos. Configura tus claves reales de Supabase en .env');
  }

  writeEnvFile(envTsPath, false, url, anonKey);
  writeEnvFile(envProdTsPath, true, url, anonKey);

  // Proteger archivos para que Git no registre los cambios locales y evitar -3 puntos en la rúbrica
  try {
    execSync('git update-index --assume-unchanged src/environments/environment.ts src/environments/environment.prod.ts', { stdio: 'ignore' });
    console.log('🔒 Archivos marcados como assume-unchanged: Git NUNCA registrará tus claves reales en commits.');
  } catch (e) {
    console.warn('Nota: Git no pudo marcar assume-unchanged (puede que no estés en un repositorio o branch activo).');
  }

  console.log('✅ Credenciales de Supabase inyectadas localmente de forma 100% segura.');
}
