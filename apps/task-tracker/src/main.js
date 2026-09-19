import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
const POLL_MS = 3000;
function App() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [phase, setPhase] = useState('All phases');
    const [showCompleted, setShowCompleted] = useState(true);
    const [lastPoll, setLastPoll] = useState(null);
    async function refresh() {
        try {
            const response = await fetch('/api/tasks', { cache: 'no-store' });
            if (!response.ok)
                throw new Error(`Checklist unavailable (${response.status})`);
            setData((await response.json()));
            setError('');
            setLastPoll(new Date());
        }
        catch (reason) {
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
    const grouped = visibleTasks.reduce((groups, task) => {
        (groups[task.phase] ??= []).push(task);
        return groups;
    }, {});
    return _jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "brand-mark", children: [_jsx("span", { children: "\u2726" }), _jsxs("div", { children: [_jsx("strong", { children: "LUNA" }), _jsx("small", { children: "IMPLEMENTATION CONTROL" })] })] }), _jsxs("div", { className: "live-indicator", children: [_jsx("i", {}), " LIVE SYNC ", _jsx("span", { children: "every 3s" })] })] }), _jsxs("main", { children: [_jsxs("section", { className: "hero", children: [_jsxs("div", { children: [_jsx("p", { className: "kicker", children: "Readonly source monitor" }), _jsxs("h1", { children: ["Implementation", _jsx("br", {}), _jsx("em", { children: "command center" })] }), _jsxs("p", { className: "lede", children: ["A live view of every checkbox in ", _jsx("code", { children: "LUNA_IMPLEMENTATION_TASKS.md" }), ". The markdown file remains the only source of truth."] })] }), _jsxs("div", { className: "progress-panel", children: [_jsxs("div", { className: "progress-label", children: [_jsx("span", { children: "Overall completion" }), _jsxs("b", { children: [percent, "%"] })] }), _jsx("div", { className: "progress-track", children: _jsx("div", { style: { width: `${percent}%` } }) }), _jsxs("p", { children: [data?.completed ?? 0, " of ", data?.total ?? '—', " checklist items complete"] })] })] }), _jsxs("section", { className: "toolbar", "aria-label": "Task filters", children: [_jsxs("label", { className: "search", children: [_jsx("span", { children: "\u2315" }), _jsx("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Search task ID or description\u2026" })] }), _jsxs("select", { value: phase, onChange: (event) => setPhase(event.target.value), children: [_jsx("option", { children: "All phases" }), phases.map((item) => _jsx("option", { children: item }, item))] }), _jsxs("label", { className: "toggle", children: [_jsx("input", { type: "checkbox", checked: showCompleted, onChange: (event) => setShowCompleted(event.target.checked) }), _jsx("span", {}), "Show completed"] })] }), error && _jsxs("div", { className: "error", role: "alert", children: [error, " ", _jsx("button", { onClick: () => void refresh(), children: "Retry" })] }), !data && !error && _jsx("div", { className: "loading", children: "Reading the checklist\u2026" }), data && _jsx("div", { className: "task-list", children: Object.entries(grouped).map(([group, tasks]) => { const phaseTasks = data.tasks.filter((task) => task.phase === group); const phaseComplete = phaseTasks.filter((task) => task.checked).length; const phasePercent = phaseTasks.length ? Math.round((phaseComplete / phaseTasks.length) * 100) : 0; return _jsxs("section", { className: "phase", children: [_jsxs("div", { className: "phase-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "phase-number", children: group.match(/Phase\s+(\d+)/)?.[1] ?? '—' }), _jsx("h2", { children: group.replace(/\s+—\s+/, ' · ') })] }), _jsxs("span", { children: [phaseComplete, "/", phaseTasks.length, " complete \u00B7 ", phasePercent, "%"] })] }), _jsx("div", { className: "phase-progress", "aria-label": `${group} progress`, children: _jsx("div", { style: { width: `${phasePercent}%` } }) }), _jsx("div", { className: "tasks", children: tasks.map((task) => _jsxs("article", { className: `task ${task.checked ? 'done' : ''}`, children: [_jsx("div", { className: "checkbox", children: task.checked ? '✓' : '' }), _jsxs("div", { className: "task-copy", children: [_jsxs("div", { className: "task-meta", children: [_jsx("b", { children: task.id }), _jsx("span", { children: task.kind }), _jsxs("small", { children: ["line ", task.line] })] }), _jsx("p", { children: task.title })] })] }, `${task.id}-${task.line}`)) })] }, group); }) }), data && visibleTasks.length === 0 && _jsx("div", { className: "empty", children: "No checklist items match these filters." }), _jsxs("footer", { children: [_jsxs("span", { children: ["Source: ", _jsx("strong", { children: data?.source ?? 'LUNA_IMPLEMENTATION_TASKS.md' }), " \u00B7 READ ONLY"] }), _jsxs("span", { children: [lastPoll ? `Last checked ${lastPoll.toLocaleTimeString()}` : 'Waiting for first poll', " \u00B7 SHA ", data?.checksum.slice(0, 10) ?? '—'] })] })] })] });
}
createRoot(document.getElementById('root')).render(_jsx(App, {}));
//# sourceMappingURL=main.js.map