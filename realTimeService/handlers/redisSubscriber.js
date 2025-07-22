const Redis = require('ioredis');
const { DynamoDBClient, QueryCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { ApiGatewayManagementApi } = require('aws-sdk');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  // password: process.env.REDIS_PASSWORD, // Uncomment if needed
});
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });

redis.psubscribe('conversation:*', (err, count) => {
  if (err) console.error('Redis subscribe error:', err);
  else console.log('Subscribed to', count, 'channels');
});

redis.on('pmessage', async (pattern, channel, message) => {
  try {
    const { conversationId, messageId, senderId, content, timestamp } = JSON.parse(message);

    // 1. Get all userIds in the conversation
    const membersResult = await client.send(new QueryCommand({
      TableName: process.env.CONVERSATION_MEMBERS_TABLE,
      KeyConditionExpression: 'conversationId = :cid',
      ExpressionAttributeValues: { ':cid': { S: conversationId } }
    }));
    const userIds = membersResult.Items.map(item => item.userId.S);

    // 2. For each userId, get their connectionId(s)
    let connectionIds = [];
    for (const userId of userIds) {
      const connResult = await client.send(new QueryCommand({
        TableName: process.env.WEBSOCKET_TABLE_NAME,
        IndexName: 'userIdIndex',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': { S: userId } }
      }));
      connectionIds.push(...connResult.Items.map(item => item.connectionId.S));
    }

    // 3. Send message to these connectionIds
    const apigwManagementApi = new ApiGatewayManagementApi({
      endpoint: `https://${process.env.WEBSOCKET_DOMAIN}/${process.env.WEBSOCKET_STAGE}`,
    });
    const broadcastMessage = {
      type: 'message',
      data: { messageId, conversationId, senderId, content, timestamp },
    };
    await Promise.all(connectionIds.map(async (connectionId) => {
      try {
        await apigwManagementApi.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify(broadcastMessage),
        }).promise();
      } catch (error) {
        if (error.statusCode === 410) {
          await client.send(new DeleteItemCommand({
            TableName: process.env.WEBSOCKET_TABLE_NAME,
            Key: { connectionId: { S: connectionId } },
          }));
        }
      }
    }));
  } catch (err) {
    console.error('Error in Redis pub/sub handler:', err);
  }
}); 