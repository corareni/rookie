"use client";

import { useRouter } from "next/navigation";
import Dialog from "@/components/Dialog";

/** Shown when someone tries to apply or write documents before their profile is complete. */
export default function ProfileGate({ what, onClose }: { what: string | null; onClose: () => void }) {
  const router = useRouter();
  return (
    <Dialog
      open={!!what}
      title="Complete your profile first"
      onCancel={onClose}
      actions={[
        { label: "Not now", tone: "ghost", onClick: onClose },
        {
          label: "Go to my profile",
          onClick: () => {
            onClose();
            router.push("/profile");
          },
        },
      ]}
    >
      <p>
        Before you {what}, Rookie needs your name and at least some experience or education. That&apos;s what your CV and
        cover letter are built from, and it makes every score about you.
      </p>
      <p className="mt-2">
        The quickest way: upload your CV on your Profile and press Save. You can keep adding roles to your board meanwhile.
      </p>
    </Dialog>
  );
}
