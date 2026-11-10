const baseUrl = (
  process.env.LTI_TOOL_BASE_URL ?? 'https://studon-staging.kwarc.info/StudyBuddy'
).replace(/\/+$/, '');

const urls = [
  ['OIDC login URL', `${baseUrl}/api/lti/login`],
  ['Launch redirect URL', `${baseUrl}/api/lti/launch`],
  ['JWKS URL', `${baseUrl}/api/lti/jwks`],
  ['Target link URI', `${baseUrl}/study-buddy`],
];

export default function Index() {
  return (
    <main>
      <h1>ALeA Study Buddy LTI Tool</h1>
      <p>Register these URLs in Saltire:</p>
      <ul>
        {urls.map(([label, value]) => (
          <li key={label}>
            {label}: <code>{value}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
