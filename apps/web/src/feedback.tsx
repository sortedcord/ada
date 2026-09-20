/* eslint-disable */
import { useState, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, CheckCircle2, MessageSquare, Terminal } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';

export function FeedbackPage(): React.JSX.Element {
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [statusMessage, setStatusMessage] = useState('');
  const [history, setHistory] = useState<Array<{ text: string; timestamp: string; status: 'sent' | 'fallback' }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('meta_feedback_history') || '[]');
    } catch {
      return [];
    }
  });

  const checkHealth = async () => {
    // Check if the backend API is up and capable of receiving feedback
    try {
      const res = await fetch('/api/v1/system/info', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        setBridgeStatus('connected');
        return true;
      }
    } catch {
      // Not responding
    }
    setBridgeStatus('disconnected');
    return false;
  };

  useEffect(() => {
    void checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = prompt.trim();
    if (!text || sending) return;

    setSending(true);
    setStatusMessage('');

    try {
      const res = await fetch('/api/v1/meta/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok) {
        const newEntry = { text, timestamp: new Date().toLocaleTimeString(), status: 'sent' as const };
        const updated = [newEntry, ...history.slice(0, 19)];
        setHistory(updated);
        localStorage.setItem('meta_feedback_history', JSON.stringify(updated));
        setPrompt('');
        setStatusMessage('Feedback queued directly into Pi session inbox!');
        setSending(false);
        return;
      }

      throw new Error(`Server returned status ${res.status}`);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message || 'Failed to send'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider text-indigo-400 border-indigo-500/30">
            Developer Meta Tool
          </Badge>
          <Badge
            variant={bridgeStatus === 'connected' ? 'default' : 'secondary'}
            className={bridgeStatus === 'connected' ? 'bg-emerald-600' : ''}
          >
            {bridgeStatus === 'connected' ? 'Pi Session Linked' : 'Bridge Offline / Queued'}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-1 flex items-center gap-2">
          <Terminal className="w-6 h-6 text-indigo-400" />
          Realtime Pi Prompt & Feedback
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Type immediate bugs, thoughts, or requests here. Messages are piped directly into the active Pi harness turn.
        </p>
      </div>

      <Card className="border-indigo-500/30 bg-card/60 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Direct Prompt Dispatch</span>
            <span className="text-xs font-normal text-muted-foreground">Ctrl+Enter / Enter to submit</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Any prompt submitted here is queued immediately into the Pi CLI session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmit();
                  }
                }}
                rows={4}
                placeholder="e.g. 'The café description is great, but could we add music playing in the background?'"
                className="resize-none font-sans text-sm rounded-xl pr-12 focus-visible:ring-indigo-500"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!prompt.trim() || sending}
                className="absolute right-2.5 bottom-2.5 bg-indigo-600 hover:bg-indigo-500 text-white h-8 w-8 rounded-lg shadow"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {statusMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  statusMessage.includes('Error')
                    ? 'bg-destructive/15 text-destructive border border-destructive/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {statusMessage.includes('Error') ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* History Log */}
      {history.length > 0 && (
        <Card className="bg-card/40 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Recent Feedback Dispatched ({history.length})</span>
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem('meta_feedback_history');
                }}
                className="text-[10px] text-muted-foreground hover:text-destructive underline"
              >
                Clear
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40 text-xs">
            {history.map((item, idx) => (
              <div key={idx} className="py-2.5 space-y-1 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-mono">{item.timestamp}</span>
                  <Badge variant="outline" className="text-[9px]">
                    {item.status === 'sent' ? 'Delivered to Pi' : 'Saved'}
                  </Badge>
                </div>
                <p className="text-foreground/90 leading-relaxed font-sans">{item.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
