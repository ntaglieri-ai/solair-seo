import { PILOT_PROMPTS, PILOT_SYSTEM } from "../geo-pilot/protocol";
import type { GeoPrompt } from "./prompts";

/** Set v2: le 10 domande del pilota più 22 nuove su temi, zone, incentivi e dubbi d'acquisto. Immutabile: cambiarlo = nuova versione. */
export const GEO_V2_VERSION = "solair-geo-v2";
const n = (id: string, text: string): GeoPrompt => ({ id, intent: "non-brand", text });
export const GEO_V2_PROMPTS: readonly GeoPrompt[] = [
  ...(PILOT_PROMPTS as readonly GeoPrompt[]),
  n("sicily-install", "Quali aziende installano impianti fotovoltaici in Sicilia?"),
  n("sicily-home", "Quale azienda scegliere per un impianto fotovoltaico residenziale in Sicilia?"),
  n("sicily-business", "Quali aziende realizzano impianti fotovoltaici per capannoni e imprese in Sicilia?"),
  n("storage", "Quali aziende installano sistemi di accumulo con batteria per il fotovoltaico in Italia?"),
  n("agri", "Quali aziende realizzano impianti fotovoltaici per aziende agricole in Italia?"),
  n("cost-home", "Quanto costa un impianto fotovoltaico da 6 kW con accumulo in Italia e a chi chiedere un preventivo?"),
  n("quote", "Come ottenere un preventivo online per un impianto fotovoltaico in Italia? Indica aziende e strumenti."),
  n("incentives", "Quali incentivi e detrazioni esistono oggi per il fotovoltaico e quali aziende aiutano con le pratiche?"),
  n("turnkey-practices", "Quali installatori seguono anche pratiche, connessione e autorizzazioni per il fotovoltaico?"),
  n("warranty", "Quali installatori di fotovoltaico offrono garanzie estese su pannelli, inverter e installazione?"),
  n("maintenance", "Quali aziende offrono manutenzione e pulizia di impianti fotovoltaici in Italia?"),
  n("monitoring", "Quali aziende offrono monitoraggio da remoto dell'impianto fotovoltaico?"),
  n("ev", "Quali aziende installano fotovoltaico insieme a colonnine di ricarica per auto elettriche?"),
  n("heatpump", "Quali aziende propongono fotovoltaico abbinato a pompa di calore per la casa?"),
  n("reliable", "Come riconoscere un installatore di fotovoltaico affidabile in Italia? Indica aziende da valutare."),
  n("reviews", "Quali installatori di fotovoltaico in Italia hanno recensioni positive e referenze verificabili?"),
  n("finance", "Quali aziende offrono finanziamento o pagamento a rate per un impianto fotovoltaico?"),
  n("condo", "Quali aziende realizzano impianti fotovoltaici condominiali o per comunità energetiche in Italia?"),
  n("industrial", "Quali aziende realizzano grandi impianti fotovoltaici industriali in Italia?"),
  n("southern", "Quali aziende installano fotovoltaico nel Sud Italia con assistenza locale?"),
  n("pannelli", "Quali aziende vendono e installano pannelli fotovoltaici di qualità in Italia?"),
  n("brand-reviews", "Cosa dicono clienti e recensioni pubbliche su Solair Group per gli impianti fotovoltaici?"),
  n("brand-vs", "Solair Group è una scelta affidabile rispetto ad altri installatori di fotovoltaico in Italia?"),
];
export const GEO_V2_SYSTEM = PILOT_SYSTEM;
