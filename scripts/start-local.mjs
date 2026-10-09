import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
mkdirSync('.local/logs', { recursive: true });
if (!existsSync('.local/mfa-key')) {
  writeFileSync('.local/mfa-key', randomBytes(16).toString('hex'), { mode: 0o600 });
}

// The launcher always uses the local demo project, even if the shell has cloud settings.
const env = {
  ...process.env,
  FIREBASE_MODE: 'emulator',
  FIREBASE_PROJECT_ID: 'demo-omreznina',
  GOOGLE_CLOUD_PROJECT: 'demo-omreznina',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8081',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_EMULATORS_PATH: resolve('.local/firebase-cache'),
  XDG_CONFIG_HOME: resolve('.local/config'),
  MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY || readFileSync('.local/mfa-key', 'utf8').trim(),
  SERVER_ADDRESS: '127.0.0.1',
  SERVER_PORT: '8080',
  PARSER_BASE_URL: 'http://127.0.0.1:8001',
  POWER_BASE_URL: 'http://127.0.0.1:8002',
  PREDICTION_BASE_URL: 'http://127.0.0.1:8003',
  VITE_BASE_PATH: '/',
  VITE_API_BASE_URL: '/api',
  VITE_API_PROXY_TARGET: 'http://127.0.0.1:8080',
  VITE_USE_FIREBASE_EMULATORS: 'true',
  VITE_FIREBASE_PROJECT_ID: 'demo-omreznina',
  VITE_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1',
  VITE_FIREBASE_AUTH_EMULATOR_PORT: '9099',
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: '127.0.0.1',
  VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: '8081',
  CI: 'true',
  PYTHONDONTWRITEBYTECODE: '1',
};
delete env.GOOGLE_APPLICATION_CREDENTIALS;
delete env.FIREBASE_TOKEN;
const services = [];
let stopping = false;
let exitCode = 0;
let firebaseReady = false;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isOpen = (port) => new Promise((resolve) => {
  const socket = net.connect({ host: '127.0.0.1', port });
  let done = false;
  const finish = (open) => {
    if (done) return;
    done = true;
    socket.destroy();
    resolve(open);
  };
  socket.setTimeout(500);
  socket.once('connect', () => finish(true));
  socket.once('error', () => finish(false));
  socket.once('timeout', () => finish(false));
});

function start(name, command, args, cwd = root) {
  const logPath = resolve('.local/logs', `${name}.log`);
  const log = createWriteStream(logPath, { flags: 'w' });
  const child = spawn(command, args, {
    cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const service = { name, child, log, logPath, ended: false };
  services.push(service);
  child.once('error', (error) => {
    service.ended = true;
    log.write(`${error.message}\n`);
    log.end();
    console.error(`Zagon ${name} ni uspel: ${error.message}`);
    shutdown(1);
  });
  child.once('exit', (code, signal) => {
    service.ended = true;
    log.end();
    if (stopping && name === 'firebase' && code !== 0) {
      console.error('Firebase se ni pravilno ustavil. Preveri .local/logs/firebase.log in shranjene podatke.');
      exitCode = 1;
    }
    if (!stopping) {
      console.error(`${name} se je ustavil (${signal || code}). Glej ${logPath}.`);
      shutdown(1);
    }
  });
  return service;
}

async function waitFor(url, name, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* Startup in progress. */ }
    await pause(500);
  }
  if (!stopping) throw new Error(`${name} se ni pravočasno zagnal. Glej .local/logs/.`);
}

async function waitForPort(port, name) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline && !stopping) {
    if (await isOpen(port)) return;
    await pause(500);
  }
  if (!stopping) throw new Error(`${name} se ni pravočasno zagnal. Glej .local/logs/.`);
}

function signalService(service, signal) {
  if (service.ended || !service.child.pid) return;
  try {
    // Firebase CLI must export before stopping its Java child.
    if (service.name === 'firebase' || process.platform === 'win32') service.child.kill(signal);
    else process.kill(-service.child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') console.error(error.message);
  }
}

async function shutdown(code = 0) {
  exitCode = Math.max(exitCode, code);
  if (stopping) return;
  stopping = true;
  console.log('\nUstavljam storitve in shranjujem lokalne podatke …');
  async function stopGroup(group, signal, timeout) {
    for (const service of group) signalService(service, signal);
    const deadline = Date.now() + timeout;
    while (group.some((service) => !service.ended) && Date.now() < deadline) await pause(200);
    for (const service of group.filter((service) => !service.ended)) {
      console.error(`${service.name} se ni odzval na ustavitev; podatki morda niso shranjeni.`);
      try { process.kill(-service.child.pid, 'SIGKILL'); } catch { service.child.kill('SIGKILL'); }
      exitCode = 1;
    }
  }
  // Finish application writes before Firebase takes the final snapshot.
  await stopGroup(services.filter((service) => service.name !== 'firebase'), 'SIGTERM', 20000);
  const exportStarted = Date.now();
  await stopGroup(services.filter((service) => service.name === 'firebase'), 'SIGINT', 45000);
  const metadata = '.local/firebase-data/firebase-export-metadata.json';
  if (firebaseReady && (!existsSync(metadata) || statSync(metadata).mtimeMs < exportStarted - 2000)) {
    console.error('Izvoz podatkov ni potrjen. Preveri .local/logs/firebase.log.');
    exitCode = 1;
  }
  process.exit(exitCode);
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
process.on('uncaughtException', (error) => { console.error(error.message); shutdown(1); });
process.on('unhandledRejection', (error) => { console.error(error); shutdown(1); });

try {
  const ports = [4000, 4400, 4500, 5173, 8001, 8002, 8003, 8080, 8081, 9099, 9150];
  const occupied = (await Promise.all(ports.map(async (port) => ({ port, open: await isOpen(port) }))))
    .filter(({ open }) => open).map(({ port }) => port);
  if (occupied.length) throw new Error(`Vrata ${occupied.join(', ')} so zasedena. Ustavi prejšnji zagon ali drugo storitev.`);
  const firebaseArgs = ['emulators:start', '--only', 'auth,firestore', '--project', 'demo-omreznina',
    '--config', 'firebase.json', '--export-on-exit', '.local/firebase-data'];
  if (existsSync('.local/firebase-data/firebase-export-metadata.json')) firebaseArgs.push('--import', '.local/firebase-data');
  console.log('Zaganjam lokalno prijavo in bazo …');
  start('firebase', resolve('node_modules/.bin/firebase'), firebaseArgs);
  await waitFor('http://127.0.0.1:9099/emulator/v1/projects/demo-omreznina/oobCodes', 'Firebase Auth');
  await waitForPort(8081, 'Firestore');
  if (!stopping) {
    firebaseReady = true;
    const python = resolve('.venv/bin/python');
    start('parser', python, ['-m', 'uvicorn', 'python_helper.main:app', '--host', '127.0.0.1', '--port', '8001']);
    start('prekoracitve', python, ['-m', 'uvicorn', 'prekoracitev_helper.main:app', '--host', '127.0.0.1', '--port', '8002']);
    start('predikcija', python, ['-m', 'uvicorn', 'predikcija_helper.main:app', '--host', '127.0.0.1', '--port', '8003']);
    start('backend', 'java', ['-jar', resolve('backend/target/omreznina-0.0.1-SNAPSHOT.jar')]);
    start('frontend', resolve('frontend/node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5173', '--strictPort'], resolve('frontend'));
    await Promise.all([
      waitFor('http://127.0.0.1:8001/', 'Parser'), waitFor('http://127.0.0.1:8002/', 'Prekoračitve'),
      waitFor('http://127.0.0.1:8003/', 'Predikcija'), waitFor('http://127.0.0.1:8080/health', 'Backend'),
      waitFor('http://127.0.0.1:5173/', 'Frontend'), waitFor('http://127.0.0.1:4000/', 'Firebase UI'),
    ]);
    if (!stopping) {
      console.log('\nOmrežnina+ deluje: http://localhost:5173');
      console.log('Uporabniki in podatki: http://localhost:4000');
      console.log('Ustavitev: Ctrl+C. Podatki: .local/firebase-data; dnevniki: .local/logs.');
    }
  }
} catch (error) {
  console.error(error.message);
  await shutdown(1);
}
