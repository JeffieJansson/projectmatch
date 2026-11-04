import { useLocation, useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();
  const location = useLocation();

  // Go back to the previous page, or to Settings when opened directly (no in-app history)
  function goBack() {
    if (location.key !== 'default') navigate(-1);
    else navigate('/settings');
  }

  return (
    <div style={s.page}>
      <button style={s.back} onClick={goBack}>← Back</button>

      <h1 style={s.title}>Terms of Service</h1>
      <p style={s.meta}>Last updated: April 2026</p>

      <Section title="1. The service">
        <p>
          ProjectMatch is a platform for finding collaborators for side projects.
          The service is provided free of charge and without guarantees of availability.
          We reserve the right to modify or discontinue the service at any time.
        </p>
      </Section>

      <Section title="2. Your account">
        <p>
          You must be at least 16 years old to use ProjectMatch.
          You are responsible for keeping your login credentials secure and for all
          activity that occurs under your account. Contact us immediately if you
          suspect unauthorised access.
        </p>
      </Section>

      <Section title="3. Conduct">
        <p>You agree not to:</p>
        <ul>
          <li>Post false, misleading, or offensive content</li>
          <li>Harass, threaten, or discriminate against other users</li>
          <li>Use the service for spam or unsolicited marketing</li>
          <li>Attempt to access other users' accounts or data</li>
          <li>Use automated tools to scrape or abuse the service</li>
        </ul>
      </Section>

      <Section title="4. Content">
        <p>
          You retain ownership of the content you publish (profile, projects, messages).
          By publishing content you grant ProjectMatch the right to display it to other
          users for the purpose of providing the service.
        </p>
        <p>
          We reserve the right to remove content or suspend accounts that violate these
          terms, without prior notice.
        </p>
      </Section>

      <Section title="5. Limitation of liability">
        <p>
          ProjectMatch is a meeting place and takes no responsibility for what happens
          in collaborations that arise through the platform. We are not liable for any
          losses, damages, or disputes between users.
        </p>
      </Section>

      <Section title="6. Changes to the terms">
        <p>
          We may update these terms at any time. Continued use of the service after
          changes have been made constitutes acceptance of the new terms.
          Significant changes will be communicated via the app.
        </p>
      </Section>

      <Section title="7. Contact">
        <p>
          Questions about these terms can be sent to{' '}
          <a href="mailto:hello@projectmatch.se" style={s.link}>hello@projectmatch.se</a>.
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
