"use client";

export function ExportButton() {
  return (
    <button className="export-button" onClick={() => window.print()} type="button">
      Esporta PDF
    </button>
  );
}
