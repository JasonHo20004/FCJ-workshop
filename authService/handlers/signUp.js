// signUp.js (CommonJS version)
const { CognitoIdentityProvider, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const UserModel = require("../models/UserModel");

const client = new CognitoIdentityProvider({
    region: process.env.AWS_REGION
});

const clientId = process.env.CLIENT_ID;

exports.signUp = async (event) => {
    const { email, password, fullName } = JSON.parse(event.body);
    const username = fullName.toLowerCase().replace(/\s+/g, '');
    const params = {
        ClientId: clientId,
        Username: username,
        Password: password,
        UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: fullName }
        ]
    };

    try {
        const command = new SignUpCommand(params);
        const response = await client.send(command);
        const newUser = new UserModel(email, fullName);
        await newUser.save();
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'User signed up successfully',
                data: response
            })
        };
    } catch (error) {
        console.error('Error signing up user:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error signing up user',
                error: error.message
            })
        };
    }
};
