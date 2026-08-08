import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getWsUrl } from '../services/api';

const StatsContext = createContext();

export const useAppStats = () => useContext(StatsContext);

export const StatsProvider = ({ children }) => {
  const [stats, setStats] = useState({ total_users: 0, active_users: 0 });

  useEffect(() => {
    let isMounted = true;
    let ws = null;
    let timeoutId = null;

    const wsUrl = getWsUrl('/api/ws/stats');

    const connect = () => {
      if (!isMounted) return;
      
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.total_users !== undefined && data.active_users !== undefined) {
            setStats({
              total_users: data.total_users,
              active_users: data.active_users
            });
          }
        } catch (err) {
          console.error("Failed to parse stats message", err);
        }
      };

      ws.onclose = () => {
        // Automatically reconnect after 5 seconds if still mounted
        if (isMounted) {
          timeoutId = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return (
    <StatsContext.Provider value={stats}>
      {children}
    </StatsContext.Provider>
  );
};
