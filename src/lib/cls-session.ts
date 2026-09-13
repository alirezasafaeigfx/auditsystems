export function createClsSession() {
  let largest = 0;
  let windowValue = 0;
  let windowStart = 0;
  let previousShift = 0;

  return {
    observe(startTime: number, value: number, hadRecentInput: boolean) {
      if (hadRecentInput || !Number.isFinite(startTime) || !Number.isFinite(value) || value < 0) return;
      if (windowValue > 0 && startTime - previousShift < 1000 && startTime - windowStart < 5000) {
        windowValue += value;
      } else {
        windowStart = startTime;
        windowValue = value;
      }
      previousShift = startTime;
      largest = Math.max(largest, windowValue);
    },
    value() {
      return largest;
    },
  };
}
