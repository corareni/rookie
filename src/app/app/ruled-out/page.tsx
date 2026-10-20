import { redirect } from "next/navigation";

export default function RuledOutPage() {
  redirect("/app/barriers");
}
