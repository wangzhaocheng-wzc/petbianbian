/*
 * Redis connectivity test script
 * Usage:
 *   node scripts/testRedisConnection.js [redis://host:port | rediss://host:port]
 *   Options:
 *     --tls               Enable TLS (or use rediss:// scheme)
 *     --username=<name>   Username for ACL auth (optional)
 *     --password=<pass>   Password for auth (optional)
 *     --db=<index>        Database index (default: 0)
 *     --timeout=<ms>      Socket connect timeout in ms (default: 8000)
 *
 * You can also set env vars: REDIS_URL, REDIS_USERNAME, REDIS_PASSWORD, REDIS_DB, REDIS_CONNECT_TIMEOUT
 */

const { createClient } = require('redis');

function parseArgs(argv) {
  const args = { flags: {}, url: undefined };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--')) {
      const [k, v] = a.replace(/^--/, '').split('=');
      args.flags[k] = v === undefined ? true : v;
    } else if (!args.url) {
      args.url = a;
    }
  }
  return args;
}

function buildUrl(baseUrl, tlsFlag) {
  if (!baseUrl) return undefined;
  // Promote to rediss:// if tls is requested but url is redis://
  if (tlsFlag && baseUrl.startsWith('redis://')) {
    return baseUrl.replace('redis://', 'rediss://');
  }
  return baseUrl;
}

async function main() {
  const { flags, url: cliUrl } = parseArgs(process.argv);

  const envUrl = process.env.REDIS_URL;
  const useTls = flags.tls === true || String(envUrl || '').startsWith('rediss://');

  const url = buildUrl(
    cliUrl || envUrl || 'redis://sjc1.clusters.zeabur.com:27402',
    flags.tls === true
  );

  const username = flags.username || process.env.REDIS_USERNAME || undefined;
  const password = flags.password || process.env.REDIS_PASSWORD || undefined;
  const db = Number(flags.db || process.env.REDIS_DB || 0) || 0;
  const connectTimeout = Number(flags.timeout || process.env.REDIS_CONNECT_TIMEOUT || 8000) || 8000;

  if (!url) {
    console.error('[redis-test] No URL provided. Pass as first arg or set REDIS_URL.');
    process.exit(1);
  }

  console.log('[redis-test] Using URL:', url);
  if (username) console.log('[redis-test] Username provided');
  if (password) console.log('[redis-test] Password provided');
  console.log('[redis-test] DB:', db);
  console.log('[redis-test] connectTimeout:', connectTimeout);
  console.log('[redis-test] TLS enabled:', useTls || url.startsWith('rediss://'));

  const client = createClient({
    url,
    username,
    password,
    database: db,
    socket: {
      connectTimeout,
      tls: useTls || url.startsWith('rediss://') || undefined,
    },
    disableOfflineQueue: true,
    // Keep reconnect strategy modest for tests to fail fast
    // retried up to 5 times with short delays
    reconnectStrategy(retries) {
      if (retries > 5) return new Error('Max retries reached');
      return Math.min(retries * 200, 1000);
    },
  });

  client.on('connect', () => console.log('[redis-test] connect event'));
  client.on('ready', () => console.log('[redis-test] ready event'));
  client.on('end', () => console.log('[redis-test] end event'));
  client.on('reconnecting', () => console.log('[redis-test] reconnecting event'));
  client.on('error', (err) => console.error('[redis-test] error event:', err && err.message ? err.message : err));

  try {
    console.log('[redis-test] Connecting...');
    await client.connect();
    console.log('[redis-test] Connected');

    const pong = await client.ping();
    console.log('[redis-test] PING =>', pong);

    const key = `trae:test:redis:connectivity:${Date.now()}`;
    const setRes = await client.set(key, 'ok', { EX: 5 });
    console.log('[redis-test] SET =>', setRes);

    const getRes = await client.get(key);
    console.log('[redis-test] GET =>', getRes);

    const delRes = await client.del(key);
    console.log('[redis-test] DEL =>', delRes);

    console.log('[redis-test] SUCCESS: Connected and basic commands worked');
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error('[redis-test] FAIL:', msg);
    if (/NOAUTH/i.test(msg)) {
      console.error('[redis-test] Hint: Authentication required. Provide --password or REDIS_PASSWORD.');
    } else if (/self signed certificate|TLS/i.test(msg)) {
      console.error('[redis-test] Hint: TLS may be required. Use --tls or rediss:// URL.');
    } else if (/getaddrinfo ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(msg)) {
      console.error('[redis-test] Hint: Check host/port reachability and firewall rules.');
    }
    process.exitCode = 1;
  } finally {
    try {
      await client.quit();
      console.log('[redis-test] Disconnected');
    } catch (e) {
      // ignore
    }
  }
}

main();