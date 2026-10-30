import type { Metadata } from "next";
import { JOURNAL_FEED_URL } from "@/lib/journal";
import "./journal.css";

export const metadata: Metadata = {
  alternates: {
    types: {
      "application/rss+xml": JOURNAL_FEED_URL,
    },
  },
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
