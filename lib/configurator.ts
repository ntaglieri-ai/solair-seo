/** Questi conteggi sono eventi ripetibili, non persone né un funnel deduplicato. */
export const CONFIGURATOR_EVENTS = ["start_configurator", "complete_configurator", "lead_submit"] as const;
export type ConfiguratorReport = {
  from: string; to: string; channel: "Organic Search";
  pageViews: number;
  events: Record<string, number>;
  reliable: boolean;
  limitations: string[];
  timeZone: string | null;
};

export function reportQuality(metadata: { subjectToThresholding?: boolean | null; samplingMetadatas?: unknown[] | null; dataLossFromOtherRow?: boolean | null } | null | undefined) {
  const limitations: string[] = [];
  if (metadata?.subjectToThresholding) limitations.push("Google segnala soglie di riservatezza: alcuni eventi potrebbero non essere visibili.");
  if (metadata?.samplingMetadatas?.length) limitations.push("Google segnala dati campionati.");
  if (metadata?.dataLossFromOtherRow) limitations.push("Google segnala righe aggregate non disponibili nel dettaglio.");
  return limitations;
}
