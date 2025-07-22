const { DynamoDBClient, PutItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const REGION = 'ap-south-1';
const dynamoClient = new DynamoDBClient({ region: REGION });
const TABLE_NAME = process.env.WEBSOCKET_TABLE_NAME;
const COGNITO_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const jwks = jwksClient({
    jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${COGNITO_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header, callback) {
    jwks.getSigningKey(header.kid, function(err, key) {
        if (err) {
            return callback(err);
        }
        callback(null, key.publicKey || key.rsaPublicKey);
    });
}

exports.connect = async (event) => {
    // Try to get token from query string or headers
    console.log('event', event);
    let token = null;
    if (event.queryStringParameters && event.queryStringParameters.token) {
        token = event.queryStringParameters.token;
    } else if (event.headers && (event.headers.Authorization || event.headers.authorization)) {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        }
    }
    console.log('extracted token', token);
    if (!token) {
        return { statusCode: 401, body: 'Unauthorized: No token provided' };
    }
    console.log('token', token);
    let decoded;
    try {
        decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, {}, (err, decoded) => {
                if (err) {
                    console.error('JWT verification error:', err);
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
    } catch (err) {
        return { statusCode: 401, body: 'Unauthorized: Invalid token' };
    }
    const userId = decoded.sub || decoded.username || decoded.userId;
    if (!userId) {
        return { statusCode: 401, body: 'Unauthorized: Invalid user' };
    }
    const connectionId = event.requestContext.connectionId;
    const params = {
        TableName: TABLE_NAME,
        Item: {
            connectionId: { S: connectionId },
            userId: { S: userId },
        },
    };
    await dynamoClient.send(new PutItemCommand(params));
    console.log('WebSocket connected:', connectionId, 'user:', userId);
    return { statusCode: 200, body: 'Connected.' };
};
  
exports.disconnect = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const params = {
        TableName: TABLE_NAME,
        Key: { connectionId: { S: connectionId } },
    };
    await dynamoClient.send(new DeleteItemCommand(params));
    console.log('WebSocket disconnected:', event.requestContext.connectionId);
    return { statusCode: 200, body: 'Disconnected.' };
  };
