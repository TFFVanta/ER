/**
 * Starter dashboard layout built from @exotic/ui primitives.
 * Copy this file into your app and adapt content/props - it's a reference
 * composition, not a component this package exports.
 */
import { Card, Chip, Eyebrow, FadeIn, Input, Section, SectionGrid, Stat } from "@exotic/ui";

export function DashboardPage() {
  return (
    <main style={{ background: "var(--exotic-bg)", minHeight: "100vh" }}>
      <Section eyebrow="Venture workspace" title="Overview">
        <FadeIn>
          <SectionGrid>
            <Stat value="4" label="Active ventures" />
            <Stat value="12" label="Steps in flight" />
            <Stat value="98%" label="Evidence coverage" />
          </SectionGrid>
        </FadeIn>
      </Section>

      <Section title="Ventures">
        <FadeIn style={{ marginBottom: 24 }}>
          <Eyebrow>Filter</Eyebrow>
          <Input placeholder="Search ventures..." />
        </FadeIn>
        <SectionGrid>
          <FadeIn delayMs={0}>
            <Card interactive eyebrow="Phase 1" title="Foundation runtime">
              <div>
                <Chip>Running</Chip>
                <Chip>Auto-tick</Chip>
              </div>
            </Card>
          </FadeIn>
          <FadeIn delayMs={80}>
            <Card interactive eyebrow="Phase 2" title="Desktop packaging">
              <div>
                <Chip>Verified</Chip>
              </div>
            </Card>
          </FadeIn>
        </SectionGrid>
      </Section>
    </main>
  );
}
