import { redirect } from "next/navigation";

export default function PunchlistLegacyRedirect() {
  redirect("/handover/punch-list");
}