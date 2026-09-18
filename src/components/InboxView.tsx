import React, { useEffect, useState } from 'react';

interface InboxViewProps {
  careerId?: string;
}

export const InboxView: React.FC<InboxViewProps> = ({ careerId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInbox();
  }, [careerId]);

  const fetchInbox = async () => {
    setIsLoading(true);
    try {
      const url = `/api/inbox?careerId=${careerId || 'car-default'}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([
          {
            id: 'm1',
            title: 'Board Objectives Update: High Approval',
            content: 'The board has reviewed recent performances and confirmed high satisfaction with squad morale.',
            sender: 'Board Office',
            date: '15 Aug 2024',
            isRead: false,
          },
          {
            id: 'm2',
            title: 'Transfer Window Reminder',
            content: 'The transfer window remains open for 14 more days. Review scouting reports promptly.',
            sender: 'Chief Scout',
            date: '12 Aug 2024',
            isRead: true,
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching inbox:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📬</span> Manager Inbox &amp; Notifications
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Board reports, transfer offers, injury notifications, and squad updates.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Loading inbox messages...</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition-all ${
                !m.isRead ? 'bg-slate-900 border-emerald-500/40 text-white font-semibold' : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-emerald-400">{m.sender}</span>
                <span className="text-slate-500">{m.date}</span>
              </div>
              <h3 className="text-sm font-bold text-white">{m.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{m.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
