/**
 * Starter blog-post layout built from @exotic/ui-remedy primitives.
 * Copy this file into your app and adapt content/props - it's a reference
 * composition, not a component this package exports.
 */
import { BounceIn, Card, Chip, Eyebrow } from "@exotic/ui-remedy";

export function BlogPost() {
  return (
    <main style={{ background: "var(--remedy-paper)", minHeight: "100vh", padding: "48px 32px" }}>
      <article style={{ maxWidth: 640, margin: "0 auto" }}>
        <BounceIn>
          <Eyebrow>Journal</Eyebrow>
          <h1 style={{ fontSize: 32, margin: "0 0 8px", color: "var(--remedy-ink)" }}>
            Why we chose a flamingo
          </h1>
          <div style={{ marginBottom: 20 }}>
            <Chip>Brand</Chip>
            <Chip gold>Behind the scenes</Chip>
          </div>
        </BounceIn>

        <BounceIn delayMs={100}>
          <p style={{ lineHeight: 1.7, color: "rgba(0,0,0,0.75)" }}>
            Every remedy needs a little confidence and a little color - that's the flamingo,
            drawn loose and bold, never mechanical.
          </p>
        </BounceIn>

        <BounceIn delayMs={200} className="remedy-pattern-pinstripe" style={{ padding: 24, borderRadius: 20, marginTop: 24 }}>
          <Card pattern="none" eyebrow="Pull quote" title="Classic, not trendy">
            The line work should hold up over years, not read as a current meme aesthetic.
          </Card>
        </BounceIn>
      </article>
    </main>
  );
}
