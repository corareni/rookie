import Link from "next/link";

/** A friendly "this is part of Premium" line where an email feature would be. */
export default function UpgradeNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[14px] text-[var(--ink2)] ${className}`}>
      <b className="text-[var(--ink)]">Email updates are part of Premium.</b> rookie reads emails from companies and moves your
      roles to the right stage, with interview dates and next steps.{" "}
      <Link href="/profile#plan" className="font-bold">
        See plans →
      </Link>
    </p>
  );
}
