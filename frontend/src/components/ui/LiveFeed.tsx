import React, { useEffect, useState } from 'react';
import { Activity, Circle } from 'lucide-react';

interface FeedEvent {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

const typeConfig = {
  success: { color: '#06d6a0', label: 'OK' },
  info: { color: '#4361ee', label: 'INFO' },
  warning: { color: '#ffd166', label: 'WARN' },
  error: { color: '#ef476f', label: 'ERR' },
};

const mockEvents: FeedEvent[] = [
  { id: '1', type: 'success', message: 'Node HOSPITAL-04 synced weights (Round 23)', timestamp: '09:31:01' },
  { id: '2', type: 'info', message: 'New hospital "Berlin Health" requested to join server #7', timestamp: '09:30:48' },
  { id: '3', type: 'success', message: 'FedAvg aggregation complete — Global acc: 94.8%', timestamp: '09:29:12' },
  { id: '4', type: 'warning', message: 'Node HOSP-11 latency above threshold (680ms)', timestamp: '09:27:44' },
  { id: '5', type: 'info', message: 'Dataset "chest_xray_v4.csv" validated on node HOSP-04', timestamp: '09:25:10' },
];

const newEventPool: Omit<FeedEvent, 'id'>[] = [
  { type: 'success', message: 'Round 24 gradient upload complete', timestamp: '' },
  { type: 'info', message: 'New prediction request on Local Inference Engine', timestamp: '' },
  { type: 'warning', message: 'CPU load spiked to 78% on node HOSP-02', timestamp: '' },
  { type: 'success', message: 'Model checkpoint saved to /local/models/v24', timestamp: '' },
  { type: 'info', message: 'Admin verified hospital registration: St. Luke\'s', timestamp: '' },
];

const LiveFeed: React.FC = () => {
  const [events, setEvents] = useState<FeedEvent[]>(mockEvents);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      const pool = newEventPool;
      const next = pool[Math.floor(Math.random() * pool.length)];
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      setEvents(prev => [
        { ...next, id: Date.now().toString(), timestamp },
        ...prev.slice(0, 14), // Keep last 15
      ]);
    }, 4000);

    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="live-feed">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <Activity size={16} className="text-primary" />
          <span className="extra-small fw-bold uppercase-spacing text-muted">Network Event Stream</span>
        </div>
        <button
          className={`btn btn-sm py-1 px-3 rounded-pill fw-bold extra-small d-flex align-items-center gap-2 border transition-all ${isLive ? 'btn-danger bg-opacity-10 text-danger' : 'btn-light text-muted'}`}
          onClick={() => setIsLive(l => !l)}
        >
          <Circle size={8} className={isLive ? 'text-danger' : 'text-muted'} fill={isLive ? '#ef476f' : '#94a3b8'} />
          {isLive ? 'LIVE' : 'PAUSED'}
        </button>
      </div>

      <div className="feed-scroll" style={{ maxHeight: '340px', overflowY: 'auto' }}>
        {events.map((evt, i) => {
          const cfg = typeConfig[evt.type];
          return (
            <div
              key={evt.id}
              className="d-flex align-items-start gap-3 py-2 border-bottom border-light"
              style={{ animation: i === 0 && isLive ? 'fadeIn 0.4s ease' : 'none' }}
            >
              <span
                className="badge rounded-pill mt-1 flex-shrink-0 extra-small"
                style={{ backgroundColor: cfg.color + '20', color: cfg.color, minWidth: '42px', textAlign: 'center' }}
              >
                {cfg.label}
              </span>
              <div className="flex-grow-1">
                <p className="mb-0 small">{evt.message}</p>
                <span className="extra-small text-muted font-monospace">{evt.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .feed-scroll::-webkit-scrollbar { width: 4px; }
        .feed-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default LiveFeed;
