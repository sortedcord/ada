/* eslint-disable */
import { StrictMode, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { createRoot } from 'react-dom/client';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import {
  BookOpen,
  Play,
  Settings as SettingsIcon,
  FileCode2,
  Sun,
  Moon,
  Send,
  Sparkles,
  RefreshCw,
  Plus,
  Upload,
  Copy,
  Archive,
  Download,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  Compass,
  User,
  X,
  MessageSquareCode,
  Activity,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FeedbackPage } from './feedback';
import { api, createClientIdempotencyKey, type ScenarioAggregate } from './api';
import { SafeMarkdown } from './markdown';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import './styles.css';

function Shell(): React.JSX.Element {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>Narrative Engine</span>
            </Link>
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link
                to="/runs"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                activeProps={{ className: 'text-foreground font-semibold' }}
              >
                <Play className="w-4 h-4" />
                <span>Play Adventure</span>
              </Link>
              <Link
                to="/scenarios"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                activeProps={{ className: 'text-foreground font-semibold' }}
              >
                <BookOpen className="w-4 h-4" />
                <span>Scenarios</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                activeProps={{ className: 'text-foreground font-semibold' }}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Settings</span>
              </Link>
              <Link
                to="/feedback"
                className="flex items-center gap-1.5 text-amber-400/90 hover:text-amber-300 transition-colors"
                activeProps={{ className: 'text-amber-300 font-semibold' }}
              >
                <MessageSquareCode className="w-4 h-4" />
                <span>Feedback</span>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border rounded px-2 py-1"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>OpenAPI</span>
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

function Dashboard(): React.JSX.Element {
  const scenarios = useQuery({
    queryKey: ['dashboard-scenarios'],
    queryFn: () => api.listScenarios('?limit=4'),
  });
  const models = useQuery({ queryKey: ['settings-models'], queryFn: api.getModelSettings });
  const embeddings = useQuery({
    queryKey: ['settings-embeddings'],
    queryFn: api.getEmbeddingSettings,
  });

  return (
    <div className="space-y-8 py-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-indigo-950/40 to-background p-8 md:p-12 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
            Interactive Fiction Engine
          </Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Infinite stories with persistent memory & canon.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Step into handcrafted worlds. The AI acts as your narrator and NPC orchestrator, respecting distinct truth, memories, and epistemic secrets.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow">
              <Link to="/runs">
                <Play className="w-4 h-4 mr-2" /> Start Playing
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/scenarios">
                <BookOpen className="w-4 h-4 mr-2" /> Browse Scenarios
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Generative AI Model</CardDescription>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{models.data?.defaultModel ? models.data.defaultModel.split('/').pop() : 'Default Model'}</span>
              <Badge variant={models.data?.configured ? 'default' : 'secondary'} className={models.data?.configured ? 'bg-emerald-600' : ''}>
                {models.data?.configured ? 'Active' : 'Unconfigured'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Provider: {models.data?.provider || 'aditya-gupta'} (OpenAI Responses)
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Vector Retrieval</CardDescription>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>pgvector</span>
              <Badge variant={embeddings.data?.enabled ? 'default' : 'secondary'} className={embeddings.data?.enabled ? 'bg-emerald-600' : ''}>
                {embeddings.data?.enabled ? '1536d Cosine' : 'Lexical Only'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {embeddings.data?.enabled ? 'Semantic memories & lore activated' : 'Full-text keyword fallback active'}
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Epistemic Privacy</CardDescription>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Zero-Leakage</span>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">Enforced</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            NPC thoughts and secrets are strictly principal-isolated at the SQL layer.
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Available Worlds</h2>
            <p className="text-sm text-muted-foreground">Select a scenario or continue an existing journey.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/scenarios">View all</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {scenarios.data?.map((scenario) => (
            <Card key={scenario.id} className="hover:border-indigo-500/50 transition-all flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{scenario.status}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">Rev {scenario.currentRevision}</span>
                </div>
                <CardTitle className="text-xl mt-2">{scenario.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  Slug: {scenario.slug}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild className="w-full">
                  <Link to="/scenarios/$scenarioId" params={{ scenarioId: scenario.id }}>
                    Configure World
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function RunsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const runs = useQuery({ queryKey: ['runs'], queryFn: api.listRuns });
  const scenarios = useQuery({
    queryKey: ['scenarios-for-runs'],
    queryFn: () => api.listScenarios('?status=valid'),
  });

  const [selected, setSelected] = useState('');
  const [newScenarioId, setNewScenarioId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [createError, setCreateError] = useState('');
  const [draft, setDraft] = useState('');

  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  const selectedScenarioDetails = useQuery({
    queryKey: ['scenario-details', newScenarioId],
    queryFn: () => api.getScenario(newScenarioId),
    enabled: Boolean(newScenarioId),
  });

  const createRunMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScenarioDetails.data) throw new Error('Select a scenario first');
      const revId = selectedScenarioDetails.data.revision.id;
      const entities = selectedScenarioDetails.data.revision.aggregate.entities as Array<{
        id: string;
        name?: string;
        playable?: boolean;
      }>;
      const playerId = selectedPlayerId || entities.find((e) => e.playable)?.id;
      if (!playerId) throw new Error('No playable character found in this scenario');
      return api.createRun(revId, playerId);
    },
    onSuccess: (data) => {
      setCreateError('');
      void queryClient.invalidateQueries({ queryKey: ['runs'] });
      setSelected(data.runId);
      setNewScenarioId('');
      setSelectedPlayerId('');
    },
    onError: (err: unknown) =>
      setCreateError(err instanceof Error ? err.message : 'Failed to start run'),
  });

  const run = useQuery({
    queryKey: ['run', selected],
    queryFn: () => api.getRun(selected),
    enabled: Boolean(selected),
    refetchInterval: selected ? 1_500 : false,
  });

  const scene = useQuery({
    queryKey: ['scene', selected],
    queryFn: () => api.getScene(selected),
    enabled: Boolean(selected),
    refetchInterval: selected ? 2_000 : false,
  });

  const timeline = useQuery({
    queryKey: ['timeline', selected],
    queryFn: () => api.getTimeline(selected),
    enabled: Boolean(selected),
    refetchInterval: selected ? 1_500 : false,
  });

  const journal = useQuery({
    queryKey: ['journal', selected],
    queryFn: () => api.getJournal(selected),
    enabled: Boolean(selected),
    refetchInterval: selected ? 3_000 : false,
  });

  const embeddings = useQuery({
    queryKey: ['settings-embeddings-run'],
    queryFn: api.getEmbeddingSettings,
    enabled: Boolean(selected),
    staleTime: 30_000,
  });

  const [journalOpen, setJournalOpen] = useState(false);

  const details = useMutation({
    mutationFn: (segmentId: string) => api.getResponseDetails(selected, segmentId),
  });

  const turn = useMutation({
    mutationFn: async () => {
      // Always fetch the freshest run state so we never submit a stale expectedVersion
      const freshRun = await api.getRun(selected);
      return api.acceptTurn(selected, {
        text: draft,
        idempotencyKey: createClientIdempotencyKey(),
        expectedVersion: freshRun.expectedVersion,
        branchId: freshRun.activeBranchId || run.data?.activeBranchId || '',
      });
    },
    onSuccess: () => {
      setDraft('');
      void run.refetch();
      void timeline.refetch();
      void scene.refetch();
    },
  });

  useEffect(() => {
    if (timeline.data?.length) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeline.data]);

  const [activeNpcModal, setActiveNpcModal] = useState<any | null>(null);

  // Determine current scene location: default to the player entity or start location
  const playerEntity = (scene.data?.entities as any[])?.find((e: any) => e.playable);
  const playerRawLoc = playerEntity?.state?.locationId;
  const currentSceneLocationId =
    playerRawLoc && playerRawLoc !== 'dorm_suite'
      ? playerRawLoc
      : ((scene.data?.entities as any[])?.find((e: any) => e.entityId === 'danielle_carter')?.state?.locationId ?? 'campus_quad');

  const presentNpcs =
    ((scene.data?.entities as any[]) ?? []).filter(
      (e: any) =>
        !e.playable &&
        e.state?.active !== false &&
        (e.state?.locationId === currentSceneLocationId || !e.state?.locationId),
    );

  const otherNpcs =
    ((scene.data?.entities as any[]) ?? []).filter(
      (e: any) =>
        !e.playable &&
        e.state?.active !== false &&
        e.state?.locationId &&
        e.state?.locationId !== currentSceneLocationId,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Adventures</h1>
          <p className="text-sm text-muted-foreground">Select an ongoing adventure or embark on a new one.</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selected} onValueChange={(val) => setSelected(val)}>
            <SelectTrigger className="w-[260px] bg-background">
              <SelectValue placeholder="Choose an active run..." />
            </SelectTrigger>
            <SelectContent>
              {runs.data?.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.id.slice(0, 12)}... (Turn {item.currentTurn})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void timeline.refetch();
                void run.refetch();
              }}
              title="Refresh story state"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="max-w-xl mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Begin an Adventure</CardTitle>
              <CardDescription>
                Choose a published scenario and select your character to embark.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scenario</label>
                <Select value={newScenarioId} onValueChange={(val) => {
                  setNewScenarioId(val);
                  setSelectedPlayerId('');
                }}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select a scenario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.data?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title} ({s.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedScenarioDetails.data && (() => {
                const playableEntities = (
                  selectedScenarioDetails.data.revision.aggregate.entities as Array<{
                    id: string;
                    name?: string;
                    playable?: boolean;
                  }>
                ).filter((e) => e.playable);
                return (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Character Role</label>
                    <Select
                      value={selectedPlayerId || playableEntities[0]?.id || ''}
                      onValueChange={(val) => setSelectedPlayerId(val)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Choose playable protagonist..." />
                      </SelectTrigger>
                      <SelectContent>
                        {playableEntities.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name ?? e.id} (Protagonist)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}

              <Button
                disabled={!newScenarioId || createRunMutation.isPending}
                onClick={() => createRunMutation.mutate()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2"
              >
                {createRunMutation.isPending ? 'Staging Adventure...' : 'Start Adventure'}
              </Button>
              {createError && (
                <div className="p-3 text-xs rounded bg-destructive/15 text-destructive border border-destructive/20">
                  {createError}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col min-h-[calc(100vh-5rem)] pb-24 md:pb-28">
          {/* Top Characters & Avatars Strip */}
          <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b py-2 px-1 -mx-4 md:mx-0 md:px-0 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2.5 px-2 overflow-x-auto">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider shrink-0 mr-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-foreground font-semibold">{currentSceneLocationId.replace(/_/g, ' ')}</span>
              </span>

              {/* Deterministic In-World Time Display */}
              <span className="text-[10px] uppercase font-mono font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>
                  {scene.data?.worldTime
                    ? new Date(scene.data.worldTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '04:00 PM'}
                </span>
              </span>

              <span className="text-muted-foreground/40 shrink-0">|</span>

              {/* Characters Avatar Bar - Dynamically sorted with present active characters on the left */}
              {((scene.data?.entities as any[]) ?? [])
                .filter((e: any) => !e.playable)
                .map((npc: any) => {
                  const isPresent =
                    npc.state?.locationId === currentSceneLocationId ||
                    (!npc.state?.locationId && currentSceneLocationId === 'campus_quad');
                  return { ...npc, isPresent };
                })
                .sort((a: any, b: any) => {
                  // Active/present NPCs sort first to the left; then alphabetically by name
                  if (a.isPresent && !b.isPresent) return -1;
                  if (!a.isPresent && b.isPresent) return 1;
                  return (a.name || '').localeCompare(b.name || '');
                })
                .map((npc: any) => {
                  const initials = npc.name
                    ? npc.name
                        .split(' ')
                        .filter((p: string) => !p.startsWith('“') && !p.startsWith('"'))
                        .map((p: string) => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'NPC';

                  return (
                    <button
                      key={npc.entityId}
                      type="button"
                      onClick={() => setActiveNpcModal(npc)}
                      title={`${npc.name} (${npc.isPresent ? 'Present' : 'Absent'})`}
                      className={`relative flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all hover:scale-110 shrink-0 ${
                        npc.isPresent
                          ? 'ring-2 ring-emerald-500 bg-emerald-950/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                          : 'ring-1 ring-border/50 bg-secondary/40 text-muted-foreground opacity-50 hover:opacity-80'
                      }`}
                    >
                      <span>{initials}</span>
                      {npc.isPresent && (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-background" />
                      )}
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center gap-2 shrink-0 pr-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${embeddings.data?.enabled ? 'text-violet-300 border-violet-500/30' : 'text-emerald-300 border-emerald-500/30'}`}
                title={embeddings.data?.enabled ? `${embeddings.data.model} · ${embeddings.data.dimensions}d vector search` : 'Lexical retrieval fallback'}
              >
                {embeddings.data?.enabled ? 'VECTOR' : 'LEXICAL'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setJournalOpen(true)}
                className="h-8 gap-1.5"
                aria-label="Open player journal"
              >
                <BookOpen className="w-3.5 h-3.5" /> Journal
              </Button>
              <Badge variant="outline" className="text-[10px] font-mono">
                Turn {run.data?.currentTurn ?? 0}
              </Badge>
            </div>
          </div>

          {/* Player Knowledge Journal */}
          {journalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-card border rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden relative border-indigo-500/30">
                <div className="flex items-start justify-between gap-4 p-5 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <h2 className="font-bold text-lg">Player Journal</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Only observations and narrative your character is allowed to know.</p>
                  </div>
                  <button type="button" onClick={() => setJournalOpen(false)} className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-secondary" aria-label="Close player journal">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(85vh-90px)]">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Observed signals</div>
                      <div className="text-2xl font-semibold mt-1">{journal.data?.observations.length ?? 0}</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Visible scenes</div>
                      <div className="text-2xl font-semibold mt-1">{journal.data?.narratives.length ?? 0}</div>
                    </div>
                  </div>

                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent observations</h3>
                      <Badge variant="outline" className="text-[9px]">player scope</Badge>
                    </div>
                    {journal.isPending ? (
                      <p className="text-xs text-muted-foreground">Loading journal…</p>
                    ) : journal.data?.observations.length ? (
                      <div className="space-y-2">
                        {journal.data.observations.slice().reverse().map((observation) => (
                          <div key={observation.id} className="rounded-lg border border-border/50 bg-background/30 p-3">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>Turn {observation.turnNumber}</span>
                              <Badge variant="secondary" className="text-[9px]">{observation.modality}</Badge>
                            </div>
                            <p className="text-sm mt-1 leading-relaxed">{observation.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nothing observed yet.</p>
                    )}
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Narrative record</h3>
                    {journal.data?.narratives.length ? (
                      <div className="space-y-2">
                        {journal.data.narratives.slice().reverse().map((narrative) => (
                          <div key={narrative.id} className="rounded-lg border border-border/50 bg-background/30 p-3">
                            <div className="text-[10px] text-muted-foreground mb-1">Turn {narrative.turnId.split('_').pop()}</div>
                            <SafeMarkdown>{narrative.text}</SafeMarkdown>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No visible narration yet.</p>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* NPC Details Modal */}
          {activeNpcModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-card border rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 relative border-indigo-500/30">
                <button
                  type="button"
                  onClick={() => setActiveNpcModal(null)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      activeNpcModal.isPresent
                        ? 'ring-2 ring-emerald-500 bg-emerald-950/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                        : 'ring-1 ring-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    {activeNpcModal.name
                      ? activeNpcModal.name
                          .split(' ')
                          .filter((p: string) => !p.startsWith('“') && !p.startsWith('"'))
                          .map((p: string) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'NPC'}
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">{activeNpcModal.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          activeNpcModal.isPresent
                            ? 'text-emerald-400 border-emerald-500/30'
                            : 'text-muted-foreground border-border'
                        }`}
                      >
                        {activeNpcModal.isPresent ? 'Present in current scene' : 'Elsewhere'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {String(activeNpcModal.state?.locationId ?? 'unknown').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {activeNpcModal.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {activeNpcModal.description}
                  </p>
                )}

                {/* NPC Inner Thoughts Section inside Modal */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Secret Inner Thoughts
                    </span>
                    <Badge variant="outline" className="text-[9px] text-indigo-400 border-indigo-500/30 font-mono">
                      {activeNpcModal.thoughts?.length ?? 0}
                    </Badge>
                  </div>

                  {Array.isArray(activeNpcModal.thoughts) && activeNpcModal.thoughts.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeNpcModal.thoughts.map((thought: any) => (
                        <div
                          key={thought.id}
                          className="p-2.5 rounded-lg border border-indigo-500/20 bg-muted/40 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span className="font-mono">Turn {thought.turnId ? thought.turnId.split('_').pop()?.slice(0, 4) : 'Recent'}</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              {thought.persistence}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground/90 italic font-serif leading-relaxed">
                            "{thought.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-lg border border-border/40">
                      No private thoughts recorded for this character yet.
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveNpcModal(null)}
                  className="w-full mt-2"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Direct Full-Screen Transcript Feed */}
          <div className="flex-1 space-y-6 pt-4">
            {timeline.isPending && (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading story log...
              </div>
            )}

            {timeline.data?.slice().reverse().map((entry) => (
              <div key={entry.id} className="space-y-4">
                {entry.turnNumber > 0 && (
                  <div className="flex justify-end">
                    <div className="bg-secondary/60 text-secondary-foreground text-sm rounded-2xl px-4 py-2.5 max-w-[85%] md:max-w-[70%] border border-border/60 shadow-sm">
                      <span className="text-[10px] font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">
                        You (Turn {entry.turnNumber})
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed">{entry.rawPlayerInput}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 border-indigo-500/30">
                      {entry.turnNumber === 0 ? 'Prologue' : `Turn ${entry.turnNumber}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Status: <span className="font-semibold text-foreground/80">{entry.status}</span>
                    </span>
                  </div>

                  {entry.finalNarrative ? (
                    <div className="bg-card/70 border rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
                      <SafeMarkdown
                        knownCharacters={scene.data?.entities as any}
                        dialogueAttributions={entry.dialogueAttributions as any}
                      >
                        {entry.finalNarrative}
                      </SafeMarkdown>

                      {/* Telemetry & Execution Trace Bar */}
                      {entry.segmentId && (
                        <div className="pt-2 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => details.mutate(entry.segmentId as string)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                          >
                            <Activity className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-semibold">Execution Trace & Token Telemetry</span>
                            {details.data?.segmentId === entry.segmentId ? (
                              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                            )}
                          </button>

                          {details.data?.segmentId === entry.segmentId && details.data && (() => {
                            const invocations = details.data.invocations || [];
                            const totalInput = invocations.reduce((sum: number, inv: any) => sum + (inv.usage?.inputTokens ?? 0), 0);
                            const totalOutput = invocations.reduce((sum: number, inv: any) => sum + (inv.usage?.outputTokens ?? 0), 0);
                            const contextWindow = 128_000;
                            const inputPercent = Math.min(100, Math.max(1, (totalInput / contextWindow) * 100));
                            const outputPercent = Math.min(100, Math.max(0.5, (totalOutput / contextWindow) * 100));
                            const totalUsed = totalInput + totalOutput;

                            return (
                              <div className="mt-3 p-4 rounded-xl bg-background/60 border border-border/60 space-y-4 text-xs font-sans animate-in fade-in duration-200">
                                {/* Context Window & Token Bar */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                                      Context Window Utilization
                                    </span>
                                    <span className="text-muted-foreground font-mono">
                                      {totalUsed.toLocaleString()} / {contextWindow.toLocaleString()} tokens ({((totalUsed / contextWindow) * 100).toFixed(2)}%)
                                    </span>
                                  </div>

                                  {/* Multi-segment Progress Bar */}
                                  <div className="h-3 w-full rounded-full bg-secondary/60 overflow-hidden flex ring-1 ring-border/40">
                                    <div
                                      style={{ width: `${Math.max(2, inputPercent)}%` }}
                                      className="bg-indigo-500 h-full transition-all"
                                      title={`Prompt / Input Tokens: ${totalInput.toLocaleString()}`}
                                    />
                                    <div
                                      style={{ width: `${Math.max(1.5, outputPercent)}%` }}
                                      className="bg-emerald-500 h-full transition-all"
                                      title={`Generation / Output Tokens: ${totalOutput.toLocaleString()}`}
                                    />
                                  </div>

                                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                      <span>Input: <strong className="text-foreground">{totalInput.toLocaleString()}</strong> tokens</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                      <span>Output: <strong className="text-foreground">{totalOutput.toLocaleString()}</strong> tokens</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-secondary" />
                                      <span>Available: <strong className="text-foreground">{(contextWindow - totalUsed).toLocaleString()}</strong></span>
                                    </div>
                                  </div>
                                </div>

                                {/* Step-by-Step LLM Invocations Trace */}
                                <div className="space-y-2 pt-2 border-t border-border/40">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                                    Pipeline LLM Calls ({invocations.length})
                                  </span>

                                  {invocations.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {invocations.map((inv: any, idx: number) => {
                                        const rawInput = inv.input?.inputPayload;
                                        let prettyInput = rawInput || '';
                                        if (rawInput) {
                                          try {
                                            prettyInput = JSON.stringify(JSON.parse(rawInput), null, 2);
                                          } catch {
                                            prettyInput = rawInput;
                                          }
                                        }
                                        return (
                                          <div
                                            key={inv.id || idx}
                                            className="p-2.5 rounded-lg border border-border/40 bg-card/40 space-y-2"
                                          >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                                                  {inv.stage}
                                                </Badge>
                                                <span className="font-semibold text-foreground text-xs">{inv.role}</span>
                                                {inv.principalEntityId && (
                                                  <Badge variant="outline" className="text-[9px] text-amber-300 border-amber-500/30">
                                                    Principal: {inv.principalEntityId}
                                                  </Badge>
                                                )}
                                                <span className="text-[10px] text-muted-foreground font-mono">({inv.modelId?.split('/').pop() || inv.modelId})</span>
                                              </div>
                                              <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                                                <span>In: {inv.usage?.inputTokens ?? 0}</span>
                                                <span>Out: {inv.usage?.outputTokens ?? 0}</span>
                                                {typeof inv.latencyMs === 'number' && (
                                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                                    {inv.latencyMs}ms
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                            {prettyInput && (
                                              <details className="group border-t border-border/30 pt-2">
                                                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                                                  Exact input payload sent to model
                                                </summary>
                                                <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-border/40 bg-black/30 p-3 text-[10px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words font-mono">
                                                  {prettyInput}
                                                </pre>
                                              </details>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="italic text-muted-foreground text-[11px]">
                                      Telemetry collected on upcoming turns with active AI invocations.
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : entry.failure ? (
                    <div className="p-4 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Action failed to resolve</p>
                        <p className="text-xs mt-1 text-destructive/80">
                          {entry.failure.message ?? entry.failure.code ?? 'Turn failed'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border bg-muted/20 flex items-center gap-3 text-sm text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>The story is unfolding... ({entry.stage})</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={transcriptBottomRef} />
          </div>

          {/* Docked Floating Chat Input at Bottom of Screen */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t p-3 md:p-4 shadow-lg supports-[backdrop-filter]:bg-background/80">
            <div className="max-w-4xl mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim() || turn.isPending) return;
                  turn.mutate();
                }}
                className="space-y-1.5"
              >
                <div className="relative flex items-center">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (draft.trim() && !turn.isPending) turn.mutate();
                      }
                    }}
                    placeholder="What do you do or say next? (Enter to submit, Shift+Enter for newline)"
                    className="pr-12 resize-none min-h-[50px] max-h-32 text-sm rounded-xl"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!draft.trim() || turn.isPending}
                    className="absolute right-2 bg-indigo-600 hover:bg-indigo-500 text-white h-9 w-9 rounded-lg shrink-0 shadow"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {turn.isError && (
                  <p className="text-xs text-destructive">{turn.error.message}</p>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const models = useQuery({ queryKey: ['settings-models-page'], queryFn: api.getModelSettings });
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedAuthoringModel, setSelectedAuthoringModel] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const modelTest = useMutation({ mutationFn: (m?: string) => api.testModel(m) });
  const authoringModelMutation = useMutation({
    mutationFn: (m: string) => api.setAuthoringModel(m),
    onSuccess: (data) => {
      setSaveStatus(`Scenario authoring model changed to ${data.authoringModel}`);
      void queryClient.invalidateQueries({ queryKey: ['settings-models-page'] });
    },
    onError: (err: any) => {
      setSaveStatus(`Failed to update authoring model: ${err?.message || 'Error'}`);
    },
  });
  const modelMutation = useMutation({
    mutationFn: (m: string) => api.setActiveModel(m),
    onSuccess: (data) => {
      setSaveStatus(`Active model changed to ${data.activeModel}`);
      void queryClient.invalidateQueries({ queryKey: ['settings-models-page'] });
      void queryClient.invalidateQueries({ queryKey: ['settings-models'] });
    },
    onError: (err: any) => {
      setSaveStatus(`Failed to update: ${err?.message || 'Error'}`);
    },
  });

  const embeddings = useQuery({
    queryKey: ['settings-embeddings-page'],
    queryFn: api.getEmbeddingSettings,
  });

  const currentActiveModel = selectedModel || models.data?.defaultModel || '';
  const currentAuthoringModel = selectedAuthoringModel || models.data?.authoringModel || currentActiveModel;

  return (
    <div className="space-y-6 max-w-4xl py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System & AI Gateway Settings</h1>
        <p className="text-sm text-muted-foreground">
          View provider connections, switch active generative models, and configure embedding vectors.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Generative Provider & Model</CardTitle>
              <Badge variant={models.data?.configured ? 'default' : 'secondary'} className={models.data?.configured ? 'bg-emerald-600' : ''}>
                {models.data?.configured ? 'Connected' : 'Missing'}
              </Badge>
            </div>
            <CardDescription>Select active LLM for story resolution & narration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Provider:</span>
              <p className="font-mono text-xs">{models.data?.provider ?? '—'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Active Generative Model
              </label>
              <Select
                value={currentActiveModel}
                onValueChange={(val) => {
                  setSelectedModel(val);
                  modelMutation.mutate(val);
                }}
                disabled={modelMutation.isPending || models.isPending}
              >
                <SelectTrigger className="w-full font-mono text-xs h-10 bg-background">
                  <SelectValue placeholder="Select active generative model..." />
                </SelectTrigger>
                <SelectContent>
                  {models.data?.models?.map((m: any) => (
                    <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                      {m.name || m.id} ({m.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Discovered automatically from the configured credentials and API endpoint.
              </p>
            </div>

            <div className="space-y-2 border-t border-border/40 pt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Scenario Authoring Model
              </label>
              <Select
                value={currentAuthoringModel}
                onValueChange={(val) => {
                  setSelectedAuthoringModel(val);
                  authoringModelMutation.mutate(val);
                }}
                disabled={authoringModelMutation.isPending || models.isPending}
              >
                <SelectTrigger className="w-full font-mono text-xs h-10 bg-background">
                  <SelectValue placeholder="Select scenario authoring model..." />
                </SelectTrigger>
                <SelectContent>
                  {models.data?.models?.map((m: any) => (
                    <SelectItem key={`authoring-${m.id}`} value={m.id} className="font-mono text-xs">
                      {m.name || m.id} ({m.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Used for scenario chat, authoring proposals, and AI continuity reviews. It falls back to the active model when unset.
              </p>
            </div>

            {saveStatus && (
              <p className={`text-xs ${saveStatus.includes('Failed') ? 'text-destructive' : 'text-emerald-400'}`}>
                {saveStatus}
              </p>
            )}

            <div className="space-y-1 pt-1 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Max Response Length (Words):</span>
              <p className="font-mono text-xs font-semibold text-indigo-400">
                {(models.data as any)?.maxResponseLength ?? 150} words
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => modelTest.mutate(currentActiveModel)}
                disabled={modelTest.isPending}
              >
                {modelTest.isPending ? 'Verifying...' : `Test ${currentActiveModel.split('/').pop() || 'Model'}`}
              </Button>
            </div>
            {modelTest.data && (
              <p className={`text-xs ${modelTest.data.ok ? 'text-emerald-400' : 'text-destructive'}`}>
                {modelTest.data.ok
                  ? `Success: Handshake verified with ${modelTest.data.model}.`
                  : `Failed: ${modelTest.data.error || 'Connection error'}`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Embeddings Profile</CardTitle>
              <Badge variant={embeddings.data?.enabled ? 'default' : 'secondary'} className={embeddings.data?.enabled ? 'bg-emerald-600' : ''}>
                {embeddings.data?.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <CardDescription>pgvector HNSW Vector Store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Embedding Model:</span>
              <p className="font-mono text-xs">{embeddings.data?.model || 'azure/text-embedding-ada-002'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Vector Dimensions:</span>
              <p className="font-mono text-xs">{embeddings.data?.dimensions ?? 1536} (cosine)</p>
            </div>
            <div className="p-3 bg-secondary/40 rounded-lg text-xs text-muted-foreground border">
              Embeddings run alongside lexical Postgres search for fast, privacy-fenced context recall.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScenarioList(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [importError, setImportError] = useState('');
  const scenarios = useQuery({
    queryKey: ['scenarios', search, tag],
    queryFn: () =>
      api.listScenarios(
        `?${new URLSearchParams({ ...(search ? { search } : {}), ...(tag ? { tag } : {}) }).toString()}`,
      ),
  });

  const actionMutation = useMutation({
    mutationFn: async (input: {
      action: 'archive' | 'clone' | 'export';
      id: string;
      version: number;
      slug: string;
    }) => {
      if (input.action === 'archive') return api.archiveScenario(input.id, input.version);
      if (input.action === 'clone')
        return api.cloneScenario(
          input.id,
          `${input.id}_copy_${Date.now()}`,
          `${input.id}_copy_revision_${Date.now()}`,
          `${input.slug}-copy`,
        );
      const blob = await api.exportScenario(input.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${input.slug}.scenario.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return null;
    },
    onSuccess: () => void scenarios.refetch(),
    onError: (error) => setImportError(error.message),
  });

  const importMutation = useMutation({
    mutationFn: (value: unknown) => api.importScenario(value),
    onSuccess: () => {
      setImportError('Imported successfully');
      void scenarios.refetch();
    },
    onError: (error) => setImportError(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scenario Authoring</h1>
          <p className="text-sm text-muted-foreground">Build, configure, and publish narrative universes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Link to="/scenarios/new">
              <Plus className="w-4 h-4 mr-1.5" /> Create Draft
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-1.5" /> Import
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void file
                    .text()
                    .then((text) => importMutation.mutate(JSON.parse(text)))
                    .catch((error: unknown) =>
                      setImportError(error instanceof Error ? error.message : 'Invalid import'),
                    );
                }}
              />
            </label>
          </Button>
        </div>
      </div>

      <div className="flex gap-3 max-w-md">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search scenarios by title..."
        />
        <Input
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="Filter tag..."
          className="w-40"
        />
      </div>

      {importError && (
        <div className="p-3 text-xs rounded bg-destructive/15 text-destructive border border-destructive/20">
          {importError}
        </div>
      )}

      {scenarios.isPending ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading scenarios...
        </div>
      ) : scenarios.data?.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No scenarios found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create a new draft or import a scenario JSON package to begin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.data?.map((scenario) => (
            <Card key={scenario.id} className="flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{scenario.status}</Badge>
                  <span className="text-xs font-mono text-muted-foreground">v{scenario.version}</span>
                </div>
                <CardTitle className="text-lg mt-2">
                  <Link to="/scenarios/$scenarioId" params={{ scenarioId: scenario.id }} className="hover:underline">
                    {scenario.title}
                  </Link>
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  {scenario.slug}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-0 border-t border-border/40 mt-4 flex items-center justify-between">
                <Button asChild variant="ghost" size="sm" className="text-xs">
                  <Link to="/scenarios/$scenarioId" params={{ scenarioId: scenario.id }}>
                    Edit World
                  </Link>
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Clone scenario"
                    onClick={() =>
                      actionMutation.mutate({
                        action: 'clone',
                        id: scenario.id,
                        version: scenario.version,
                        slug: scenario.slug,
                      })
                    }
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Export JSON"
                    onClick={() =>
                      actionMutation.mutate({
                        action: 'export',
                        id: scenario.id,
                        version: scenario.version,
                        slug: scenario.slug,
                      })
                    }
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Archive"
                    onClick={() => {
                      if (window.confirm(`Archive scenario "${scenario.title}"?`)) {
                        actionMutation.mutate({
                          action: 'archive',
                          id: scenario.id,
                          version: scenario.version,
                          slug: scenario.slug,
                        });
                      }
                    }}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewScenario(): React.JSX.Element {
  const navigate = useNavigate();
  const form = useForm<{ title: string; slug: string }>({
    defaultValues: { title: 'Untitled scenario', slug: 'untitled-scenario' },
  });
  const mutation = useMutation({
    mutationFn: (values: { title: string; slug: string }) =>
      api.createScenario(minimalAggregate(values.title, values.slug)),
    onSuccess: ({ scenarioId }) =>
      navigate({ to: '/scenarios/$scenarioId', params: { scenarioId } }),
  });

  return (
    <div className="max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Scenario Draft</CardTitle>
          <CardDescription>
            Initialize a fresh world aggregate with baseline authoring schemas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Scenario Title</label>
              <Input
                {...form.register('title', { required: 'Title is required', maxLength: 200 })}
                placeholder="e.g. Whispers of Eldoria"
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                {...form.register('slug', {
                  required: 'Slug is required',
                  pattern: {
                    value: /^[a-z0-9-]+$/,
                    message: 'Use lowercase letters, numbers, and hyphens',
                  },
                })}
                placeholder="e.g. whispers-of-eldoria"
              />
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {mutation.isPending ? 'Creating Draft...' : 'Create Draft'}
            </Button>

            {mutation.isError && (
              <p className="text-xs text-destructive">{mutation.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ScenarioBuilder(): React.JSX.Element {
  const { scenarioId } = useParams({ from: '/scenarios/$scenarioId' });
  const queryClient = useQueryClient();
  const scenario = useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => api.getScenario(scenarioId),
  });

  const [section, setSection] = useState('premise');
  const [title, setTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState<string | null>(null);
  const [proposalSummary, setProposalSummary] = useState('');
  const [proposalKind, setProposalKind] = useState('character');
  const [proposalBrief, setProposalBrief] = useState('');
  const [proposalOperations, setProposalOperations] = useState('[\n  {\n    "operation": "add",\n    "collection": "entities",\n    "value": {}\n  }\n]');
  const [chatInput, setChatInput] = useState('');
  const [chatMode, setChatMode] = useState<'fast' | 'deep'>('fast');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; proposalId?: string | null }>>([]);

  const proposals = useQuery({
    queryKey: ['scenario-proposals', scenarioId],
    queryFn: () => api.listProposals(scenarioId),
  });
  const proposeAuthoring = useMutation({
    mutationFn: () => api.proposeAuthoring(scenarioId, { kind: proposalKind, brief: proposalBrief }),
    onSuccess: () => {
      setNotice('AI proposal created for review');
      void proposals.refetch();
    },
    onError: (error) => setNotice(`AI proposal error: ${error.message}`),
  });
  const authoringChat = useMutation({
    mutationFn: (message: string) => api.authoringChat(scenarioId, { kind: proposalKind, message, mode: chatMode, history: chatMessages.map((item) => ({ role: item.role, content: item.content })) }),
    onSuccess: (result, message) => {
      setChatMessages((current) => [...current, { role: 'user', content: message }, { role: 'assistant', content: result.reply, proposalId: result.proposalId }]);
      setChatInput('');
      setNotice(result.proposalId ? 'Chat proposal staged for review' : 'Assistant replied without changing the scenario');
      void proposals.refetch();
    },
    onError: (error) => setNotice(`Chat error: ${error.message}`),
  });
  const createProposal = useMutation({
    mutationFn: () => api.createProposal(scenarioId, {
      toolName: 'scenario.builder.manual',
      summary: proposalSummary || 'Manual scenario authoring proposal',
      operations: JSON.parse(proposalOperations) as unknown[],
    }),
    onSuccess: () => {
      setNotice('Proposal created for review');
      setProposalSummary('');
      void proposals.refetch();
    },
    onError: (error) => setNotice(`Proposal error: ${error.message}`),
  });
  const rejectProposal = useMutation({
    mutationFn: (proposalId: string) => api.rejectProposal(scenarioId, proposalId),
    onSuccess: () => { setNotice('Proposal rejected'); void proposals.refetch(); },
    onError: (error) => setNotice(`Proposal rejection error: ${error.message}`),
  });
  const applyProposal = useMutation({
    mutationFn: (proposalId: string) => api.applyProposal(scenarioId, proposalId, scenario.data?.revision.version ?? 0),
    onSuccess: () => {
      setNotice('Proposal applied');
      void queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
      void proposals.refetch();
    },
    onError: (error) => setConflict(error.message),
  });

  const patch = useMutation({
    mutationFn: (value: string) =>
      api.patchAggregate(scenarioId, scenario.data?.revision.version ?? 0, { title: value }),
    onSuccess: () => {
      setConflict(null);
      setNotice('Saved');
      void queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
    },
    onError: (error) => {
      setConflict(error.message);
      setNotice('Save conflict');
    },
  });

  const aggregatePatch = useMutation({
    mutationFn: (value: Record<string, unknown>) =>
      api.patchAggregate(scenarioId, scenario.data?.revision.version ?? 0, value),
    onSuccess: () => {
      setNotice('Saved');
      void queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
    },
    onError: (error) => {
      setConflict(error.message);
      setNotice('Save conflict');
    },
  });

  const validation = useMutation({
    mutationFn: () => api.validateScenario(scenarioId),
    onSuccess: (result) =>
      setNotice(result.valid ? 'Scenario is valid.' : `${result.errors.length} validation errors`),
  });
  const continuityReview = useMutation({
    mutationFn: () => api.continuityReview(scenarioId),
    onSuccess: (result) =>
      setNotice(result.findings.length ? `${result.findings.length} structural finding(s)` : 'Structural continuity review passed'),
    onError: (error) => setNotice(`Continuity review error: ${error.message}`),
  });
  const authoringContinuityReview = useMutation({
    mutationFn: () => api.authoringContinuityReview(scenarioId),
    onSuccess: (result) =>
      setNotice(result.findings.length ? `${result.findings.length} authoring finding(s)` : 'AI authoring review passed'),
    onError: (error) => setNotice(`AI authoring review error: ${error.message}`),
  });

  const knowledge = useMutation({
    mutationFn: (entityId: string) => api.knowledgePreview(scenarioId, entityId),
    onSuccess: (result) => setNotice(`${result.resources.length} authorized resources previewed`),
  });

  const startRun = useMutation({
    mutationFn: (playerEntityId: string) =>
      api.createRun(scenario.data?.revision.id ?? '', playerEntityId),
    onSuccess: () => setNotice('Run created; check Runs in the navigation.'),
  });

  useEffect(() => {
    if (!scenario.data || !title || title === scenario.data.scenario.title) return;
    const timer = window.setTimeout(() => {
      if (!patch.isPending) patch.mutate(title);
    }, 700);
    setNotice('Unsaved changes…');
    return () => window.clearTimeout(timer);
  }, [title, scenario.data?.scenario.title, scenario.data?.scenario.version]);

  if (scenario.isPending) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading scenario details...
      </div>
    );
  }

  if (scenario.isError || !scenario.data) {
    return (
      <div className="p-4 rounded-xl bg-destructive/15 text-destructive border border-destructive/20 text-sm">
        {scenario.error?.message ?? 'Scenario not found'}
      </div>
    );
  }

  const aggregate = scenario.data.revision.aggregate;
  const sections = [
    'premise',
    'rules',
    'locations',
    'connections',
    'entities',
    'relationships',
    'cards',
    'plot',
    'start-state',
    'models-pacing',
    'authoring-assistant',
    'validate',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{scenario.data.scenario.status}</Badge>
            <span className="text-xs text-muted-foreground font-mono">
              Revision {scenario.data.revision.version}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{scenario.data.scenario.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {notice && (
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {notice}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => validation.mutate()}
            disabled={validation.isPending}
          >
            Validate
          </Button>
        </div>
      </div>

      {conflict && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm flex items-center justify-between">
          <span>Optimistic lock mismatch: {conflict}</span>
          <Button size="sm" variant="outline" onClick={() => void scenario.refetch()}>
            Reload Server Version
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {sections.map((item) => (
            <Button
              key={item}
              variant={item === section ? 'secondary' : 'ghost'}
              className="justify-start capitalize text-xs h-9"
              onClick={() => setSection(item)}
            >
              {item.replace('-', ' ')}
            </Button>
          ))}
        </aside>

        <div className="space-y-6">
          {section === 'premise' && (
            <Card>
              <CardHeader>
                <CardTitle>World Identity & Premise</CardTitle>
                <CardDescription>Foundational setting facts and core narrative tone.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Scenario Title</label>
                  <Input
                    value={title || aggregate.scenario.title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Premise (Opening Narrative)</label>
                  <Textarea
                    defaultValue={aggregate.scenario.premise}
                    onBlur={(event) => aggregatePatch.mutate({ premise: event.currentTarget.value })}
                    rows={5}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Genre</label>
                    <Input
                      defaultValue={typeof aggregate.scenario.genre === 'string' ? aggregate.scenario.genre : ''}
                      onBlur={(event) => aggregatePatch.mutate({ genre: event.currentTarget.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tone & Style</label>
                    <Input
                      defaultValue={typeof aggregate.scenario.tone === 'string' ? aggregate.scenario.tone : ''}
                      onBlur={(event) => aggregatePatch.mutate({ tone: event.currentTarget.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {section === 'rules' && (
            <Card>
              <CardHeader>
                <CardTitle>World Rules & Boundaries</CardTitle>
                <CardDescription>
                  Strict policy rules are fed to narrator and resolver stages without being subverted by prose.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">World Rules (JSON array of strings)</label>
                  <Textarea
                    defaultValue={JSON.stringify(aggregate.scenario.worldRules ?? [], null, 2)}
                    onBlur={(event) => {
                      try {
                        aggregatePatch.mutate({ worldRules: JSON.parse(event.currentTarget.value) });
                      } catch {
                        setNotice('Rules must be valid JSON');
                      }
                    }}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Boundaries</label>
                  <Textarea
                    defaultValue={JSON.stringify(aggregate.scenario.contentBoundaries ?? [], null, 2)}
                    onBlur={(event) => {
                      try {
                        aggregatePatch.mutate({ contentBoundaries: JSON.parse(event.currentTarget.value) });
                      } catch {
                        setNotice('Boundaries must be valid JSON');
                      }
                    }}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {section === 'entities' && (
            <ResourceEditor
              scenarioId={scenarioId}
              collection="entities"
              name="Entities"
              items={aggregate.entities}
              expectedVersion={scenario.data.revision.version}
            />
          )}

          {section === 'locations' && (
            <div className="space-y-6">
              <ResourceEditor
                scenarioId={scenarioId}
                collection="locations"
                name="Locations"
                items={aggregate.locations}
                expectedVersion={scenario.data.revision.version}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Location Hierarchy</CardTitle>
                </CardHeader>
                <CardContent>
                  <LocationTree locations={aggregate.locations} />
                </CardContent>
              </Card>
            </div>
          )}

          {section === 'connections' && (
            <ResourceEditor
              scenarioId={scenarioId}
              collection="locationEdges"
              name="Location Connections (Edges)"
              items={aggregate.locationEdges}
              expectedVersion={scenario.data.revision.version}
            />
          )}

          {section === 'relationships' && (
            <div className="space-y-6">
              <ResourceEditor
                scenarioId={scenarioId}
                collection="relationships"
                name="Relationships"
                items={aggregate.relationships}
                expectedVersion={scenario.data.revision.version}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Directional Relationship Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    {aggregate.relationships.map((item, idx) =>
                      typeof item === 'object' && item !== null && 'sourceEntityId' in item ? (
                        <div key={idx} className="flex items-center gap-2 p-2 border rounded bg-muted/20">
                          <Badge variant="outline">{String(item.sourceEntityId)}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline">{String((item as any).targetEntityId)}</Badge>
                          <span className="text-muted-foreground ml-2 italic">{String((item as any).type)}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {section === 'cards' && (
            <CardEditor
              scenarioId={scenarioId}
              items={aggregate.storyCards}
              expectedVersion={scenario.data.revision.version}
            />
          )}

          {section === 'plot' && (
            <div className="space-y-6">
              <ResourceEditor
                scenarioId={scenarioId}
                collection="plotArcs"
                name="Plot Arcs"
                items={aggregate.plotArcs}
                expectedVersion={scenario.data.revision.version}
              />
              <ResourceEditor
                scenarioId={scenarioId}
                collection="plotPoints"
                name="Plot Points"
                items={aggregate.plotPoints}
                expectedVersion={scenario.data.revision.version}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Plot Progress & Affordances</CardTitle>
                  <CardDescription>Authored plot state is evidence-driven; the architect can propose pressure but cannot force the player.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {aggregate.plotPoints.length === 0 && <p className="text-xs text-muted-foreground italic">No plot points authored yet.</p>}
                  {aggregate.plotPoints.map((point) => {
                    const item = point as Record<string, unknown>;
                    const status = String(item.status ?? 'proposed');
                    return (
                      <div key={String(item.id)} className="rounded-lg border border-border/60 bg-background/30 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-sm">{String(item.title ?? item.id)}</div>
                          <Badge variant="outline" className="text-[10px]">{status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{String(item.desiredOutcome ?? 'No desired outcome specified.')}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {((item.foreshadowingCues as unknown[]) ?? []).slice(0, 3).map((cue, index) => <Badge key={index} variant="secondary" className="text-[9px]">{String(cue)}</Badge>)}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {section === 'start-state' && (
            <Card>
              <CardHeader>
                <CardTitle>Starting State & Run Setup</CardTitle>
                <CardDescription>Verify conditions required to start a game.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Location</label>
                  <Select
                    defaultValue={String(aggregate.scenario.startLocationId)}
                    onValueChange={(val) => aggregatePatch.mutate({ startLocationId: val })}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select start location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {aggregate.locations.map((item) =>
                        typeof item === 'object' && item !== null && 'id' in item && 'name' in item ? (
                          <SelectItem key={String(item.id)} value={String(item.id)}>
                            {String(item.name)}
                          </SelectItem>
                        ) : null
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium">Begin Run As</label>
                  <div className="flex gap-3">
                    <Select onValueChange={(val) => startRun.mutate(val)}>
                      <SelectTrigger aria-label="Playable entity" className="w-full bg-background">
                        <SelectValue placeholder="Choose playable protagonist..." />
                      </SelectTrigger>
                      <SelectContent>
                        {aggregate.entities.map((item) =>
                          typeof item === 'object' && item !== null && 'id' in item && 'name' in item && (item as any).playable ? (
                            <SelectItem key={String(item.id)} value={String(item.id)}>
                              {String(item.name)}
                            </SelectItem>
                          ) : null
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {section === 'models-pacing' && (
            <Card>
              <CardHeader>
                <CardTitle>Models & Pacing Policy</CardTitle>
                <CardDescription>Scenario-level sampling and pacing overrides.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  defaultValue={JSON.stringify(aggregate.scenario.config, null, 2)}
                  onBlur={(event) => {
                    try {
                      aggregatePatch.mutate({ config: JSON.parse(event.currentTarget.value) });
                    } catch {
                      setNotice('Configuration must be valid JSON');
                    }
                  }}
                  rows={8}
                  className="font-mono text-xs"
                />
              </CardContent>
            </Card>
          )}

          {section === 'authoring-assistant' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scenario Authoring Assistant</CardTitle>
                  <CardDescription>
                    Build a typed, reviewable proposal. Nothing changes until you apply it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">Scenario agent</div>
                        <p className="text-[11px] text-muted-foreground">Ask the agent to build, deepen, connect, or critique the world. Changes become reviewable proposals.</p>
                      </div>
                      <Select value={chatMode} onValueChange={(value) => setChatMode(value as 'fast' | 'deep')}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="fast">Fast</SelectItem><SelectItem value="deep">Deep</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-2">
                      {chatMessages.length === 0 && <p className="text-xs italic text-muted-foreground">Try: “Create a nervous archivist with a secret that connects to the treaty plot.”</p>}
                      {chatMessages.map((message, index) => (
                        <div key={index} className={`rounded-lg p-2.5 text-xs ${message.role === 'user' ? 'bg-secondary ml-8' : 'bg-background border border-border/50 mr-8'}`}>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{message.role === 'user' ? 'You' : 'Agent'}</div>
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          {message.proposalId && <Badge variant="outline" className="mt-2 text-[9px]">Proposal staged for review</Badge>}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Tell the scenario agent what to build…" rows={3} />
                      <Button className="self-end" onClick={() => authoringChat.mutate(chatInput)} disabled={!chatInput.trim() || authoringChat.isPending}>{authoringChat.isPending ? 'Thinking…' : 'Send'}</Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-[180px_1fr] gap-3">
                    <Select value={proposalKind} onValueChange={setProposalKind}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="character">Character</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="historical_event">Past event</SelectItem>
                        <SelectItem value="story_card">Story card</SelectItem>
                        <SelectItem value="plot_point">Plot point</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={proposalBrief} onChange={(event) => setProposalBrief(event.target.value)} placeholder="Ask for a layered, source-aware authoring proposal…" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => proposeAuthoring.mutate()} disabled={!proposalBrief.trim() || proposeAuthoring.isPending} variant="secondary">
                      {proposeAuthoring.isPending ? 'Generating…' : 'Generate AI proposal'}
                    </Button>
                    <span className="text-[11px] text-muted-foreground self-center">AI output is always staged for review.</span>
                  </div>
                  <Input value={proposalSummary} onChange={(event) => setProposalSummary(event.target.value)} placeholder="Manual proposal summary…" />
                  <Textarea value={proposalOperations} onChange={(event) => setProposalOperations(event.target.value)} rows={12} className="font-mono text-xs" aria-label="Proposal operations JSON" />
                  <div className="flex items-center gap-2">
                    <Button onClick={() => createProposal.mutate()} disabled={createProposal.isPending}>
                      {createProposal.isPending ? 'Validating…' : 'Create Proposal'}
                    </Button>
                    <Badge variant="outline">base revision {scenario.data.revision.version}</Badge>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">Continuity checks</div>
                        <p className="text-[11px] text-muted-foreground">Run a deterministic structural check, or ask the authoring model for a craft review before applying a proposal.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => continuityReview.mutate()} disabled={continuityReview.isPending || authoringContinuityReview.isPending}>
                          {continuityReview.isPending ? 'Checking…' : 'Structural check'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => authoringContinuityReview.mutate()} disabled={continuityReview.isPending || authoringContinuityReview.isPending}>
                          {authoringContinuityReview.isPending ? 'Asking AI…' : 'Ask AI reviewer'}
                        </Button>
                      </div>
                    </div>
                    {continuityReview.data && (
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Structural findings</div>
                        {continuityReview.data.findings.length === 0 && <p className="text-xs text-emerald-400">No structural continuity findings.</p>}
                        {continuityReview.data.findings.map((finding, index) => (
                          <div key={`structural-${finding.path}-${index}`} className={`rounded-lg border p-2.5 text-xs ${finding.severity === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                            <div className="font-mono text-[10px] opacity-80">{finding.path}</div>
                            <p className="mt-1">{finding.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {authoringContinuityReview.data && (
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI authoring findings</div>
                        {authoringContinuityReview.data.findings.length === 0 && <p className="text-xs text-emerald-400">No craft findings from the authoring reviewer.</p>}
                        {authoringContinuityReview.data.findings.map((finding, index) => (
                          <div key={`authoring-${finding.path}-${index}`} className={`rounded-lg border p-2.5 text-xs ${finding.severity === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                            <div className="font-mono text-[10px] opacity-80">{finding.path}</div>
                            <p className="mt-1">{finding.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Review Queue</CardTitle>
                  <CardDescription>Review validation results before applying changes to the draft revision.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proposals.isPending && <p className="text-xs text-muted-foreground">Loading proposals…</p>}
                  {proposals.data?.length === 0 && <p className="text-xs text-muted-foreground italic">No proposals yet.</p>}
                  {proposals.data?.map((proposal) => (
                    <div key={proposal.id} className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-sm">{proposal.summary}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-1">{proposal.toolName} · base v{proposal.baseVersion}</div>
                        </div>
                        <Badge variant={proposal.validation.valid ? 'default' : 'destructive'}>{proposal.status}</Badge>
                      </div>
                      {!proposal.validation.valid && <p className="text-xs text-destructive">{proposal.validation.errors.length} validation error(s)</p>}
                      {proposal.validation.warnings.length > 0 && <p className="text-xs text-amber-300">{proposal.validation.warnings.length} warning(s)</p>}
                      <div className="flex flex-wrap gap-2">
                        {proposal.validation.valid && (proposal.status === 'ready' || proposal.status === 'edited') && (
                          <Button size="sm" onClick={() => applyProposal.mutate(proposal.id)} disabled={applyProposal.isPending}>Apply proposal</Button>
                        )}
                        {proposal.status === 'ready' && (
                          <Button size="sm" variant="outline" onClick={() => {
                            setProposalSummary(proposal.summary);
                            setProposalOperations(JSON.stringify(proposal.operations, null, 2));
                          }}>Edit in form</Button>
                        )}
                        {['ready', 'edited'].includes(proposal.status) && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => rejectProposal.mutate(proposal.id)}>Reject</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {section === 'validate' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aggregate Validation</CardTitle>
                  <CardDescription>Run semantic and topological verification against authoring rules.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => validation.mutate()} disabled={validation.isPending}>
                    {validation.isPending ? 'Verifying...' : 'Validate Scenario'}
                  </Button>

                  {validation.data && (
                    <div className="space-y-2 pt-2">
                      {validation.data.errors.length === 0 && (
                        <p className="text-sm text-emerald-400 font-medium">World aggregate passed all integrity checks.</p>
                      )}
                      {validation.data.errors.map((issue, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-destructive/15 text-destructive text-xs border border-destructive/20">
                          <button className="font-semibold underline mr-1" onClick={() => setSection(issue.section)}>
                            [{issue.section}]
                          </button>
                          {issue.path}: {issue.message}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {aggregate.entities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Entity Knowledge Preview</CardTitle>
                    <CardDescription>Simulate what an entity knows at game start.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select onValueChange={(val) => knowledge.mutate(val)}>
                      <SelectTrigger aria-label="Preview entity" className="w-full bg-background">
                        <SelectValue placeholder="Select character..." />
                      </SelectTrigger>
                      <SelectContent>
                        {aggregate.entities.map((item) =>
                          typeof item === 'object' && item !== null && 'id' in item && 'name' in item ? (
                            <SelectItem key={String(item.id)} value={String(item.id)}>
                              {String(item.name)}
                            </SelectItem>
                          ) : null
                        )}
                      </SelectContent>
                    </Select>

                    {knowledge.data && (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {knowledge.data.resources.map((res) => (
                          <div key={res.id} className="p-2 rounded border bg-muted/20 text-xs">
                            <Badge variant="outline" className="text-[10px] mb-1">{res.scope}</Badge>
                            <p className="text-foreground/90">{res.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardEditor({
  scenarioId,
  items,
  expectedVersion,
}: {
  scenarioId: string;
  items: unknown[];
  expectedVersion: number;
}): React.JSX.Element {
  const first = items.find(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null && 'id' in item
  );
  const cardId = first ? String(first.id) : '';
  const versions = useQuery({
    queryKey: ['card-versions', scenarioId, cardId],
    queryFn: () => api.getCardVersions(scenarioId, cardId),
    enabled: Boolean(cardId),
  });
  const links = useQuery({
    queryKey: ['card-links', scenarioId, cardId],
    queryFn: () => api.getCardLinks(scenarioId, cardId),
    enabled: Boolean(cardId),
  });
  const mutationProposals = useQuery({
    queryKey: ['card-mutation-proposals', scenarioId, cardId],
    queryFn: () => api.getCardMutationProposals(scenarioId, cardId),
    enabled: Boolean(cardId),
  });
  const mutation = useMutation({
    mutationFn: (action: 'lock' | 'rollback') =>
      action === 'lock'
        ? api.lockCard(scenarioId, cardId, true)
        : api.rollbackCard(
            scenarioId,
            cardId,
            Number((versions.data?.[0] as { version?: number } | undefined)?.version ?? 1)
          ),
    onSuccess: () => {
      void versions.refetch();
      void links.refetch();
    },
  });

  return (
    <div className="space-y-6">
      <ResourceEditor
        scenarioId={scenarioId}
        collection="storyCards"
        name="Story Cards"
        items={items}
        expectedVersion={expectedVersion}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History & Backlinks</CardTitle>
          <CardDescription>
            {versions.data?.length ?? 0} versions recorded · {links.data?.length ?? 0} relational backlinks · {mutationProposals.data?.length ?? 0} mutation proposals
          </CardDescription>
        </CardHeader>
        {cardId && (
          <CardContent className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => mutation.mutate('lock')}>
              Lock Selected
            </Button>
            <Button variant="outline" size="sm" onClick={() => mutation.mutate('rollback')}>
              Rollback Version
            </Button>
            {mutationProposals.data?.filter((proposal) => (proposal as { status?: string }).status === 'ready').map((proposal) => (
              <Button key={String((proposal as { id: string }).id)} variant="outline" size="sm" onClick={() => api.applyCardMutationProposal(scenarioId, cardId, String((proposal as { id: string }).id)).then(() => mutationProposals.refetch())}>
                Apply AI Mutation
              </Button>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function LocationTree({ locations }: { locations: unknown[] }): React.JSX.Element {
  const rows = locations.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
  );
  const children = (parent: string | null) =>
    rows.filter((item) => (item.parentLocationId ?? null) === parent);

  const render = (parent: string | null): React.JSX.Element => (
    <ul className="pl-4 border-l space-y-1 text-xs text-muted-foreground my-1">
      {children(parent).map((item) => (
        <li key={String(item.id)} className="py-0.5">
          <span className="text-foreground font-medium">{String(item.name ?? item.id)}</span>
          {render(String(item.id))}
        </li>
      ))}
    </ul>
  );
  return render(null);
}

function ResourceEditor({
  scenarioId,
  collection,
  name,
  items,
  expectedVersion,
}: {
  scenarioId: string;
  collection: string;
  name: string;
  items: unknown[];
  expectedVersion: number;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('{}');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const value = JSON.parse(draft) as unknown;
      return api.addResource(scenarioId, collection, expectedVersion, value);
    },
    onSuccess: () => {
      setError('');
      setDraft('{}');
      void queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
    },
    onError: (reason) => setError(reason.message),
  });

  const resourceMutation = useMutation({
    mutationFn: (input: { id: string; action: 'duplicate' | 'archive' }) =>
      input.action === 'duplicate'
        ? api.duplicateResource(
            scenarioId,
            collection,
            input.id,
            expectedVersion,
            `${input.id}_copy_${Date.now()}`
          )
        : api.archiveResource(scenarioId, collection, input.id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] }),
    onError: (reason) => setError(reason.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{items.length} records in this revision snapshot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Add {name} (JSON specification)</label>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="font-mono text-xs"
            rows={4}
          />
        </div>

        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : `Add ${name.slice(0, -1)}`}
        </Button>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="border rounded-md divide-y divide-border/50 max-h-64 overflow-y-auto">
          {items.map((item, index) => {
            const id = typeof item === 'object' && item !== null && 'id' in item ? String(item.id) : undefined;
            return (
              <div key={index} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/20">
                <span className="font-medium text-foreground">
                  {typeof item === 'object' && item !== null && 'name' in item ? String(item.name) : `Item ${index + 1}`}
                </span>
                {id && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => resourceMutation.mutate({ id, action: 'duplicate' })}
                    >
                      Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => resourceMutation.mutate({ id, action: 'archive' })}
                    >
                      Archive
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function minimalAggregate(title: string, slug: string): ScenarioAggregate {
  const now = '2026-01-01T00:00:00.000Z';
  const metadata = {
    createdAt: now,
    updatedAt: now,
    version: 1,
    schemaVersion: 1,
    attribution: { source: 'player', sourceIds: [] },
  };
  return {
    scenario: {
      id: `scenario_${slug}`,
      revisionId: `revision_${slug}`,
      slug,
      title,
      premise: '',
      description: '',
      genre: 'adventure',
      tone: '',
      themes: [],
      contentBoundaries: [],
      worldRules: [],
      defaultNarrationStyle: '',
      chronologyMarker: 'day 1',
      startLocationId: `location_${slug}`,
      config: {
        narration: { person: 'third_limited', tense: 'past', omniscient: false },
        pacing: {},
        retrieval: { maxCandidates: 20, maxSelected: 5 },
        modelOverrides: {},
      },
      status: 'draft',
      currentRevision: 1,
      metadata,
    },
    entities: [
      {
        id: `player_${slug}`,
        revisionId: `revision_${slug}`,
        name: 'Player',
        aliases: [],
        pronouns: 'they/them',
        kind: 'character',
        tags: [],
        publicDescription: '',
        privateDescription: '',
        appearance: '',
        personality: [],
        speechStyle: '',
        values: [],
        drives: [],
        goals: [],
        fears: [],
        desires: [],
        capabilities: [],
        limitations: [],
        secrets: [],
        stats: {},
        structuredAttributes: {},
        constraints: [],
        aiMutationPolicy: 'manual_only',
        playable: true,
        cognitive: true,
        alive: true,
        active: true,
        startingLocationId: `location_${slug}`,
        metadata,
      },
    ],
    relationships: [],
    locations: [
      {
        id: `location_${slug}`,
        revisionId: `revision_${slug}`,
        name: 'Starting location',
        aliases: [],
        type: 'room',
        tags: [],
        publicDescription: '',
        privateDetails: '',
        parentLocationId: null,
        environment: {},
        capacity: 10,
        accessRules: [],
        sensoryProperties: { sight: true, sound: true, hearingRange: 10 },
        hazards: [],
        aiMutationPolicy: 'manual_only',
        metadata,
      },
    ],
    locationEdges: [],
    storyCards: [],
    storyCardLinks: [],
    plotArcs: [],
    plotPoints: [],
  };
}

const rootRoute = createRootRoute({ component: Shell });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});
const scenariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scenarios',
  component: ScenarioList,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});
const runsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/runs',
  component: RunsPage,
});
const newScenarioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scenarios/new',
  component: NewScenario,
});
const scenarioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scenarios/$scenarioId',
  component: ScenarioBuilder,
});
const feedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feedback',
  component: FeedbackPage,
});
const routeTree = rootRoute.addChildren([
  indexRoute,
  scenariosRoute,
  newScenarioRoute,
  scenarioRoute,
  settingsRoute,
  runsRoute,
  feedbackRoute,
]);
const router = createRouter({ routeTree });
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
