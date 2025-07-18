const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
});

const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME;

exports.editMessage = async (event) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;  
        const { messageId, content } = body || {};
        if (!messageId || !content) {
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
            UpdateExpression: 'SET content = :content',
            ExpressionAttributeValues: {
                ':content': { S: content },
            },
        };

        await client.send(new UpdateItemCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Message updated successfully' }),
        };
    } catch (error) {
        console.error('Error updating message:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};