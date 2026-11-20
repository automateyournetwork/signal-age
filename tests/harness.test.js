// Meta-tests: prove the harness reports failures and treats an empty run as a failure.
import { describe, it, assert, assertEqual, createHarness } from './harness.js';

describe('harness', () => {
  it('[H1] a failing assertion is reported as a failure with its message', async () => {
    const h = createHarness();
    h.it('always fails', () => assert(false, 'deliberate'));
    h.it('always passes', () => assert(true));
    const summary = await h.run();
    assertEqual(summary.total, 2, 'total');
    assertEqual(summary.failed, 1, 'failed');
    assertEqual(summary.status, 'FAIL', 'status');
    assertEqual(summary.failures[0].error, 'deliberate', 'message');
  });

  it('[H2] a run with zero tests is a failure, not a pass', async () => {
    const summary = await createHarness().run();
    assertEqual(summary.total, 0, 'total');
    assert(summary.zeroTests, 'zeroTests flag');
    assertEqual(summary.status, 'FAIL', 'status');
  });

  it('[H3] a thrown error inside a test is captured, not propagated', async () => {
    const h = createHarness();
    h.it('throws', () => {
      throw new Error('boom');
    });
    const summary = await h.run();
    assertEqual(summary.status, 'FAIL');
    assertEqual(summary.failures[0].error, 'boom');
  });
});
