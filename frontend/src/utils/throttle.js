/**
 * Throttle function for improved performance with frequently firing events
 * like scroll, resize, mousemove, etc.
 *
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
  let lastCall = 0;
  let lastArgs = null;
  let lastThis = null;
  let timeoutId = null;

  const later = () => {
    lastCall = Date.now();
    timeoutId = null;
    func.apply(lastThis, lastArgs);
  };

  return function throttled(...args) {
    const now = Date.now();
    const remaining = limit - (now - lastCall);

    // Store context and args for later execution
    lastArgs = args;
    lastThis = this;

    // If it's been longer than the limit since last call,
    // or this is the first call, execute immediately
    if (remaining <= 0 || remaining > limit) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      func.apply(lastThis, lastArgs);
    }
    // Otherwise, schedule execution after remaining time
    else if (!timeoutId) {
      timeoutId = setTimeout(later, remaining);
    }
  };
}

/**
 * Debounce function for handling events that should only
 * trigger after a period of inactivity
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait after last call
 * @param {boolean} immediate - Whether to invoke at the beginning
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;

  return function debounced(...args) {
    const context = this;

    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}

/**
 * Returns a device performance profile based on device capabilities
 *
 * @returns {Object} - Performance profile with quality settings
 */
export function getDevicePerformance() {
  // Calculate performance metric based on device capabilities
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  const cpuCores = navigator.hardwareConcurrency || 2;
  const isLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
  const isLowPerformanceGPU = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Calculate overall performance score
  let performanceScore = 10; // Start with max score

  if (isMobile) performanceScore -= 3;
  if (cpuCores < 4) performanceScore -= 3;
  if (isLowMemory) performanceScore -= 2;
  if (isLowPerformanceGPU) performanceScore -= 2;

  // Clamp score between 1-10
  performanceScore = Math.max(1, Math.min(10, performanceScore));

  // Determine quality level
  let qualityLevel;
  if (performanceScore >= 8) qualityLevel = 'high';
  else if (performanceScore >= 5) qualityLevel = 'medium';
  else if (performanceScore >= 3) qualityLevel = 'low';
  else qualityLevel = 'minimal';

  return {
    score: performanceScore,
    quality: qualityLevel,
    particleMultiplier: qualityLevel === 'high' ? 1.0 :
                        qualityLevel === 'medium' ? 0.6 :
                        qualityLevel === 'low' ? 0.3 : 0.1,
    shouldDisable3D: qualityLevel === 'minimal',
    isMobile: isMobile,
    reducedMotion: isLowPerformanceGPU
  };
  
}
