export interface ObservationCandidate {
  observerEntityId: string;
  eligible: boolean;
  content: string;
}
export function interpretEligibleObservations(
  candidates: readonly ObservationCandidate[],
  interpretations: Readonly<Record<string, string>>,
): ObservationCandidate[] {
  const eligible = new Set(
    candidates
      .filter((candidate) => candidate.eligible)
      .map((candidate) => candidate.observerEntityId),
  );
  return candidates
    .filter((candidate) => candidate.eligible)
    .map((candidate) => ({
      ...candidate,
      content:
        eligible.has(candidate.observerEntityId) && interpretations[candidate.observerEntityId]
          ? (interpretations[candidate.observerEntityId] as string)
          : candidate.content,
    }));
}
