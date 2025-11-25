import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components'

interface PasswordResetEmailProps {
  resetUrl: string
  userName?: string
}

export default function PasswordResetEmail({
  resetUrl,
  userName,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Réinitialisation de votre mot de passe SoloPack</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={h1}>
              Réinitialisation de mot de passe
            </Heading>
          </Section>

          <Section style={box}>
            <Text style={greeting}>
              Bonjour{userName ? ` ${userName}` : ''},
            </Text>

            <Text style={text}>
              Vous avez demandé à réinitialiser votre mot de passe pour votre compte SoloPack.
            </Text>

            <Text style={text}>
              Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe. Ce lien est valide pendant <strong>1 heure</strong>.
            </Text>

            <Section style={buttonSection}>
              <Button href={resetUrl} style={button}>
                Réinitialiser mon mot de passe
              </Button>
            </Section>

            <Text style={text}>
              Ou copiez et collez cette URL dans votre navigateur :
            </Text>
            <Text style={linkText}>
              {resetUrl}
            </Text>

            <Hr style={hr} />

            <Text style={warningText}>
              Si vous n&apos;avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe ne sera pas modifié.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Cet email a été envoyé par SoloPack.
            <br />
            Si vous avez des questions, contactez-nous.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const box = {
  padding: '0 48px',
}

const headerSection = {
  padding: '20px 48px 0 48px',
}

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '20px 0',
}

const greeting = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '24px 0 16px 0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const linkText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
  wordBreak: 'break-all' as const,
  backgroundColor: '#F9FAFB',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #E5E7EB',
}

const warningText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  fontStyle: 'italic',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#4F46E5',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 48px',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 48px',
  textAlign: 'center' as const,
}
