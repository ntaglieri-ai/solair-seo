/**
 * Definizione di "contatto" per solairgroup.it, sugli eventi GA4 inviati dal
 * sito (repo v0-prospect-solairgroup: components/ga-event-tracker.tsx e
 * public/configuratore-solair-v11.html).
 *
 * - lead_submit: modulo del configuratore inviato con successo (preventivo o
 *   contratto). complete_configurator scatta subito dopo per lo stesso invio,
 *   quindi NON va sommato.
 * - click_whatsapp / click_phone / click_email: intenzione di contatto diretta.
 * - start_configurator è interesse, non contatto: scatta anche al solo clic su
 *   un link verso il configuratore.
 */
export const CONTACT_EVENTS = [
  { name: "lead_submit", label: "Richieste dal configuratore" },
  { name: "click_whatsapp", label: "Clic WhatsApp" },
  { name: "click_phone", label: "Clic telefono" },
  { name: "click_email", label: "Clic email" },
] as const;

export const INTEREST_EVENTS = [{ name: "start_configurator", label: "Configuratore aperto" }] as const;

export const TRACKED_EVENTS: string[] = [
  ...CONTACT_EVENTS.map((event) => event.name),
  ...INTEREST_EVENTS.map((event) => event.name),
];
