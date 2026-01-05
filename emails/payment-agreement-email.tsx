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

interface PaymentAgreementEmailProps {
  projectName: string
  description: string
  totalAmount: number
  numberOfInstallments: number
  amountPerInstallment: number
  frequency: number
  confirmUrl: string
}

function getFrequencyText(frequency: number): string {
  switch (frequency) {
    case 7:
      return '7 jours'
    case 14:
      return '14 jours'
    case 30:
      return '30 jours'
    default:
      return `${frequency} jours`
  }
}

export default function PaymentAgreementEmail({
  projectName,
  description,
  totalAmount,
  numberOfInstallments,
  amountPerInstallment,
  frequency,
  confirmUrl,
}: PaymentAgreementEmailProps) {
  const installments = []
  for (let i = 0; i < numberOfInstallments; i++) {
    installments.push({
      number: i + 1,
      amount: amountPerInstallment,
      dateText: i === 0 ? 'à la confirmation de l\'entente' : `${frequency * i} jours après confirmation`,
    })
  }

  return (
    <Html>
      <Head />
      <Preview>Entente de paiement pour le projet {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={h1}>Entente de paiement</Heading>
          </Section>

          <Section style={box}>
            <Text style={text}>
              Cette entente est pour le projet <strong>{projectName}</strong>
            </Text>

            {description && (
              <>
                <Text style={label}>Description:</Text>
                <Text style={text}>{description}</Text>
              </>
            )}

            <Hr style={hr} />

            <Text style={label}>Prix total:</Text>
            <Text style={amountText}>{totalAmount.toFixed(2)} $</Text>

            <Text style={label}>Nombre de versements:</Text>
            <Text style={text}><strong>{numberOfInstallments}</strong></Text>

            <Hr style={hr} />

            {installments.map((installment) => (
              <div key={installment.number} style={installmentBlock}>
                <Text style={installmentTitle}>
                  {installment.number === 1 ? 'Premier versement' : `${installment.number}e versement`}
                </Text>
                <Text style={installmentDetails}>
                  Montant: <strong>{installment.amount.toFixed(2)} $</strong>
                </Text>
                <Text style={installmentDetails}>
                  Date: {installment.dateText}
                </Text>
              </div>
            ))}

            <Hr style={hr} />

            <Text style={warningText}>
              En cliquant le bouton "Confirmer" vous confirmez que vous acceptez les termes de cette entente.
            </Text>

            <Section style={buttonSection}>
              <Button href={confirmUrl} style={button}>
                Confirmer
              </Button>
            </Section>
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
  fontWeight: 'bold' as const,
  margin: '20px 0',
  textAlign: 'center' as const,
}

const label = {
  color: '#666',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '16px 0 4px 0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '4px 0',
}

const amountText = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '4px 0 16px 0',
}

const installmentBlock = {
  backgroundColor: '#F9FAFB',
  padding: '16px',
  borderRadius: '6px',
  border: '1px solid #E5E7EB',
  marginBottom: '12px',
}

const installmentTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 8px 0',
}

const installmentDetails = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
}

const warningText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0',
  padding: '12px',
  backgroundColor: '#FEF3C7',
  borderRadius: '6px',
  border: '1px solid #FDE68A',
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
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 48px',
  textAlign: 'center' as const,
  marginTop: '20px',
}
