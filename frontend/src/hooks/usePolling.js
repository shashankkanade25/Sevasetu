import { useState, useEffect, useCallback, useRef } from "react";

/**
 * usePolling hook to fetch data at a regular interval.
 * 
 * @param {Function} apiFunc - The API function to call (must return a promise).
 * @param {Object} params - The parameters to pass to the API function.
 * @param {Number} interval - Polling interval in milliseconds (default: 15000).
 * @returns {Object} - { data, loading, error, refresh }
 */
export default function usePolling(apiFunc, params = {}, interval = 15000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use a ref to store params to avoid unnecessary re-triggers if params are stable but object identity changes
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await apiFunc(paramsRef.current);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error("Polling error:", err);
      setError(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [apiFunc]);

  useEffect(() => {
    // Initial fetch
    fetchData(true);

    // Set up interval
    const timer = setInterval(() => {
      // Only fetch if tab is visible to save resources
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [fetchData, interval]);

  return { data, loading, error, refresh: () => fetchData(true) };
}
