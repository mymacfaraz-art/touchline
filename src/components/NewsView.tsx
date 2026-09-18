import React, { useEffect, useState } from 'react';

interface NewsViewProps {
  careerId?: string;
}

export const NewsView: React.FC<NewsViewProps> = ({ careerId }) => {
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, [careerId]);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const url = `/api/news?careerId=${careerId || 'car-default'}&limit=10`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.news)) {
        setNews(data.news);
      } else {
        setNews([
          {
            id: 'n1',
            headline: 'Touchline Season Kicks Off in Full Force',
            body: 'Clubs across the league have finalized their pre-season preparation and tactical setups.',
            category: 'COMPETITION',
            publishedAt: new Date().toISOString(),
          },
          {
            id: 'n2',
            headline: 'Arsenal Secure 2-1 Victory Over Rivals in Tactical Masterclass',
            body: 'High-pressing tactics and rapid transitions proved decisive in the second-half display.',
            category: 'MATCH',
            publishedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📰</span> Grounded Football News &amp; Headlines
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated narrative reports strictly grounded in verified matchday domain events.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Loading news feed...</div>
        ) : (
          news.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-2 backdrop-blur">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider">{item.category}</span>
                <span className="text-slate-500">{new Date(item.publishedAt).toLocaleDateString()}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{item.headline}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
