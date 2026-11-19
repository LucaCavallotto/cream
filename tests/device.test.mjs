import test from 'node:test';
import assert from 'node:assert/strict';
import { isReadOnlyDevice } from '../assets/js/device.js';
import { appReducer, createAppState } from '../assets/js/appState.js';
test('smartphones and iPad are read only while desktop browsers and Android tablets stay editable', () => {
  for (const userAgent of ['Mozilla iPhone Mobile Safari', 'Mozilla Android 14 Mobile Chrome', 'Windows Phone IEMobile']) assert(isReadOnlyDevice({ userAgent }));
  assert(isReadOnlyDevice({ platform: 'iPad' }));
  assert(isReadOnlyDevice({ userAgent: 'Macintosh Safari' }, { ontouchend: null }));
  assert(isReadOnlyDevice({ userAgentData: { mobile: true } }));
  assert(!isReadOnlyDevice({ userAgent: 'Macintosh Chrome', platform: 'MacIntel' }));
  assert(!isReadOnlyDevice({ userAgent: 'Android 14 Tablet Chrome' }));
});
test('device protection cannot be unlocked and survives file sessions', () => {
  let state = createAppState(true, true);
  assert.equal(appReducer(state, { type: 'viewOnly' }), state);
  state = appReducer(state, { type: 'open', session: { fileName: 'test.csv', transactions: [] } });
  state = appReducer(state, { type: 'close' });
  assert.equal(state.deviceReadOnly, true);
  assert.equal(state.viewOnlyMode, true);
});
