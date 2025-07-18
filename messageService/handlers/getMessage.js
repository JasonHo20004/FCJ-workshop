const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
});

const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME;

exports.getMessage = async (event) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { messageId } = body || {};

        if (!messageId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        const params = {
            TableName: MESSAGE_TABLE_NAME,
            Key: {
                messageId: { S: messageId },
            },
        };

        const result = await client.send(new GetItemCommand(params));
        const message = result.Item ? {
            messageId: result.Item.messageId.S,
            senderId: result.Item.senderId.S,
            content: result.Item.content.S,
            timestamp: result.Item.timestamp.S,
            isRead: result.Item.isRead.BOOL,
        } : null;

        return {
            statusCode: 200,
            body: JSON.stringify({ message }),
        };
    } catch (error) {
        console.error('Error getting message:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};  