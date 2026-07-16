import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout Successful | Grow Citable",
  description: "Configure your setup keys and launch your first AI visibility index audit campaign.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
