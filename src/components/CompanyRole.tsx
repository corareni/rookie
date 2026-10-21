import { titleCase } from "@/lib/applications";

/** Company in bold, role in thin type and title case: "Google  Associate Product Manager Intern". */
export default function CompanyRole({ label, company, role }: { label?: string; company?: string | null; role?: string | null }) {
  const [c, ...rest] = label ? label.split(" · ") : [company ?? "", role ?? ""];
  const r = label ? rest.join(" · ") : (role ?? "");
  return (
    <>
      <b>{c || "Application"}</b>
      {r && <span className="font-light"> {titleCase(r)}</span>}
    </>
  );
}
