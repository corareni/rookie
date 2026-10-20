"use client";

import { useEffect } from "react";

/** A4 page in the house layout (Times, 20mm side margins). Opens the print dialog so the user can save a PDF. */
export default function PrintShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <style>{`
        @page { size: A4; margin: 16mm 20mm 14mm; }
        @media print {
          body::before { display: none !important; }
          html, body { background: #fff !important; }
          .wrap { padding: 0 !important; max-width: none !important; }
          .a4 { width: auto !important; min-height: 0 !important; padding: 0 !important; }
        }
      `}</style>
      <p className="mb-4 text-sm text-[var(--ink2)] print:hidden">
        In the print window, choose <strong>Save as PDF</strong>. Turn off &quot;Headers and footers&quot; for a clean page.{" "}
        <button type="button" className="font-semibold underline" onClick={() => window.print()}>
          Print again
        </button>
      </p>
      <div
        className="a4 mx-auto bg-white text-black shadow-[0_0_0_1px_var(--line)] print:shadow-none"
        style={{ width: "210mm", minHeight: "297mm", padding: "16mm 20mm 14mm", fontFamily: "'Times New Roman', Times, serif" }}
      >
        {children}
      </div>
    </>
  );
}
