/**
 * Starter landing-page layout built from @exotic/ui primitives.
 * Copy this file into your app and adapt content/props - it's a reference
 * composition, not a component this package exports.
 */
import { Button, Card, FadeIn, Section, SectionGrid, Stat } from "@exotic/ui";

export function LandingPage() {
  return (
    <main style={{ background: "var(--exotic-bg)", minHeight: "100vh" }}>
      <Section
        eyebrow="EXOTIC"
        title="An operator-grade AI workspace."
        description="Autonomous ventures, evidence-gated progress, and a unified command surface - built for people who run real systems."
      >
        <FadeIn style={{ display: "flex", gap: 12 }}>
          <Button variant="primary">Launch workspace</Button>
          <Button variant="ghost">Read the docs</Button>
        </FadeIn>
      </Section>

      <Section eyebrow="Why EXOTIC" title="Built for control, not spectacle">
        <SectionGrid>
          <FadeIn delayMs={0}>
            <Card interactive eyebrow="Evidence-gated" title="Nothing completes without proof">
              Every roadmap step requires real evidence before it can advance - no fabricated
              progress, no silent ticks.
            </Card>
          </FadeIn>
          <FadeIn delayMs={80}>
            <Card interactive eyebrow="Autonomous" title="Dispatch runs itself">
              The worker dispatch engine backs off, retries, and reports health - so it runs
              unattended without silently failing.
            </Card>
          </FadeIn>
          <FadeIn delayMs={160}>
            <Card interactive eyebrow="Operator-grade" title="One command surface">
              Studio, desktop, and CLI all read the same live state - no stale dashboards, no
              context switching.
            </Card>
          </FadeIn>
        </SectionGrid>
      </Section>

      <Section eyebrow="At a glance" title="Live system stats">
        <SectionGrid>
          <Stat value="27/27" label="Workspace builds passing" />
          <Stat value="55" label="Verification checks" />
          <Stat value="0" label="Fabricated evidence records" />
        </SectionGrid>
      </Section>
    </main>
  );
}
