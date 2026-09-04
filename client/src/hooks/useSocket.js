import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket.js';

export function useSocket() {
  const [events, setEvents] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);
  const [simulationProgress, setSimulationProgress] = useState(null);
  const [banditUpdates, setBanditUpdates] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    const handleEvent = (type, data) => {
      const entry = { type, data, timestamp: new Date().toLocaleTimeString() };
      setLastEvent(entry);
      setEvents((prev) => [entry, ...prev.slice(0, 99)]);
    };

    socket.on('transaction:started', (d) => handleEvent('transaction:started', d));
    socket.on('layer1:decision', (d) => handleEvent('layer1:decision', d));
    socket.on('layer2:classification', (d) => handleEvent('layer2:classification', d));
    socket.on('layer2:action', (d) => handleEvent('layer2:action', d));
    socket.on('razorpay:webhook_received', (d) => handleEvent('razorpay:webhook_received', d));
    socket.on('outcome:success', (d) => handleEvent('outcome:success', d));
    socket.on('outcome:failure', (d) => handleEvent('outcome:failure', d));
    socket.on('outcome:recovered', (d) => handleEvent('outcome:recovered', d));
    
    socket.on('bandit:update', (d) => {
      handleEvent('bandit:update', d);
      setBanditUpdates((prev) => [d, ...prev.slice(0, 19)]);
    });

    socket.on('simulation:progress', (d) => {
      setSimulationProgress(d);
      handleEvent('simulation:progress', d);
    });

    socket.on('simulation:completed', (d) => {
      setSimulationProgress(null);
      handleEvent('simulation:completed', d);
    });

    return () => {
      socket.off('transaction:started');
      socket.off('layer1:decision');
      socket.off('layer2:classification');
      socket.off('layer2:action');
      socket.off('razorpay:webhook_received');
      socket.off('outcome:success');
      socket.off('outcome:failure');
      socket.off('outcome:recovered');
      socket.off('bandit:update');
      socket.off('simulation:progress');
      socket.off('simulation:completed');
    };
  }, []);

  return { events, lastEvent, simulationProgress, banditUpdates };
}
