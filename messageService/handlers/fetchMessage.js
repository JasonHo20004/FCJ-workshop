const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
});

const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME;

exports.fetchMessage = async (event) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { conversationId } = body || {};

        if (!conversationId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        const params = {
            TableName: MESSAGE_TABLE_NAME,
            KeyConditionExpression: 'conversationId = :conversationId',
            ExpressionAttributeValues: {
                ':conversationId': conversationId,
            },
            ScanIndexForward: false,
        };

        const result = await client.send(new QueryCommand(params));
        const messages = result.Items.map(item => ({
            messageId: item.messageId.S,
            senderId: item.senderId.S,
            content: item.content.S,
            timestamp: item.timestamp.S,
            isRead: item.isRead.BOOL,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ messages }),
        };
    } catch (error) {
        console.error('Error fetching messages:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};