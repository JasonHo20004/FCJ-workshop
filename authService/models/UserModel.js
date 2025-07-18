const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const {v4: uuidv4} = require("uuid");

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;

const dynamodbClient = new DynamoDBClient({
    region: process.env.AWS_REGION
});

class UserModel {
    constructor(email, fullName) {
        this.userId = uuidv4();
        this.email = email;
        this.fullName = fullName;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    async save(){
        const params = {
            TableName: USERS_TABLE_NAME,
            Item:{
                userId: {S: this.userId},
                email: {S: this.email},
                fullName: {S: this.fullName},
                createdAt: {S: this.createdAt},
                updatedAt: {S: this.updatedAt},
            },
        };
    
        try{
            await dynamodbClient.send(new PutItemCommand(params));
            return this;
        } catch (error) {
            console.error("Error saving user:", error);
            throw error;
        }
    } 
    
}

module.exports = UserModel;