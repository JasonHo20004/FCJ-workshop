const { DynamoDBClient, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
});

const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME;

exports.deleteMessage = async (event) => {
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

        await client.send(new DeleteItemCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Message deleted successfully' }),
        };
    } catch (error) {
        console.error('Error deleting message:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};