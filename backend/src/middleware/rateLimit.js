const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Limitador fijo en memoria por IP.
 * En despliegues con varias instancias debe sustituirse por un store compartido.
 */
export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = 10,
  message = "Demasiados intentos. Espera antes de volver a intentarlo.",
  keyGenerator = (req) => req.ip || req.socket?.remoteAddress || "unknown",
  now = Date.now,
  store = new Map()
} = {}) {
  if (!Number.isSafeInteger(windowMs) || windowMs <= 0) throw new TypeError("windowMs debe ser un entero positivo.");
  if (!Number.isSafeInteger(max) || max <= 0) throw new TypeError("max debe ser un entero positivo.");

  return function rateLimit(req, res, next) {
    const currentTime = now();
    const key = String(keyGenerator(req) || "unknown");
    let entry = store.get(key);

    if (!entry || currentTime >= entry.resetAt) {
      entry = { count: 0, resetAt: currentTime + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1000));

    res.setHeader("RateLimit-Policy", `${max};w=${Math.ceil(windowMs / 1000)}`);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (entry.count > max) {
      res.setHeader("Retry-After", String(resetSeconds));
      return res.status(429).json({
        success: false,
        message
      });
    }

    // Limpieza oportunista para evitar conservar indefinidamente claves expiradas.
    if (store.size > 1000) {
      for (const [storedKey, storedEntry] of store) {
        if (currentTime >= storedEntry.resetAt) store.delete(storedKey);
      }
    }

    return next();
  };
}

const loginWindowMs = positiveInteger(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
const trackingWindowMs = positiveInteger(process.env.TRACKING_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
const submissionWindowMs = positiveInteger(process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);
const reconsiderationWindowMs = positiveInteger(process.env.RECONSIDERATION_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);

export const loginRateLimit = createRateLimiter({
  windowMs: loginWindowMs,
  max: positiveInteger(process.env.LOGIN_RATE_LIMIT_MAX, 10),
  message: "Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo nuevamente."
});

export const trackingRateLimit = createRateLimiter({
  windowMs: trackingWindowMs,
  max: positiveInteger(process.env.TRACKING_RATE_LIMIT_MAX, 20),
  message: "Has realizado demasiadas consultas. Espera unos minutos e inténtalo nuevamente."
});

export const applicationSubmissionRateLimit = createRateLimiter({
  windowMs: submissionWindowMs,
  max: positiveInteger(process.env.SUBMISSION_RATE_LIMIT_MAX, 5),
  message: "Has enviado demasiadas solicitudes desde esta conexión. Inténtalo más tarde."
});

export const reconsiderationRateLimit = createRateLimiter({
  windowMs: reconsiderationWindowMs,
  max: positiveInteger(process.env.RECONSIDERATION_RATE_LIMIT_MAX, 3),
  message: "Has enviado demasiadas reconsideraciones desde esta conexión. Inténtalo más tarde."
});
