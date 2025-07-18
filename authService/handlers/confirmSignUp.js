const { CognitoIdentityProvider, ConfirmSignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProvider({
    region: process.env.AWS_REGION
});
const clientId = process.env.CLIENT_ID;

exports.confirmSignUp = async (event) => {
    const { email, confirmationCode } = JSON.parse(event.body);

    const params = {
        ClientId: clientId,
        Username: email,
        ConfirmationCode: confirmationCode
    };

    try {
        const command = new ConfirmSignUpCommand(params);
        const response = await client.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'User confirmed successfully',
                data: response
            })
        };
    } catch (error) {
        console.error('Error confirming user:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error confirming user',
                error: error.message
            })
        };
    }
}