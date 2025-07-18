const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
});

const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME;

exports.sendMessage = async (event) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { conversationId, senderId, message } = body || {};

        if (!conversationId || !senderId || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        const messageId = uuidv4();
        const timestamp = new Date().toISOString();

        const item = {
            conversationId,
            messageId,
            senderId,
            content: message,
            timestamp,
            isRead: false,
        };

        const params = {
            TableName: MESSAGE_TABLE_NAME,
            Item: item,
        };

        await client.send(new PutItemCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({ messageId }),
        };
    } catch (error) {
        console.error('Error sending message:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};


