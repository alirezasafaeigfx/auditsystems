import { headers } from "next/headers";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-asdev-locale") === "en" ? "en" : "fa";
  return <LoginForm locale={locale} />;
}
