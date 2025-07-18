const { CognitoIdentityProviderClient, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
});

const clientId = process.env.CLIENT_ID;

exports.signIn = async (event) => {
    const { email, password } = JSON.parse(event.body);

    const params = {
        ClientId: clientId,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    };


    try {
        const command = new InitiateAuthCommand(params);
        const response = await client.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify(response),
            token: response.AuthenticationResult,
        };
    } catch (error) {
        console.error('Sign in error:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Sign in failed',
                error: error.message,
                details: error
            }),
        };
    }
};