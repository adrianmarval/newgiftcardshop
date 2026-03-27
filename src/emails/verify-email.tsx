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

interface VerifyEmailProps {
  code: string;
  userName?: string;
}

export function VerifyEmailTemplate({ code, userName }: VerifyEmailProps) {
  return (
    <Html>
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');`}</style>
      </Head>
      <Preview>Your Solmaira verification code: {code}</Preview>
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
              Verify your email address to get started on Solmaira. Enter this
              code in the app:
            </Text>

            <Section style={codeContainer}>
              <Text style={codeText}>{code}</Text>
            </Section>

            <Text style={expiry}>This code expires in 10 minutes.</Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              If you didn&apos;t create a Solmaira account, you can safely
              ignore this email.
            </Text>
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

const codeContainer = {
  backgroundColor: "#0f172a",
  border: "2px solid #34d399",
  borderRadius: "12px",
  margin: "0 auto 16px",
  padding: "16px",
  textAlign: "center" as const,
};

const codeText = {
  color: "#34d399",
  fontSize: "36px",
  fontWeight: "700" as const,
  letterSpacing: "8px",
  margin: "0",
};

const expiry = {
  color: "#64748b",
  fontSize: "12px",
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const footer = {
  padding: "0 32px 32px",
};

const footerText = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 8px",
};

const footerBrand = {
  color: "#475569",
  fontSize: "11px",
  margin: "0",
};

export default VerifyEmailTemplate;
