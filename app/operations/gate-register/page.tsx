import { redirect } from "next/navigation";

export default function GateRegisterRedirect() {
  redirect("/site/gate-inward");
}