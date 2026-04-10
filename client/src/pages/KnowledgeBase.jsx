import { useEffect, useMemo, useState } from 'react';
import { fetchArticles } from '../utils/api';
import ArticleList from '../components/KnowledgeBase/ArticleList';
import ArticleEditor from '../components/KnowledgeBase/ArticleEditor';
import VersionHistory from '../components/KnowledgeBase/VersionHistory';

const categoryOrder = ['All', 'Policies', 'Procedures', 'Regulatory', 'Training'];

function buildCategoryCounts(articles) {
  return categoryOrder.slice(1).map((category) => ({
    category,
    count: articles.filter((article) => article.category === category).length
  }));
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [viewMode, setViewMode] = useState('edit');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobilePane, setMobilePane] = useState('list');
  const [feedback, setFeedback] = useState('');

  function showFeedback(message) {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 3000);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadArticles() {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchArticles();

        if (!isMounted) {
          return;
        }

        const articleList = Array.isArray(data) ? data : [];
        setArticles(articleList);
        setSelectedId((currentId) => currentId || articleList[0]?.id || '');
      } catch (loadError) {
        if (isMounted) {
          setError('Unable to load the knowledge base right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadArticles();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedId) || null,
    [articles, selectedId]
  );

  const categoryCounts = useMemo(() => buildCategoryCounts(articles), [articles]);

  async function refreshArticles(nextSelectedId = selectedId) {
    const data = await fetchArticles();
    const articleList = Array.isArray(data) ? data : [];
    setArticles(articleList);
    setSelectedId(nextSelectedId || articleList[0]?.id || '');
    setViewMode('edit');
    setIsHistoryExpanded(false);
  }

  async function handleRetry() {
    setError('');
    setIsLoading(true);

    try {
      const data = await fetchArticles();
      const articleList = Array.isArray(data) ? data : [];
      setArticles(articleList);
      setSelectedId((currentId) => currentId || articleList[0]?.id || '');
    } catch (loadError) {
      setError('Unable to load the knowledge base right now.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreateNew() {
    setSelectedId('new');
    setViewMode('edit');
    setIsHistoryExpanded(false);
    setMobilePane('workspace');
  }

  return (
    <section className="page-fade-in knowledge-base-page">
      <article className="card page-card knowledge-base-hero">
        <p className="badge">Live knowledge base</p>
        <h2>Knowledge Base</h2>
        <p>
          Manage versioned articles directly from Supabase, track edits, and compare historical changes.
        </p>
      </article>

      {error ? (
        <div className="dashboard-alert card knowledge-base-error">
          <span>{error}</span>
          <button type="button" className="knowledge-base-compare-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="knowledge-base-stats card">
        <div>
          <span className="knowledge-base-stat-value">{articles.length}</span>
          <span className="knowledge-base-stat-label">Total articles</span>
        </div>
        {categoryCounts.map((item) => (
          <div key={item.category}>
            <span className="knowledge-base-stat-value">{item.count}</span>
            <span className="knowledge-base-stat-label">{item.category}</span>
          </div>
        ))}
      </div>

      <div
        className={`knowledge-base-layout ${
          mobilePane === 'workspace' ? 'is-workspace-active' : 'is-list-active'
        }`}
      >
        <aside className="card knowledge-base-list-panel">
          <ArticleList
            articles={articles}
            selectedId={selectedId}
            isLoading={isLoading}
            onSelect={(articleId) => {
              setSelectedId(articleId);
              setViewMode('edit');
              setIsHistoryExpanded(false);
              setMobilePane('workspace');
            }}
            onNew={handleCreateNew}
          />
        </aside>

        <section className="knowledge-base-workspace">
          <button
            type="button"
            className="knowledge-base-mobile-back"
            onClick={() => setMobilePane('list')}
          >
            Back to articles
          </button>

          <div className="knowledge-base-tabs card">
            <div className="section-heading">
              <h3>{selectedArticle?.title || 'New Article'}</h3>
              <p>{selectedArticle ? `Version ${selectedArticle.version}` : 'Create a new knowledge base article'}</p>
            </div>

            <div className="knowledge-base-tab-buttons">
              <button
                type="button"
                className={`knowledge-base-tab ${viewMode === 'edit' ? 'is-active' : ''}`}
                onClick={() => setViewMode('edit')}
              >
                Edit
              </button>
              <button
                type="button"
                className={`knowledge-base-tab ${viewMode === 'history' ? 'is-active' : ''}`}
                onClick={() => setViewMode('history')}
                disabled={!selectedArticle}
              >
                History
              </button>
            </div>
          </div>

          <div className="knowledge-base-panel card">
            {isLoading ? (
              <div className="knowledge-base-loading">
                <div className="skeleton skeleton-line skeleton-line--short" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line skeleton-line--short" />
              </div>
            ) : viewMode === 'history' && selectedArticle ? (
              <VersionHistory article={selectedArticle} />
            ) : (
              <>
                <ArticleEditor
                  article={selectedArticle && selectedId !== 'new' ? selectedArticle : null}
                  onSave={async (payload) => {
                    await refreshArticles(payload?.id || selectedId);
                    showFeedback('Article saved successfully');
                  }}
                  onDelete={async () => {
                    await refreshArticles('');
                    showFeedback('Article deleted successfully');
                  }}
                />

                {selectedArticle ? (
                  <details
                    className="knowledge-base-history-accordion"
                    open={isHistoryExpanded}
                    onToggle={(event) => setIsHistoryExpanded(event.currentTarget.open)}
                  >
                    <summary className="knowledge-base-history-summary">
                      <span>Version history</span>
                      <span className="knowledge-base-history-summary__hint">Tap to review past edits</span>
                    </summary>

                    <div className="knowledge-base-history-accordion__content">
                      <VersionHistory article={selectedArticle} />
                    </div>
                  </details>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>

      {mobilePane === 'workspace' ? (
        <button
          type="button"
          className="knowledge-base-mobile-return-fab"
          onClick={() => setMobilePane('list')}
        >
          Back to articles
        </button>
      ) : null}

      {feedback ? (
        <div className="toast-notification">
          {feedback}
        </div>
      ) : null}
    </section>
  );
}