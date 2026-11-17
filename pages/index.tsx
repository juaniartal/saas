import Link from 'next/link';
import { SignInButton, Show, UserButton } from '@clerk/nextjs';
import { Brand, Icon } from '../components/Brand';

const FEATURES = [
  {
    icon: <Icon.Doc />,
    title: 'Professional summaries',
    text: 'Turn rough shorthand into a clean, structured summary ready for the medical record.',
    accent: 'from-sky-500 to-blue-600',
  },
  {
    icon: <Icon.Check />,
    title: 'Clear next steps',
    text: 'Follow-ups, labs and medication changes pulled out into an actionable checklist.',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    icon: <Icon.Mail />,
    title: 'Patient-friendly emails',
    text: 'A warm, jargon-free email explaining the visit — in the patient’s own language.',
    accent: 'from-violet-500 to-fuchsia-600',
  },
];

const STEPS = [
  { n: '1', title: 'Paste your notes', text: 'Shorthand is fine — abbreviations, vitals, labs, plan.' },
  { n: '2', title: 'Watch it stream', text: 'The report is written live in seconds, section by section.' },
  { n: '3', title: 'Review & send', text: 'Copy each section, download it or print it.' },
];

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-[.99]';

function PrimaryCTA({ signedOutLabel, signedInLabel }: { signedOutLabel: string; signedInLabel: string }) {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className={primaryBtn}>
            <Icon.Sparkles className="h-4 w-4" /> {signedOutLabel}
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link href="/product" className={primaryBtn}>
          <Icon.Sparkles className="h-4 w-4" /> {signedInLabel}
        </Link>
      </Show>
    </>
  );
}

/** Static preview of the generated report, used as the hero illustration. */
function PreviewCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-sky-400/30 via-indigo-500/20 to-fuchsia-500/30 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3 dark:border-white/5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs text-slate-400">Maria Gonzalez · 2026-11-16</span>
        </div>
        <div className="space-y-3 p-4 text-left text-[13px]">
          {[
            { t: 'Summary', c: 'bg-sky-500', l: ['Hypertension follow-up, BP 148/92 (improving).', 'Dry cough likely ACE-inhibitor related.'] },
            { t: 'Next steps', c: 'bg-emerald-500', l: ['Switch lisinopril → losartan 50 mg', 'Start atorvastatin 20 mg · recheck BP in 4 wks'] },
            { t: 'Email to patient', c: 'bg-violet-500', l: ['Hi Maria, thanks for coming in today! Your blood pressure is getting better…'] },
          ].map((s) => (
            <div key={s.t} className="rounded-xl border border-slate-100 p-3 dark:border-white/5">
              <div className="mb-1.5 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                <span className={`h-2 w-2 rounded-full ${s.c}`} /> {s.t}
              </div>
              {s.l.map((line) => (
                <p key={line} className="text-slate-500 dark:text-slate-400">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-2 sm:gap-6">
            <a href="#features" className="hidden text-sm text-slate-600 hover:text-slate-900 sm:block dark:text-slate-300 dark:hover:text-white">
              Features
            </a>
            <a href="#how" className="hidden text-sm text-slate-600 hover:text-slate-900 sm:block dark:text-slate-300 dark:hover:text-white">
              How it works
            </a>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <div className="flex items-center gap-3">
                <Link
                  href="/product"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Open app
                </Link>
                <UserButton />
              </div>
            </Show>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Icon.Bolt className="h-3.5 w-3.5" /> AI consultation assistant
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
              From visit notes to{' '}
              <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
                finished paperwork
              </span>{' '}
              in seconds
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600 lg:mx-0 dark:text-slate-400">
              MediNotes Pro writes the record summary, the follow-up plan and the patient email for you — so you can
              focus on the next patient.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <PrimaryCTA signedOutLabel="Start free trial" signedInLabel="Open consultation assistant" />
              <a
                href="#how"
                className="inline-flex items-center rounded-xl px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              >
                See how it works →
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 lg:justify-start dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Icon.Shield className="h-4 w-4" /> Secure sign-in</span>
              <span className="inline-flex items-center gap-1.5"><Icon.Bolt className="h-4 w-4" /> Live streaming output</span>
              <span className="inline-flex items-center gap-1.5"><Icon.Globe className="h-4 w-4" /> Emails in 6 languages</span>
            </div>
          </div>
          <PreviewCard />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-slate-200/70 py-20 dark:border-white/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">One input, three outputs</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">Everything you need after a consultation, generated together.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/60"
              >
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-md`}>
                  {f.icon}
                </span>
                <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">How it works</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="relative rounded-2xl border border-slate-200 bg-white/60 p-6 dark:border-white/10 dark:bg-white/[.02]">
                <span className="text-5xl font-semibold text-indigo-500/20 dark:text-indigo-400/20">{s.n}</span>
                <h3 className="mt-2 font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-12 text-center text-white shadow-xl shadow-indigo-500/20 sm:px-12">
            <h2 className="text-2xl font-semibold sm:text-3xl">Ready to get your evenings back?</h2>
            <p className="mx-auto mt-2 max-w-lg text-white/80">Try it with sample notes — no setup required.</p>
            <div className="mt-6 flex justify-center [&_a]:bg-white [&_a]:bg-none [&_a]:text-indigo-700 [&_button]:bg-white [&_button]:bg-none [&_button]:text-indigo-700">
              <PrimaryCTA signedOutLabel="Get started" signedInLabel="Open the app" />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 py-8 dark:border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 dark:text-slate-400">
          <span>© {new Date().getFullYear()} MediNotes Pro</span>
          <span>For demonstration purposes only — not a medical device. Always review AI output.</span>
        </div>
      </footer>
    </main>
  );
}
