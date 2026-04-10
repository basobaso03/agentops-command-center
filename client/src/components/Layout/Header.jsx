import { useEffect, useState } from 'react';
import { Bell, Menu } from 'lucide-react';

function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export default function Header({ title, isSidebarOpen, onMenuToggle }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="topbar card">
      <div className="topbar-leading">
        <button
          type="button"
          className="sidebar-toggle icon-button"
          aria-label={isSidebarOpen ? 'Hide navigation menu' : 'Show navigation menu'}
          aria-controls="primary-sidebar"
          aria-expanded={isSidebarOpen}
          onClick={onMenuToggle}
        >
          <Menu size={18} />
        </button>

        <div>
          <p className="topbar-label">Workspace</p>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="topbar-meta">
        <span className="topbar-time">{formatDateTime(now)}</span>
        <button type="button" className="icon-button" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-badge">3</span>
        </button>
        <div className="avatar-circle" aria-hidden="true">
          MB
        </div>
      </div>
    </header>
  );
}