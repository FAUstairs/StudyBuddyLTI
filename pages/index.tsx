import type { GetServerSideProps } from 'next';

type Props = {
  urls: Array<[string, string]>;
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const configuredBaseUrl = (process.env.LTI_TOOL_BASE_URL ?? 'http://localhost:4200').replace(
    /\/+$/,
    '',
  );
  const baseUrl = configuredBaseUrl.endsWith('/StudyBuddy')
    ? configuredBaseUrl
    : `${configuredBaseUrl}/StudyBuddy`;

  return {
    props: {
      urls: [
        ['OIDC login URL', `${baseUrl}/api/lti/login`],
        ['Launch redirect URL', `${baseUrl}/api/lti/launch`],
        ['JWKS URL', `${baseUrl}/api/lti/jwks`],
        ['Target link URI', `${baseUrl}/study-buddy`],
      ],
    },
  };
};

export default function Index({ urls }: Props) {
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
