/**
 * Starter status-page layout built from @exotic/ui primitives, shaped to match
 * `exo company status`'s real output (ops/brand-audit/finance/repo-health).
 * Copy this file into your app and wire the props to real data - it's a
 * reference composition, not a component this package exports.
 */
import { Badge, Card, FadeIn, Section, SectionGrid, Stat } from "@exotic/ui";

export interface VentureStatus {
  name: string;
  hasBridge: boolean;
  totalSteps?: number;
  stepCounts?: Record<string, number>;
  autoMode?: string;
}

export interface StatusPageProps {
  ventures: VentureStatus[];
  brandFindings: { brand: string; level: "ok" | "warn"; message: string }[];
  repoHealth: { branch: string | null; uncommittedFiles: number };
}

function toneForStepCounts(counts?: Record<string, number>) {
  if (!counts) return "neutral" as const;
  if (counts.blocked) return "critical" as const;
  if (counts.running) return "positive" as const;
  return "neutral" as const;
}

export function StatusPage({ ventures, brandFindings, repoHealth }: StatusPageProps) {
  return (
    <main style={{ background: "var(--exotic-bg)", minHeight: "100vh" }}>
      <Section eyebrow="Company engine" title="Status" description="Advise and surface - the human decides.">
        <FadeIn>
          <SectionGrid>
            <Stat value={repoHealth.branch ?? "unknown"} label="Branch" />
            <Stat value={repoHealth.uncommittedFiles} label="Uncommitted files" />
            <Stat value={ventures.length} label="Tracked ventures" />
          </SectionGrid>
        </FadeIn>
      </Section>

      <Section title="Ventures">
        <SectionGrid>
          {ventures.map((venture, i) => (
            <FadeIn delayMs={i * 80} key={venture.name}>
              <Card interactive eyebrow={venture.hasBridge ? "Operational" : "No bridge yet"} title={venture.name}>
                {venture.hasBridge ? (
                  <>
                    <Badge tone={toneForStepCounts(venture.stepCounts)}>{venture.autoMode}</Badge>
                    <p style={{ color: "var(--exotic-muted)", marginTop: 8 }}>{venture.totalSteps} steps</p>
                  </>
                ) : (
                  <p style={{ color: "var(--exotic-muted)" }}>Not wired up yet.</p>
                )}
              </Card>
            </FadeIn>
          ))}
        </SectionGrid>
      </Section>

      <Section title="Brand audit">
        <SectionGrid>
          {brandFindings.map((finding, i) => (
            <FadeIn delayMs={i * 60} key={`${finding.brand}-${i}`}>
              <Card eyebrow={finding.brand}>
                <Badge tone={finding.level === "ok" ? "positive" : "warning"}>{finding.level}</Badge>
                <p style={{ color: "var(--exotic-muted)", marginTop: 8 }}>{finding.message}</p>
              </Card>
            </FadeIn>
          ))}
        </SectionGrid>
      </Section>
    </main>
  );
}
