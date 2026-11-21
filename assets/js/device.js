// Device capabilities, not viewport width: a narrow desktop remains editable.
export function isReadOnlyDevice(navigator, document = {}) {
  const userAgent = navigator.userAgent || '';
  // Android tablets can expose a mobile client hint without the phone's Mobile token.
  const androidTablet = /Android/i.test(userAgent) && !/Mobile/i.test(userAgent);
  return /^(iPad|iPhone|iPod)( Simulator)?$/.test(navigator.platform || '') ||
    /iPhone|iPad|iPod|Android.*Mobile|Windows Phone|IEMobile/i.test(navigator.userAgent || '') ||
    (navigator.userAgent?.includes('Mac') && 'ontouchend' in document) ||
    (navigator.userAgentData?.mobile === true && !androidTablet);
}
