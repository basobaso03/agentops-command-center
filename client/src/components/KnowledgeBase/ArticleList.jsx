import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';

const categories = ['All', 'Policies', 'Procedures', 'Regulatory', 'Training'];

function formatDate(value) {
  if (!value) {
    return 'Never updated';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getCategoryClass(category) {
  const normalized = String(category || '').toLowerCase();

  if (normalized === 'policies') return 'kb-category kb-category--policies';
  if (normalized === 'procedures') return 'kb-category kb-category--procedures';
  if (normalized === 'regulatory') return 'kb-category kb-category--regulatory';
  if (normalized === 'training') return 'kb-category kb-category--training';
  return 'kb-category';
}

export default function ArticleList({ articles, selectedId, isLoading, onSelect, onNew }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isFiltersOpen, setIsFiltersOpen] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }

    return !window.matchMedia('(max-width: 768px)').matches;
  });

  const filteredArticles = useMemo(
    () =>
      articles.filter((article) => {
        const matchesSearch = String(article.title || '').toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'All' || article.category === category;
        return matchesSearch && matchesCategory;
      }),
    [articles, search, category]
  );

  function closeFiltersOnSmallScreens() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    if (window.matchMedia('(max-width: 768px)').matches) {
      setIsFiltersOpen(false);
    }
  }

  return (
    <div className="knowledge-base-list">
      <div className="section-heading">
        <h3>Articles</h3>
        <p>{articles.length} records from Supabase</p>
      </div>

      <p className="knowledge-base-filter-hint">Tap to show or hide search and category filters.</p>

      <button
        type="button"
        className="knowledge-base-filter-toggle"
        aria-expanded={isFiltersOpen}
        aria-controls="knowledge-base-filters"
        onClick={() => setIsFiltersOpen((currentValue) => !currentValue)}
      >
        <span>{isFiltersOpen ? 'Hide filters' : 'Show filters'}</span>
        {isFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <button type="button" className="btn knowledge-base-new-button" onClick={onNew}>
        <Plus size={16} />
        New Article
      </button>

      {isFiltersOpen ? (
        <div className="knowledge-base-toolbar" id="knowledge-base-filters">
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search articles"
            aria-label="Search articles"
          />

          <div className="knowledge-base-categories" role="tablist" aria-label="Knowledge base categories">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`knowledge-base-category-tab ${category === item ? 'is-active' : ''}`}
                onClick={() => {
                  setCategory(item);
                  closeFiltersOnSmallScreens();
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="knowledge-base-list-items">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="card knowledge-base-list-item skeleton-card">
              <div className="skeleton skeleton-line skeleton-line--short" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line skeleton-line--short" />
            </div>
          ))}
        </div>
      ) : (
        <div className="knowledge-base-list-items">
          {filteredArticles.length === 0 ? (
            <div className="card empty-panel">
              <p>No articles yet matching the current filters.</p>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <button
                key={article.id}
                type="button"
                aria-label={`Select article ${article.title}`}
                className={`card knowledge-base-list-item ${selectedId === article.id ? 'is-selected' : ''}`}
                onClick={() => {
                  onSelect(article.id);
                  closeFiltersOnSmallScreens();
                }}
              >
                <div className="knowledge-base-list-item__top">
                  <strong>{article.title}</strong>
                  <span className={getCategoryClass(article.category)}>{article.category}</span>
                </div>
                <p>{article.content}</p>
                <div className="knowledge-base-list-item__meta">
                  <span>Version {article.version}</span>
                  <span>{formatDate(article.updated_at)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}