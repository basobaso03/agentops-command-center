import { NavLink } from 'react-router-dom';
import { ArrowLeftRight, BookOpen, Bot, GitBranch, LayoutDashboard, ScrollText, X } from 'lucide-react';

const navigationItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/agents', label: 'Agents', icon: Bot },
  { path: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { path: '/handoff', label: 'Handoff', icon: ArrowLeftRight },
  { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { path: '/logs', label: 'System Logs', icon: ScrollText }
];

export default function Sidebar({ isOpen = false, onNavigate }) {
  return (
    <aside id="primary-sidebar" className={`sidebar card ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="sidebar-close-button icon-button"
        aria-label="Close navigation menu"
        onClick={onNavigate}
      >
        <X size={18} />
      </button>

      <div className="sidebar-brand">
        <div className="brand-mark">BA</div>
        <div>
          <p className="brand-kicker">BASO</p>
          <h2>Command Center</h2>
        </div>
      </div>

      <nav aria-label="Primary" className="sidebar-nav">
        {navigationItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            aria-label={label}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
            onClick={onNavigate}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <footer className="sidebar-footer">
        <p>Created by M. Basera</p>
        <span>baseramarlvin@gmail.com</span>
      </footer>
    </aside>
  );
}