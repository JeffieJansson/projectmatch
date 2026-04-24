import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate(-1)}>← Back</button>

      <h1 style={s.title}>Privacy Policy</h1>
      <p style={s.meta}>Last updated: April 2026</p>

      <Section title="1. Data we collect">
        <p>When you create an account on ProjectMatch we collect the following information:</p>
        <ul>
          <li>Name and email address (on registration)</li>
          <li>Profile information you choose to provide: tagline, bio, roles, tools, GitHub link, and portfolio link</li>
          <li>Profile picture (if you choose to upload one)</li>
          <li>Projects you create and the interests you express in other projects</li>
          <li>Messages you send via the chat feature</li>
        </ul>
      </Section>

      <Section title="2. How we use your data">
        <p>Your information is used solely to:</p>
        <ul>
          <li>Show your profile to other users who may want to collaborate</li>
          <li>Match you with projects that are looking for your skills</li>
          <li>Enable communication between matched users</li>
          <li>Improve the service based on anonymised usage patterns</li>
        </ul>
        <p>We never sell your data to third parties.</p>
      </Section>

      <Section title="3. Storage and security">
        <p>
          All data is stored securely via <strong>Supabase</strong> (supabase.com), a cloud-based
          database service. Data is stored within the EU. Supabase is GDPR-compliant and uses
          encryption for data at rest and in transit.
        </p>
      </Section>

      <Section title="4. Your rights">
        <p>You have the right to:</p>
        <ul>
          <li>Access the data we hold about you</li>
          <li>Correct inaccurate information via your profile page</li>
          <li>Request deletion of your account and all associated data</li>
        </ul>
        <p>
          To delete your account or for any other questions about your data, contact us at{' '}
          <a href="mailto:hello@projectmatch.se" style={s.link}>hello@projectmatch.se</a>.
          We will process your request within 30 days.
        </p>
      </Section>

      <Section title="5. Cookies">
        <p>
          We only use technically necessary cookies to keep you signed in.
          We do not use tracking or advertising cookies.
        </p>
      </Section>

      <Section title="6. Changes">
        <p>
          We may update this policy from time to time. For significant changes we will notify
          you via the app. Continued use after an update constitutes acceptance of the new policy.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <h2 style={s.sectionTitle}>{title}</h2>
      <div style={s.sectionBody}>{children}</div>
    </div>
  );
}

const s = {
  page: {
    padding: '20px 20px 56px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: 480,
    width: '100%',
    boxSizing: 'border-box',
  },
  back: {
    background: 'none', border: 'none', color: '#a78bfa',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    padding: 0, textAlign: 'left', marginBottom: 8,
  },
  title: { margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  meta: { margin: '0 0 16px', fontSize: 13, color: '#64748b' },
  section: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: '#c4b5fd' },
  sectionBody: {
    fontSize: 14, color: '#94a3b8', lineHeight: 1.7,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  link: { color: '#a78bfa', fontWeight: 600 },
};
