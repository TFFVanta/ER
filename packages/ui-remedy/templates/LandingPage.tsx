/**
 * Starter landing-page layout built from @exotic/ui-remedy primitives.
 * Copy this file into your app and adapt content/props - it's a reference
 * composition, not a component this package exports.
 */
import { BounceIn, Button, Card, Chip, Eyebrow, Input } from "@exotic/ui-remedy";

export function LandingPage() {
  return (
    <main style={{ background: "var(--remedy-paper)", minHeight: "100vh", padding: "48px 32px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <BounceIn>
          <Eyebrow>Exotic Remedy</Eyebrow>
          <h1 style={{ fontSize: 40, margin: "0 0 12px", color: "var(--remedy-ink)" }}>
            A remedy worth flocking to.
          </h1>
          <p style={{ color: "rgba(0,0,0,0.65)", lineHeight: 1.6, maxWidth: "56ch" }}>
            Warm, mascot-led, unmistakably exotic - built classic, styled fun.
          </p>
        </BounceIn>

        <BounceIn delayMs={100} style={{ display: "flex", gap: 12, margin: "24px 0" }}>
          <Button>Shop now</Button>
          <Button variant="gold">See what's new</Button>
          <Button variant="outline">Our story</Button>
        </BounceIn>

        <BounceIn delayMs={180}>
          <div style={{ margin: "8px 0 24px" }}>
            <Chip>Small batch</Chip>
            <Chip gold>Flamingo approved</Chip>
          </div>
        </BounceIn>

        <BounceIn delayMs={260}>
          <Card interactive pattern="dots" eyebrow="Join the flock" title="Get updates">
            <p style={{ color: "rgba(0,0,0,0.65)" }}>New drops, first look, no spam.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Input placeholder="you@example.com" />
              <Button>Join</Button>
            </div>
          </Card>
        </BounceIn>
      </div>
    </main>
  );
}
