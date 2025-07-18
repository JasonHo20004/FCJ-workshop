const {CognitoIdentityProviderClient, GlobalSignOutCommand} = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION
});

exports.signOut = async (event) => {
    const { accessToken } = JSON.parse(event.body);

    const params = {
        AccessToken: accessToken,
    };

    try {
        const command = new GlobalSignOutCommand(params);
        const response = await client.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'User signed out successfully',
                data: response
            })
        };
    } catch (error) {
        console.error('Error signing out user:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error signing out user',
                error: error.message
            })
        };
    }
}