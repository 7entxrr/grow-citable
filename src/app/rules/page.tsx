import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rules & Policies - Grow Citable",
  description: "Rules, policies, and terms for using Grow Citable platform.",
};

export default function RulesPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", fontFamily: '"Kumbh Sans", sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>Rules & Policies</h1>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 32, lineHeight: 1.5 }}>
        These rules govern the use of the Grow Citable platform, including team assignments, scheduling, and data handling.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>1. Team Assignment</h2>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>
          Upon submitting a team request, Grow Citable will assign a dedicated AI ranking specialist within 24 hours.
          The specialist will work within the time slot selected by the client. Assignment is subject to specialist availability.
          Grow Citable reserves the right to reassign specialists if necessary.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>2. Scheduling & Shifts</h2>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>
          Clients may select any 8-hour consecutive window for their dedicated shift.
          The shift must not exceed 8 hours per day. Changes to the scheduled shift require 24 hours notice.
          Missed or unused shift time will not be carried over to the next day.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>3. Data Privacy</h2>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>
          All client data, including website URLs, audit results, and team communications, are handled in accordance
          with our privacy policy. Data is encrypted in transit and at rest. Grow Citable does not share client data
          with third parties without explicit consent.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>4. Cancellation & Rescheduling</h2>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>
          Clients may cancel or reschedule their team assignment at any time. Cancellation requests must be submitted
          via the dashboard or by contacting support. Refunds are handled according to the payment terms agreed upon during purchase.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>5. Acceptable Use</h2>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>
          Clients agree to use the platform for lawful purposes only. Automated scraping, abuse of the API,
          or any activity that disrupts platform operations is prohibited. Grow Citable reserves the right to
          terminate access for violations of these terms.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>6. Modifications</h2>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>
          Grow Citable reserves the right to update these rules and policies at any time. Clients will be notified
          of material changes via email or platform notification. Continued use after changes constitutes acceptance.
        </p>
      </section>

      <p style={{ fontSize: 13, color: "#999", borderTop: "1px solid #f0f0f0", paddingTop: 20, marginTop: 40 }}>
        Last updated: July 2026. For questions, contact support@growcitable.com
      </p>
    </main>
  );
}
