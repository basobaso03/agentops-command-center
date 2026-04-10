import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchVersions } from '../../utils/api';

function formatDate(value) {
  if (!value) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function diffLines(currentContent = '', previousContent = '') {
  const currentLines = String(currentContent).split('\n');
  const previousLines = String(previousContent).split('\n');
  const totalLines = Math.max(currentLines.length, previousLines.length);

  return Array.from({ length: totalLines }, (_, index) => {
    const currentLine = currentLines[index] ?? '';
    const previousLine = previousLines[index] ?? '';

    if (currentLine === previousLine) {
      return { type: 'same', text: currentLine };
    }

    return [
      previousLine ? { type: 'removed', text: previousLine } : null,
      currentLine ? { type: 'added', text: currentLine } : null
    ].filter(Boolean);
  }).flat();
}

export default function VersionHistory({ article }) {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const diffPanelRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadVersions() {
      setIsLoading(true);
      setError('');
      setSelectedVersion(null);

      try {
        const data = await fetchVersions(article.id);

        if (!isMounted) {
          return;
        }

        setVersions(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (isMounted) {
          setError('Unable to load version history.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadVersions();

    return () => {
      isMounted = false;
    };
  }, [article.id]);

  const currentVersion = useMemo(() => versions.find((version) => Number(version.version) === Number(article.version)) || null, [versions, article.version]);

  const comparisonVersion = selectedVersion || versions[0] || null;
  const diff = useMemo(() => {
    if (!comparisonVersion) {
      return [];
    }

    const sourceContent = currentVersion ? currentVersion.content : article.content;
    return diffLines(sourceContent, comparisonVersion.content);
  }, [article.content, comparisonVersion, currentVersion]);

  function handleCompareClick(version) {
    setSelectedVersion(version);
    // Give state a tick to update naturally, jump to panel
    setTimeout(() => {
      diffPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 150);
  }

  return (
    <div className="knowledge-base-history">
      <div className="section-heading">
        <h3>Version History</h3>
        <p>Track each saved version and compare changes against the current article.</p>
      </div>

      {error ? <div className="dashboard-alert card">{error}</div> : null}

      {isLoading ? (
        <div className="knowledge-base-history-loading">
          <div className="skeleton skeleton-line skeleton-line--short" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
        </div>
      ) : (
        <div className="knowledge-base-history-grid">
          <div className="knowledge-base-version-list">
            {versions.length === 0 ? (
              <div className="empty-state">No saved versions yet.</div>
            ) : (
              versions.map((version) => (
                <article key={version.id} className={`knowledge-base-version-item ${comparisonVersion?.id === version.id ? 'is-selected' : ''}`}>
                  <button type="button" className="knowledge-base-version-button" onClick={() => handleCompareClick(version)}>
                    <div>
                      <strong>Version {version.version}</strong>
                      <p>{formatDate(version.created_at)}</p>
                    </div>
                    <span>{version.change_summary || 'No summary provided'}</span>
                  </button>
                  <button type="button" className="knowledge-base-compare-button" onClick={() => handleCompareClick(version)}>
                    Compare with current
                  </button>
                </article>
              ))
            )}
          </div>

          <div ref={diffPanelRef} className="knowledge-base-diff-panel">
            <div className="section-heading">
              <h4>{comparisonVersion ? `Version ${comparisonVersion.version}` : 'Select a version'}</h4>
              <p>{comparisonVersion?.change_summary || 'Pick a saved version to compare against the current article.'}</p>
            </div>

            {comparisonVersion ? (
              <article className="knowledge-base-response card">
                <div className="section-heading">
                  <h4>Version Content</h4>
                  <p>{formatDate(comparisonVersion.created_at)}</p>
                </div>
                <pre className="knowledge-base-response__content">{comparisonVersion.content}</pre>
              </article>
            ) : null}

            <article className="knowledge-base-diff-content">
              {diff.length === 0 ? (
                <p className="empty-state">Select a version to view the diff.</p>
              ) : (
                diff.map((line, index) => (
                  <pre key={`${line.type}-${index}`} className={`knowledge-base-diff-line knowledge-base-diff-line--${line.type}`}>
                    {line.type === 'added' ? `+ ${line.text}` : line.type === 'removed' ? `- ${line.text}` : `  ${line.text}`}
                  </pre>
                ))
              )}
            </article>
          </div>
        </div>
      )}
    </div>
  );
}