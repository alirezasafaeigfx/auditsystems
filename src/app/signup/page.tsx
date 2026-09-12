import { headers } from "next/headers";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-asdev-locale") === "en" ? "en" : "fa";
  return <SignupForm locale={locale} />;
}
