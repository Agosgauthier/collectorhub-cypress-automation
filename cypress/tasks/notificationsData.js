const { execFile } = require('node:child_process');
const { randomBytes, createHmac, timingSafeEqual } = require('node:crypto');
const path = require('node:path');

function settings(baseUrl) {
  const token = process.env.E2E_SERVER_TOKEN;
  if (!token || token.length < 32) throw new Error('E2E_SERVER_TOKEN must contain at least 32 characters.');
  if (!process.env.E2E_APP_PATH || !process.env.E2E_MONGODB_URI) {
    throw new Error('Set E2E_APP_PATH and E2E_MONGODB_URI explicitly.');
  }
  const url = new URL(baseUrl);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Use an HTTP loopback origin exclusively for the isolated server.');
  }
  return { token, url };
}

function php(operation, payload) {
  return new Promise((resolve, reject) => {
    const child = execFile(process.env.E2E_PHP_BINARY || 'php',
      [path.join(__dirname, 'notifications-data.php'), operation],
      { env: process.env, timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        // Do not expose PHP stderr, which may include connection credentials.
        if (error) return reject(new Error(`PHP ${operation} failed. Check isolated environment and connectivity.`));
        try {
          const result = JSON.parse(stdout);
          if (!result.ok) return reject(new Error(result.error || 'PHP safety check failed.'));
          resolve(result);
        } catch { reject(new Error('PHP returned invalid JSON.')); }
      });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}

async function verify(baseUrl) {
  const { token, url } = settings(baseUrl);
  const challenge = randomBytes(24).toString('hex');
  const endpoint = new URL('/__notifications_e2e/check', url);
  endpoint.searchParams.set('challenge', challenge);
  const response = await fetch(endpoint, {
    headers: { 'X-E2E-Token': token }, redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('The target server did not pass E2E attestation. No data was created.');
  const proof = await response.json();
  if (typeof proof.payload !== 'string' || typeof proof.signature !== 'string') throw new Error('Invalid server proof.');
  const expected = createHmac('sha256', token).update(proof.payload).digest('hex');
  const signature = Buffer.from(proof.signature);
  if (signature.length !== expected.length || !timingSafeEqual(signature, Buffer.from(expected))) {
    throw new Error('Invalid server signature.');
  }
  const state = JSON.parse(proof.payload);
  if (state.challenge !== challenge || state.database !== 'coleccionistas_e2e'
      || !Number.isInteger(state.time) || Math.abs(Date.now() / 1000 - state.time) > 30) {
    throw new Error('Server proof does not confirm the isolated database.');
  }
  // PHP independently validates the proof and compares its own effective connection.
  const local = await php('check', { proof });
  return { proof, local };
}

const pendingContexts = new Set();

function createNotificationsTasks(baseUrl) {
  return {
    'notifications:context': () => {
      const context = randomBytes(16).toString('hex');
      pendingContexts.add(context);
      console.log(`[notifications] Context for recovery: ${context}`);
      return context;
    },
    'notifications:check': async () => (await verify(baseUrl)).local,
    'notifications:prepare': async (args) => {
      const { proof } = await verify(baseUrl);
      if (!/^[a-f0-9]{32}$/.test(args.context)) throw new Error('Invalid context.');
      pendingContexts.add(args.context);
      return php('prepare', { ...args, proof });
    },
    'notifications:inspect': async (args) => {
      const { proof } = await verify(baseUrl);
      return php('inspect', { ...args, proof });
    },
    'notifications:cleanup': async (args) => {
      const { proof } = await verify(baseUrl);
      const result = await php('cleanup', { ...args, proof });
      if (result.remainingUsers !== 0 || result.remainingNotifications !== 0) {
        throw new Error(`Incomplete cleanup for ${args.context}`);
      }
      pendingContexts.delete(args.context);
      return result;
    },
  };
}

async function cleanupNotificationsContexts(baseUrl) {
  const tasks = createNotificationsTasks(baseUrl);
  const failures = [];
  for (const context of [...pendingContexts]) {
    try {
      await tasks['notifications:cleanup']({ context });
    } catch {
      failures.push(context);
    }
  }
  if (failures.length) throw new Error(`Cleanup failed. Preserve these recovery contexts: ${failures.join(', ')}`);
}

module.exports = { createNotificationsTasks, cleanupNotificationsContexts };

if (require.main === module) {
  const [operation, context] = process.argv.slice(2);
  if (!['check', 'inspect', 'cleanup'].includes(operation)) {
    process.stderr.write('Usage: node cypress/tasks/notificationsData.js check|inspect|cleanup [context]\n');
    process.exitCode = 1;
  } else {
    const tasks = createNotificationsTasks(process.env.CYPRESS_BASE_URL || 'http://127.0.0.1:8010');
    tasks[`notifications:${operation}`]({ context })
      .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
      .catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
  }
}
