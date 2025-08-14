import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import sgMail from '@sendgrid/mail';

export const handler = async (event: any) => {
  try {
    const secretName = process.env.SENDGRID_SECRET_NAME;
    if (!secretName) {
      throw new Error('SENDGRID_SECRET_NAME environment variable is not set');
    }

    console.log("Using secret:", secretName); // debug

    const client = new SecretsManagerClient({});
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const secretValue = await client.send(command);

    if (!secretValue.SecretString) {
      throw new Error('Secret is empty or not found');
    }

    let apiKey: string;
    try {
      // If stored as JSON
      const parsed = JSON.parse(secretValue.SecretString);
      apiKey = parsed.SENDGRID_API_KEY || parsed.apiKey || parsed.key;
    } catch {
      // If stored as plain string
      apiKey = secretValue.SecretString;
    }

    if (!apiKey) {
      throw new Error('SendGrid API Key not found in secret');
    }

    sgMail.setApiKey(apiKey);

    const body = JSON.parse(event.body);

    await sgMail.send({
      to: body.to,
      from: 'manoj.r@happiestminds.com', // Replace with your verified sender
      subject: body.subject,
      text: body.message,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' }),
    };
  } catch (err: any) {
    console.error("Error sending email:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
