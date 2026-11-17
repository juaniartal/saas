import { useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Icon } from './Brand';

type SectionMeta = { key: string; title: string; icon: ReactNode; accent: string };

// The API is prompted to answer with exactly these three "###" sections, in this order.
const SECTIONS: SectionMeta[] = [
  {
    key: 'summary',
    title: 'Summary for the record',
    icon: <Icon.Doc />,
    accent: 'from-sky-500 to-blue-600',
  },
  {
    key: 'next',
    title: 'Next steps',
    icon: <Icon.Check />,
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    key: 'email',
    title: 'Email to patient',
    icon: <Icon.Mail />,
    accent: 'from-violet-500 to-fuchsia-600',
  },
];

/** Splits the streamed markdown on "###" headings. Text before the first heading is ignored. */
export function splitSections(markdown: string): string[] {
  const parts = markdown.split(/^#{1,3}\s+.*$/m);
  return parts.slice(1).map((p) => p.trim());
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: ignore */
        }
      }}
      disabled={!text}
      className="no-print inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {copied ? <Icon.Check className="h-4 w-4 text-emerald-500" /> : <Icon.Copy className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function SectionCard({
  meta,
  body,
  streaming,
}: {
  meta: SectionMeta;
  body: string | undefined;
  streaming: boolean;
}) {
  const pending = body === undefined;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition dark:border-white/10 dark:bg-slate-900/60">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/5">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${meta.accent} text-white`}>
            {meta.icon}
          </span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{meta.title}</h3>
        </div>
        <CopyButton text={body ?? ''} />
      </header>
      <div className="px-5 py-4">
        {pending ? (
          <div className="space-y-2.5 py-1" aria-hidden>
            <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          </div>
        ) : (
          <div
            className={`prose prose-sm prose-slate max-w-none dark:prose-invert prose-headings:font-semibold prose-li:my-0.5 ${
              streaming ? 'streaming-caret' : ''
            }`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{body}</ReactMarkdown>
          </div>
        )}
      </div>
    </article>
  );
}

export function ReportPanel({
  output,
  loading,
  patientName,
  visitDate,
}: {
  output: string;
  loading: boolean;
  patientName: string;
  visitDate: string;
}) {
  const sections = splitSections(output);
  // If the model ignored the format, fall back to rendering the raw markdown.
  const unstructured = !loading && output.trim() !== '' && sections.length === 0;

  const download = () => {
    const blob = new Blob([`# Consultation – ${patientName} (${visitDate})\n\n${output}`], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultation-${patientName.trim().replace(/\s+/g, '-').toLowerCase() || 'patient'}-${visitDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="print-area" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Report</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {patientName || 'Patient'} <span className="font-normal text-slate-500 dark:text-slate-400">· {visitDate}</span>
          </h2>
        </div>
        <div className="no-print flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CopyButton text={output} label="Copy all" />
          <button
            type="button"
            onClick={download}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Icon.Download className="h-4 w-4" /> .md
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Icon.Print className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {unstructured ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{output}</ReactMarkdown>
          </div>
        </article>
      ) : (
        SECTIONS.map((meta, i) => (
          <SectionCard
            key={meta.key}
            meta={meta}
            body={sections[i]}
            streaming={loading && i === sections.length - 1}
          />
        ))
      )}
    </div>
  );
}
