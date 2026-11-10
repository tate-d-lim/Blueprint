import { ButtonLink } from "@/app/ui/button";
import type { Profile, Project } from "@/lib/domain/types";
import { startQuery } from "@/lib/plan/url-state";
import { verdictFor } from "@/lib/plan/verdict";
import type { VersionPair } from "@/lib/plan/verification";

/** A saved project whose answers fit no profile (today). It says why, and offers the way to change the answers. */
export function NoProfile({ project, profiles, versions }: { project: Project; profiles: Profile[]; versions: VersionPair[] }) {
  const verdict = verdictFor(project.riskAnswers, profiles, versions);
  return (
    <div className="flex max-w-form flex-col gap-4">
      <h1 className="wide text-display font-semibold">{verdict.heading}</h1>
      <p className="text-lead text-ink-soft">{verdict.sentence}</p>
      <div>
        <ButtonLink href={`/start/needs?${startQuery(project.riskAnswers, project.facts ?? {}, project._id)}`} variant="secondary">
          Change answers
        </ButtonLink>
      </div>
    </div>
  );
}
