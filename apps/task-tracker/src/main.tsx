import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Task = { id: string; title: string; checked: boolean; phase: string; line: number; kind: string };
type TaskResponse = { source: string; readonly: boolean; fetchedAt: string; checksum: string; total: number; completed: number; tasks: Task[] };

const POLL_MS = 3000;

function App(): React.JSX.Element {
  const [data, setData] = useState<TaskResponse | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('All phases');
  const [showCompleted, setShowCompleted] = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);

  async function refresh(): Promise<void> {
    try {
      const response = await fetch('/api/tasks', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Checklist unavailable (${response.status})`);
      setData((await response.json()) as TaskResponse);
      setError('');
      setLastPoll(new Date());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Checklist unavailable');
    }
  }
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const phases = useMemo(() => [...new Set(data?.tasks.map((task) => task.phase) ?? [])], [data]);
  const visibleTasks = useMemo(() => (data?.tasks ?? []).filter((task) => {
    const text = `${task.id} ${task.title} ${task.phase}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) &&
      (phase === 'All phases' || task.phase === phase) && (showCompleted || !task.checked);
  }), [data, phase, query, showCompleted]);
  const percent = data?.total ? Math.round((data.completed / data.total) * 100) : 0;
  const grouped = visibleTasks.reduce<Record<string, Task[]>>((groups, task) => {
    (groups[task.phase] ??= []).push(task);
    return groups;
  }, {});

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark"><span>✦</span><div><strong>LUNA</strong><small>IMPLEMENTATION CONTROL</small></div></div>
      <div className="live-indicator"><i /> LIVE SYNC <span>every 3s</span></div>
    </header>
    <main>
      <section className="hero">
        <div><p className="kicker">Readonly source monitor</p><h1>Implementation<br /><em>command center</em></h1><p className="lede">A live view of every checkbox in <code>LUNA_IMPLEMENTATION_TASKS.md</code>. The markdown file remains the only source of truth.</p></div>
        <div className="progress-panel"><div className="progress-label"><span>Overall completion</span><b>{percent}%</b></div><div className="progress-track"><div style={{ width: `${percent}%` }} /></div><p>{data?.completed ?? 0} of {data?.total ?? '—'} checklist items complete</p></div>
      </section>
      <section className="toolbar" aria-label="Task filters"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search task ID or description…" /></label><select value={phase} onChange={(event) => setPhase(event.target.value)}><option>All phases</option>{phases.map((item) => <option key={item}>{item}</option>)}</select><label className="toggle"><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} /><span />Show completed</label></section>
      {error && <div className="error" role="alert">{error} <button onClick={() => void refresh()}>Retry</button></div>}
      {!data && !error && <div className="loading">Reading the checklist…</div>}
      {data && <div className="task-list">{Object.entries(grouped).map(([group, tasks]) => { const phaseTasks = data.tasks.filter((task) => task.phase === group); const phaseComplete = phaseTasks.filter((task) => task.checked).length; const phasePercent = phaseTasks.length ? Math.round((phaseComplete / phaseTasks.length) * 100) : 0; return <section className="phase" key={group}><div className="phase-heading"><div><span className="phase-number">{group.match(/Phase\s+(\d+)/)?.[1] ?? '—'}</span><h2>{group.replace(/\s+—\s+/, ' · ')}</h2></div><span>{phaseComplete}/{phaseTasks.length} complete · {phasePercent}%</span></div><div className="phase-progress" aria-label={`${group} progress`}><div style={{ width: `${phasePercent}%` }} /></div><div className="tasks">{tasks.map((task) => <article className={`task ${task.checked ? 'done' : ''}`} key={`${task.id}-${task.line}`}><div className="checkbox">{task.checked ? '✓' : ''}</div><div className="task-copy"><div className="task-meta"><b>{task.id}</b><span>{task.kind}</span><small>line {task.line}</small></div><p>{task.title}</p></div></article>)}</div></section>; })}</div>}
      {data && visibleTasks.length === 0 && <div className="empty">No checklist items match these filters.</div>}
      <footer><span>Source: <strong>{data?.source ?? 'LUNA_IMPLEMENTATION_TASKS.md'}</strong> · READ ONLY</span><span>{lastPoll ? `Last checked ${lastPoll.toLocaleTimeString()}` : 'Waiting for first poll'} · SHA {data?.checksum.slice(0, 10) ?? '—'}</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
