import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../src/middleware/rateLimit.js";

function responseRecorder() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function request(ip = "203.0.113.10") {
  return { ip, socket: { remoteAddress: ip } };
}

test("permite hasta el máximo y bloquea intentos adicionales con 429", () => {
  const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
  let nextCalls = 0;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = responseRecorder();
    limiter(request(), res, () => { nextCalls += 1; });
    assert.equal(res.statusCode, 200);
  }

  const blocked = responseRecorder();
  limiter(request(), blocked, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.success, false);
  assert.equal(blocked.headers["Retry-After"], "60");
  assert.equal(blocked.headers["RateLimit-Remaining"], "0");
});

test("aísla contadores por IP", () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
  const first = responseRecorder();
  const second = responseRecorder();
  limiter(request("203.0.113.10"), first, () => {});
  limiter(request("203.0.113.11"), second, () => {});
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
});

test("reinicia el contador al terminar la ventana", () => {
  let currentTime = 1_000;
  const limiter = createRateLimiter({ max: 1, windowMs: 5_000, now: () => currentTime });
  const first = responseRecorder();
  const blocked = responseRecorder();
  limiter(request(), first, () => {});
  limiter(request(), blocked, () => {});
  assert.equal(blocked.statusCode, 429);

  currentTime = 6_000;
  const afterWindow = responseRecorder();
  let nextCalled = false;
  limiter(request(), afterWindow, () => { nextCalled = true; });
  assert.equal(afterWindow.statusCode, 200);
  assert.equal(nextCalled, true);
});

test("permite inyectar una clave independiente de la IP para entornos controlados", () => {
  const limiter = createRateLimiter({ max: 1, keyGenerator: (req) => req.key });
  const first = responseRecorder();
  const second = responseRecorder();
  limiter({ key: "account-a" }, first, () => {});
  limiter({ key: "account-b" }, second, () => {});
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
});

test("rechaza configuraciones de ventana o máximo inválidas", () => {
  assert.throws(() => createRateLimiter({ windowMs: 0 }), /windowMs/);
  assert.throws(() => createRateLimiter({ max: 0 }), /max/);
});
