import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import AccountMenu from "./components/account-menu";
import { GlobalLocaleTranslator } from "./components/global-locale-translator";

export const metadata: Metadata = {
  title: "Propora.AI",
  description:
    "Platform pencarian dan analisis lokasi properti berbasis AI.",
  other: {
    google: "notranslate",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} translate="no" className="notranslate">
      <body><NextIntlClientProvider><GlobalLocaleTranslator /><AccountMenu />{children}</NextIntlClientProvider></body>
    </html>
  );
}
