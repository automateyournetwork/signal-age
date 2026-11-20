// Minimal, dependency-free test harness for Signal Age.
// Works in the browser runner (tests/index.html) and in Node, so the same
// suites can be run either way. A run with zero tests is a failure.

export class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function createHarness() {
  const tests = [];
  let suite = '';

  function describe(name, fn) {
    const previous = suite;
    suite = previous ? `${previous} › ${name}` : name;
    try {
      fn();
    } finally {
      suite = previous;
    }
  }

  function it(name, fn) {
    tests.push({ suite, name, fn });
  }

  async function run() {
    const results = [];
    for (const test of tests) {
      try {
        await test.fn();
        results.push({ suite: test.suite, name: test.name, ok: true });
      } catch (error) {
        results.push({
          suite: test.suite,
          name: test.name,
          ok: false,
          error: error && error.message ? error.message : String(error),
        });
      }
    }
    return summarize(results);
  }

  return { describe, it, run, count: () => tests.length };
}

// Builds the summary the runner shows. Zero tests is reported as FAIL.
export function summarize(results) {
  const failures = results.filter((r) => !r.ok);
  const total = results.length;
  return {
    total,
    passed: total - failures.length,
    failed: failures.length,
    zeroTests: total === 0,
    status: total === 0 || failures.length > 0 ? 'FAIL' : 'PASS',
    results,
    failures,
  };
}

export function assert(condition, message = 'assertion failed') {
  if (!condition) throw new AssertionError(message);
}

export function assertEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new AssertionError(`${message ? message + ': ' : ''}expected ${e}, got ${a}`);
  }
}

export function assertClose(actual, expected, tolerance, message = '') {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > tolerance) {
    throw new AssertionError(
      `${message ? message + ': ' : ''}expected ${expected} ± ${tolerance}, got ${actual}`,
    );
  }
}

// One shared harness that the suite files register into.
const shared = createHarness();
export const describe = shared.describe;
export const it = shared.it;
export const run = shared.run;
export const count = shared.count;
