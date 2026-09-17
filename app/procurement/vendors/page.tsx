import { redirect } from "next/navigation";

export default function ProcurementVendorsRedirect() {
  redirect("/procurement/tenders");
}