import { useEffect, useRef } from 'react';

/**
 * Repeatedly invokes the given callback on a fixed interval, without
 * causing a full page reload. Used to keep the public dashboard's
 * patient list current.
 *
 * @param {Function} callback function to run on every tick
 * @param {number} intervalMs interval in milliseconds (default 10s)
 */
export function useAutoRefresh(callback, intervalMs = 10000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => savedCallback.current();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
