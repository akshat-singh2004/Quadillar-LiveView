import { redirect } from "next/navigation";

export default function GatePassRedirect() {
  redirect("/site/gate-inward");
}