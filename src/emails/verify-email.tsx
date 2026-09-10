import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Button } from '@react-email/components';

export interface VerifyEmailProps {
  code?: string;
  userName?: string;
  verificationUrl: string;
}

export function VerifyEmailTemplate({ userName, verificationUrl }: VerifyEmailProps) {
  return (
    <Html>
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');`}</style>
      </Head>
      <Preview>Verify your {process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} email</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>SOLMAIRA</Heading>
            <Text style={tagline}>GiftCardShop</Text>
          </Section>

          <Hr style={divider} />

          <Section style={content}>
            <Text style={greeting}>{userName ? `Hey ${userName},` : 'Hey there,'}</Text>
            <Text style={text}>Verify your email address to get started on {process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}.</Text>

            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                Verify Email
              </Button>
            </Section>

            <Text style={linkText}>
              or copy this link in your browser: <span style={linkUrl}>{verificationUrl}</span>
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              If you didn&apos;t create a {process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} account, you can safely ignore this email.
            </Text>
            <Text style={footerBrand}>
              © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// --- Styles ---
const body = {
  backgroundColor: '#0f172a',
  fontFamily: 'Inter, -apple-system, sans-serif',
  margin: '0' as const,
  padding: '40px 0',
};

const container = {
  backgroundColor: '#1e293b',
  borderRadius: '16px',
  border: '1px solid #334155',
  margin: '0 auto',
  maxWidth: '480px',
  padding: '0',
};

const header = {
  padding: '32px 32px 0',
  textAlign: 'center' as const,
};

const logo = {
  color: '#34d399',
  fontSize: '28px',
  fontWeight: '700' as const,
  letterSpacing: '6px',
  margin: '0',
};

const tagline = {
  color: '#94a3b8',
  fontSize: '12px',
  letterSpacing: '2px',
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
};

const divider = {
  borderColor: '#334155',
  margin: '24px 32px',
};

const content = {
  padding: '0 32px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '0 auto 20px',
};

const button = {
  backgroundColor: '#34d399',
  borderRadius: '10px',
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '700' as const,
  padding: '14px 32px',
  textDecoration: 'none',
};

const linkText = {
  color: '#64748b',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: '0',
  wordBreak: 'break-all' as const,
};

const linkUrl = {
  color: '#34d399',
  fontSize: '11px',
};

const greeting = {
  color: '#f1f5f9',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const text = {
  color: '#cbd5e1',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const footer = {
  padding: '0 32px 32px',
};

const footerText = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '0 0 8px',
};

const footerBrand = {
  color: '#475569',
  fontSize: '11px',
  margin: '0',
};

export default VerifyEmailTemplate;
