import { useEffect, useMemo, useState } from 'react';
import { createArticle, deleteArticle, updateArticle } from '../../utils/api';

const categories = ['Policies', 'Procedures', 'Regulatory', 'Training'];
const statuses = ['draft', 'published', 'archived'];

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

export default function ArticleEditor({ article, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('published');
  const [changeSummary, setChangeSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(article?.title || '');
    setCategory(article?.category || categories[0]);
    setContent(article?.content || '');
    setStatus(article?.status || 'published');
    setChangeSummary('');
    setError('');
  }, [article]);

  const isNewArticle = !article;
  const versionLabel = useMemo(() => (article ? `Version ${article.version}` : 'Draft'), [article]);

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    if (!isNewArticle && !changeSummary.trim()) {
      setError('Change summary is required for updates.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      if (isNewArticle) {
        const createdArticle = await createArticle({
          title,
          category,
          content,
          status
        });

        await onSave(createdArticle);
        return;
      }

      const updatedArticle = await updateArticle(article.id, {
        title,
        category,
        content,
        status,
        change_summary: changeSummary
      });

      await onSave(updatedArticle);
    } catch (saveError) {
      setError('Unable to save this article right now.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!article || !window.confirm('Delete this article?')) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await deleteArticle(article.id);
      await onDelete(article.id);
    } catch (deleteError) {
      setError('Unable to delete this article right now.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="knowledge-base-editor">
      <div className="knowledge-base-editor__header">
        <div>
          <h3>{isNewArticle ? 'New Article' : article.title}</h3>
          <p>
            {versionLabel} · {article ? formatDate(article.updated_at) : 'Create and publish to store the first version'}
          </p>
        </div>
        <span className={`status-chip status-${status}`}>{status}</span>
      </div>

      {error ? <div className="dashboard-alert card">{error}</div> : null}

      <div className="knowledge-base-form-grid">
        <label className="knowledge-base-field">
          <span>Title</span>
          <input
            className="input"
            aria-label="Article title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="knowledge-base-field">
          <span>Category</span>
          <select
            className="input"
            aria-label="Article category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="knowledge-base-field">
          <span>Status</span>
          <select
            className="input"
            aria-label="Article status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="knowledge-base-field knowledge-base-field--wide">
          <span>Content</span>
          <textarea
            className="input knowledge-base-textarea"
            aria-label="Article content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>

        <label className="knowledge-base-field knowledge-base-field--wide">
          <span>Change Summary</span>
          <input
            className="input"
            aria-label="Change summary"
            value={changeSummary}
            onChange={(event) => setChangeSummary(event.target.value)}
            placeholder={isNewArticle ? 'Optional for new articles' : 'Required for updates'}
          />
        </label>
      </div>

      <div className="knowledge-base-actions">
        <button type="button" className="btn" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Article'}
        </button>
        {!isNewArticle ? (
          <button type="button" className="knowledge-base-delete-button" onClick={handleDelete} disabled={isSaving}>
            Delete Article
          </button>
        ) : null}
      </div>
    </div>
  );
}