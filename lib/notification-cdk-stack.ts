import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';

export class NotificationCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference existing SendGrid secret
    const sendGridSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'SendGridSecret',
      'notification/sendgrid' // change if your secret name is different
    );

    // Lambda function
    const emailLambda = new lambda.NodejsFunction(this, 'EmailFunction', {
      entry: path.join(__dirname, '../lambda/email.ts'),
      handler: 'handler',
      environment: {
        SENDGRID_SECRET_NAME: sendGridSecret.secretName,
      },
    });

    // Grant Lambda read access to secret
    sendGridSecret.grantRead(emailLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'EmailApi', {
      restApiName: 'Notification Service',
      description: 'Sends notifications using SendGrid',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: 'prod'
      }
    });

    const emailResource = api.root.addResource('send');
    emailResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(emailLambda),
      {
        authorizationType: apigateway.AuthorizationType.NONE
      }
    );

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `${api.url}send`,
    });
  }
}
