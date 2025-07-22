const { DynamoDBClient, QueryCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { ApiGatewayManagementApi } = require('aws-sdk');

const CONNECTIONS_TABLE = process.env.WEBSOCKET_TABLE_NAME;
const MEMBERS_TABLE = process.env.CONVERSATION_MEMBERS_TABLE || 'conversation-members-table';
const REGION = process.env.AWS_REGION || 'ap-south-1';
const client = new DynamoDBClient({ region: REGION });

exports.handler = async (event) => {
  try {
    // SNS event can have multiple records
    for (const record of event.Records) {
      const message = JSON.parse(record.Sns.Message);
      const { conversationId, messageId, senderId, content, timestamp } = message;

      // 1. Get all userIds in the conversation
      const membersResult = await client.send(new QueryCommand({
        TableName: MEMBERS_TABLE,
        KeyConditionExpression: 'conversationId = :cid',
        ExpressionAttributeValues: { ':cid': { S: conversationId } }
      }));
      const userIds = membersResult.Items.map(item => item.userId.S);

      // 2. For each userId, get their connectionId(s)
      let connectionIds = [];
      for (const userId of userIds) {
        const connResult = await client.send(new QueryCommand({
          TableName: CONNECTIONS_TABLE,
          IndexName: 'userIdIndex',
          KeyConditionExpression: 'userId = :uid',
          ExpressionAttributeValues: { ':uid': { S: userId } }
        }));
        connectionIds.push(...connResult.Items.map(item => item.connectionId.S));
      }

      // 3. Send message only to these connectionIds
      // Use the domain and stage from the message or set as env/config
      // For demo, you may need to hardcode or pass via env
      const domain = process.env.WEBSOCKET_DOMAIN;
      const stage = process.env.WEBSOCKET_STAGE;
      if (!domain || !stage) {
        console.error('WEBSOCKET_DOMAIN or WEBSOCKET_STAGE not set');
        continue;
      }
      const apigwManagementApi = new ApiGatewayManagementApi({
        endpoint: `https://${domain}/${stage}`,
      });
      const broadcastMessage = {
        type: 'message',
        data: {
          messageId,
          conversationId,
          senderId,
          content,
          timestamp,
        },
      };
      await Promise.all(connectionIds.map(async (connectionId) => {
        try {
          await apigwManagementApi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify(broadcastMessage),
          }).promise();
        } catch (error) {
          if (error.statusCode === 410) {
            // Stale connection, remove
            await client.send(new DeleteItemCommand({
              TableName: CONNECTIONS_TABLE,
              Key: { connectionId: { S: connectionId } },
            }));
          }
        }
      }));
    }
    return { statusCode: 200, body: 'SNS fan-out complete.' };
  } catch (error) {
    console.error('Error in SNS fan-out handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 