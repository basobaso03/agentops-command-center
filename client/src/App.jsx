import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, matchPath, useLocation } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Pipelines from './pages/Pipelines';
import Handoff from './pages/Handoff';
import KnowledgeBase from './pages/KnowledgeBase';
import Logs from './pages/Logs';

const routes = [
  { path: '/', title: 'Dashboard', element: <Dashboard /> },
  { path: '/agents', title: 'Agents', element: <Agents /> },
  { path: '/agents/:id', title: 'Agent Detail', element: <AgentDetail /> },
  { path: '/pipelines', title: 'Pipelines', element: <Pipelines /> },
  { path: '/handoff', title: 'Handoff', element: <Handoff /> },
  { path: '/knowledge-base', title: 'Knowledge Base', element: <KnowledgeBase /> },
  { path: '/logs', title: 'System Logs', element: <Logs /> }
];

function getCurrentTitle(pathname) {
  const matchedRoute = routes.find((route) => matchPath({ path: route.path, end: true }, pathname));
  return matchedRoute?.title ?? 'BASO Command Center';
}

function AppLayout() {
  const location = useLocation();
  const title = getCurrentTitle(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app-shell ${isSidebarOpen ? 'is-sidebar-open' : ''}`}>
      {isSidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />
      <div className="app-content">
        <Header
          title={title}
          isSidebarOpen={isSidebarOpen}
          onMenuToggle={() => setIsSidebarOpen((currentValue) => !currentValue)}
        />
        <main className="page-stack">
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
