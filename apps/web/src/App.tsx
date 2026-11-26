export const VOWLET_TAGLINE = 'A little truth, a little trouble';

export function App() {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full flex-col items-center justify-center px-4 py-8"
      style={{
        maxWidth: 'var(--viewport-max-shell)',
        paddingTop: 'calc(var(--safe-top) + 32px)',
        paddingBottom: 'calc(var(--safe-bottom) + 32px)',
      }}
    >
      <section
        className="w-full p-6 text-center"
        style={{
          backgroundColor: 'var(--color-cream)',
          borderRadius: 'var(--radius-card)',
          border: 'var(--border-ink-hairline)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <span
          className="inline-flex items-center px-3 py-1 text-xs font-semibold tracking-wide uppercase"
          style={{
            borderRadius: 'var(--radius-pill)',
            border: 'var(--border-ink-hairline)',
            color: 'var(--color-brass-text)',
            backgroundColor: 'var(--color-linen)',
          }}
        >
          Private Beta
        </span>

        <h1
          className="mt-4 text-4xl font-bold tracking-tight"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-ink)',
          }}
        >
          Vowlet
        </h1>

        <p
          className="mt-2 text-base"
          style={{
            color: 'var(--color-truth-teal)',
          }}
        >
          {VOWLET_TAGLINE}
        </p>
      </section>
    </main>
  );
}

export default App;
