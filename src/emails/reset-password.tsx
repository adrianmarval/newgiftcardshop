import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ResetPasswordProps {
  url: string;
  userName?: string;
}

export function ResetPasswordTemplate({ url, userName }: ResetPasswordProps) {
  return (
    <Html>
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');`}</style>
      </Head>
      <Preview>Reset your Solmaira password</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>SOLMAIRA</Heading>
            <Text style={tagline}>Gift Card Marketplace</Text>
          </Section>

          <Hr style={divider} />

          <Section style={content}>
            <Text style={greeting}>
              {userName ? `Hey ${userName},` : "Hey there,"}
            </Text>
            <Text style={text}>
              We received a request to reset your password. Click the link below
              to set a new password:
            </Text>

            <Section style={linkContainer}>
              <a href={url} style={linkButton}>
                Reset Password
              </a>
            </Section>

            <Text style={expiry}>This link expires in 1 hour.</Text>

            <Section style={warningBox}>
              <Text style={warningText}>
                🔒 If you didn&apos;t request this, your account may be at
                risk. Change your password immediately.
              </Text>
            </Section>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              If the button doesn&apos;t work, copy this link into your browser:
            </Text>
            <Text style={urlText}>{url}</Text>
            <Text style={footerBrand}>
              © {new Date().getFullYear()} Solmaira. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// --- Styles ---
const body = {
  backgroundColor: "#0f172a",
  fontFamily: "Inter, -apple-system, sans-serif",
  margin: "0" as const,
  padding: "40px 0",
};

const container = {
  backgroundColor: "#1e293b",
  borderRadius: "16px",
  border: "1px solid #334155",
  margin: "0 auto",
  maxWidth: "480px",
  padding: "0",
};

const header = {
  padding: "32px 32px 0",
  textAlign: "center" as const,
};

const logo = {
  color: "#34d399",
  fontSize: "28px",
  fontWeight: "700" as const,
  letterSpacing: "6px",
  margin: "0",
};

const tagline = {
  color: "#94a3b8",
  fontSize: "12px",
  letterSpacing: "2px",
  margin: "4px 0 0",
  textTransform: "uppercase" as const,
};

const divider = {
  borderColor: "#334155",
  margin: "24px 32px",
};

const content = {
  padding: "0 32px",
};

const greeting = {
  color: "#f1f5f9",
  fontSize: "18px",
  fontWeight: "600" as const,
  margin: "0 0 12px",
};

const text = {
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const linkContainer = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const linkButton = {
  backgroundColor: "#34d399",
  borderRadius: "8px",
  color: "#0f172a",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700" as const,
  padding: "12px 32px",
  textDecoration: "none",
};

const expiry = {
  color: "#64748b",
  fontSize: "12px",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const warningBox = {
  backgroundColor: "#1c1917",
  border: "1px solid #854d0e",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0 0 8px",
};

const warningText = {
  color: "#fbbf24",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0",
};

const footer = {
  padding: "0 32px 32px",
};

const footerText = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 4px",
};

const urlText = {
  color: "#34d399",
  fontSize: "11px",
  wordBreak: "break-all" as const,
  margin: "0 0 12px",
};

const footerBrand = {
  color: "#475569",
  fontSize: "11px",
  margin: "0",
};

export default ResetPasswordTemplate;
