const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function buildImpayesPoolConfig(connectionString) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get('sslmode')?.toLowerCase();
  const isNeon = url.hostname === 'neon.tech' || url.hostname.endsWith('.neon.tech');

  // Laisser pg interpréter tout choix explicite (disable, verify-full, certificats...).
  // Sans paramètre, Neon reçoit une vérification stricte, tandis qu'une base locale
  // reste en clair même lorsque le processus tourne avec NODE_ENV=production.
  const ssl = sslMode
    ? undefined
    : isNeon
      ? { rejectUnauthorized: true }
      : LOCAL_HOSTS.has(url.hostname)
        ? false
        : undefined;

  return {
    connectionString,
    ...(ssl === undefined ? {} : { ssl }),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}
