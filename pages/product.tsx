import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Head from 'next/head';
import DatePicker from 'react-datepicker';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Show, PricingTable, UserButton, useAuth } from '@clerk/nextjs';
import { Brand, Icon } from '../components/Brand';
import { ReportPanel } from '../components/ReportPanel';

const LANGUAGES = ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian'];
const MAX_NOTES = 8000; // keep in sync with api/index.py

const SAMPLE = {
  name: 'Maria Gonzalez',
  notes: `54 y/o female, follow-up for hypertension.
BP today 148/92 (last visit 152/95). Taking lisinopril 10mg daily, reports good adherence.
Complains of mild dry cough for 3 weeks, no fever, no SOB.
Exam: lungs clear, HR 78 regular, no edema.
Labs from last week: creatinine 0.9, K 4.4, LDL 162.
Plan: cough likely ACE-inhibitor related -> switch to losartan 50mg. Start atorvastatin 20mg.
Recheck BP in 4 weeks, repeat lipid panel in 3 months. Advised low-sodium diet and 30 min walking 5x/week.`,
};

type HistoryItem = { id: number; patientName: string; date: string; output: string };

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-slate-950/60 dark:text-white';

function toISODate(d: Date | null) {
  if (!d) return '';
  // Local date, not UTC (toISOString can shift the day near midnight).
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function ConsultationWorkspace() {
  const { getToken } = useAuth();

  const [patientName, setPatientName] = useState('');
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [language, setLanguage] = useState('English');

  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [shown, setShown] = useState<{ patientName: string; date: string } | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (loading) return;

    setOutput('');
    setError('');
    setElapsed(null);
    setLoading(true);

    const date = toISODate(visitDate);
    const name = patientName.trim();
    setShown({ patientName: name, date });

    const jwt = await getToken();
    if (!jwt) {
      setError('Your session expired. Please sign in again.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    const started = performance.now();
    let buffer = '';

    const finish = () => {
      setLoading(false);
      setElapsed((performance.now() - started) / 1000);
      controllerRef.current = null;
      if (buffer.trim()) {
        setHistory((h) => [{ id: Date.now(), patientName: name, date, output: buffer }, ...h].slice(0, 8));
      }
    };

    try {
      await fetchEventSource('/api', {
        signal: controller.signal,
        method: 'POST',
        // Without this the library closes and re-sends the request when the tab is hidden.
        openWhenHidden: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          patient_name: name,
          date_of_visit: date,
          notes,
          language,
        }),
        async onopen(res) {
          if (res.ok) return;
          let detail = `Request failed (${res.status})`;
          try {
            const body = await res.json();
            if (typeof body?.detail === 'string') detail = body.detail;
          } catch {
            /* non-JSON error body */
          }
          if (res.status === 401) detail = 'Your session expired. Please sign in again.';
          throw new Error(detail);
        },
        onmessage(ev) {
          // Each event carries a JSON-encoded text chunk so newlines and spaces survive intact.
          try {
            buffer += JSON.parse(ev.data);
          } catch {
            buffer += ev.data;
          }
          setOutput(buffer);
        },
        onclose() {
          finish();
        },
        onerror(err) {
          // Throwing stops fetchEventSource from retrying automatically.
          throw err;
        },
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
      finish();
    }
  }

  function stop() {
    controllerRef.current?.abort();
  }

  function onNotesKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function restore(item: HistoryItem) {
    if (loading) return;
    setOutput(item.output);
    setShown({ patientName: item.patientName, date: item.date });
    setError('');
    setElapsed(null);
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 lg:py-10">
      {/* ---------- Left: input ---------- */}
      <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">New consultation</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Paste your notes and get a record summary, next steps and a patient email.
          </p>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-slate-900/60"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="patient" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Patient name
              </label>
              <input
                id="patient"
                type="text"
                required
                maxLength={120}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className={inputClass}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Date of visit
              </label>
              <DatePicker
                id="date"
                selected={visitDate}
                onChange={(d: Date | null) => setVisitDate(d)}
                dateFormat="yyyy-MM-dd"
                maxDate={new Date()}
                placeholderText="Select date"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Consultation notes
              </label>
              <button
                type="button"
                onClick={() => {
                  setPatientName(SAMPLE.name);
                  setNotes(SAMPLE.notes);
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Use sample notes
              </button>
            </div>
            <textarea
              id="notes"
              required
              rows={11}
              maxLength={MAX_NOTES}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={onNotesKeyDown}
              className={`${inputClass} resize-y font-mono text-[13px] leading-relaxed`}
              placeholder="Symptoms, exam findings, labs, diagnosis, plan…"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>{words} words</span>
              <span className={notes.length > MAX_NOTES * 0.9 ? 'text-amber-500' : ''}>
                {notes.length.toLocaleString()} / {MAX_NOTES.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="language" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Patient email language
            </label>
            <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            {loading ? (
              <button
                type="button"
                onClick={stop}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Icon.Stop className="h-4 w-4" /> Stop generating
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-[.99]"
              >
                <Icon.Sparkles className="h-4 w-4" /> Generate summary
                <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium sm:inline">Ctrl ↵</kbd>
              </button>
            )}
            <button
              type="button"
              disabled={loading || (!notes && !patientName)}
              onClick={() => {
                setPatientName('');
                setNotes('');
              }}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Clear
            </button>
          </div>
        </form>

        {history.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Icon.Clock className="h-4 w-4" /> This session
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => restore(h)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">{h.patientName}</span>
                    <span className="shrink-0 text-xs text-slate-400">{h.date}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 px-2 text-[11px] text-slate-400">Kept in memory only — cleared when you reload the page.</p>
          </div>
        )}
      </div>

      {/* ---------- Right: output ---------- */}
      <div className="min-w-0">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {output || loading ? (
          <>
            <ReportPanel
              output={output}
              loading={loading}
              patientName={shown?.patientName ?? patientName}
              visitDate={shown?.date ?? toISODate(visitDate)}
            />
            <p className="no-print mt-3 text-xs text-slate-400">
              {loading ? 'Generating…' : elapsed !== null ? `Generated in ${elapsed.toFixed(1)}s · ` : ''}
              {!loading && 'AI-generated — review before adding to the medical record or sending to the patient.'}
            </p>
          </>
        ) : (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-10 text-center dark:border-white/10 dark:bg-white/[.02]">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Icon.Sparkles className="h-7 w-7" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your report will appear here</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Fill in the form and hit <span className="font-medium">Generate summary</span>. The result streams in live,
              split into three ready-to-copy sections.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Paywall() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Icon.Sparkles className="h-3.5 w-3.5" /> Healthcare Professional Plan
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Spend less time on paperwork
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
          Subscribe to unlock AI-generated visit summaries, next steps and patient emails.
        </p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8 dark:border-white/10 dark:bg-slate-900/60">
        <PricingTable />
      </div>
    </div>
  );
}

export default function Product() {
  return (
    <>
      <Head>
        <title>Workspace · MediNotes Pro</title>
      </Head>
      <main className="min-h-screen">
        <header className="no-print sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Brand />
            <UserButton showName={true} />
          </div>
        </header>

        <Show when={{ plan: 'premium_subscription' }} fallback={<Paywall />}>
          <ConsultationWorkspace />
        </Show>
      </main>
    </>
  );
}
