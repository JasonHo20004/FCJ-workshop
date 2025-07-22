const { DynamoDBClient, QueryCommand, PutItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { ApiGatewayManagementApi } = require('aws-sdk');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { v4: uuidv4 } = require('uuid');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const Redis = require('ioredis');

const MESSAGE_TABLE = process.env.MESSAGE_TABLE_NAME;
const REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const client = new DynamoDBClient({ region: REGION });

const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || 'arn:aws:sns:ap-south-1:171986746705:chat-message-topic';
const snsClient = new SNSClient({ region: REGION });

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  // password: process.env.REDIS_PASSWORD, // Uncomment if needed
});

const jwks = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${COGNITO_POOL_ID}/.well-known/jwks.json`
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, function(err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
}

exports.default = async (event) => {
  try {
    // 1. Authenticate user
    const authHeader = event.headers && (event.headers.Authorization || event.headers.authorization);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: 'Unauthorized: No token provided' };
    }
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try {
      decoded = await new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {}, (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        });
      });
    } catch (err) {
      return { statusCode: 401, body: 'Unauthorized: Invalid token' };
    }
    const senderId = decoded.sub || decoded.username || decoded.userId;
    if (!senderId) {
      return { statusCode: 401, body: 'Unauthorized: Invalid user' };
    }

    // 2. Parse message
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { conversationId, message } = body || {};
    if (!conversationId || !message) {
      return { statusCode: 400, body: 'Missing required fields' };
    }

    // 3. Store message in DynamoDB
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();
    const item = {
      conversationId: { S: conversationId },
      messageId: { S: messageId },
      senderId: { S: senderId },
      content: { S: message },
      timestamp: { S: timestamp },
      isRead: { BOOL: false },
    };
    await client.send(new PutItemCommand({ TableName: MESSAGE_TABLE, Item: item }));

    // 4. Publish message to Redis channel for pub/sub
    const redisPayload = JSON.stringify({
      conversationId,
      messageId,
      senderId,
      content: message,
      timestamp,
    });
    await redis.publish(`conversation:${conversationId}`, redisPayload);

    // 5. Publish message to SNS for fan-out (if you want to keep both)
    const snsPayload = {
      conversationId,
      messageId,
      senderId,
      content: message,
      timestamp,
    };
    await snsClient.send(new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Message: JSON.stringify(snsPayload),
    }));

    return { statusCode: 200, body: 'Message published to Redis and SNS for fan-out.' };
  } catch (error) {
    console.error('Error publishing message:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

