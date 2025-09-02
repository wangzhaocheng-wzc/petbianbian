// MongoDB initialization script
db = db.getSiblingDB('pet-health');

// Create collections with indexes
db.createCollection('users');
db.createCollection('pets');
db.createCollection('pooprecords');
db.createCollection('communityposts');
db.createCollection('comments');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.pets.createIndex({ "ownerId": 1 });
db.pooprecords.createIndex({ "petId": 1 });
db.pooprecords.createIndex({ "userId": 1 });
db.pooprecords.createIndex({ "timestamp": -1 });
db.communityposts.createIndex({ "userId": 1 });
db.communityposts.createIndex({ "createdAt": -1 });
db.communityposts.createIndex({ "category": 1 });
db.communityposts.createIndex({ "tags": 1 });
db.comments.createIndex({ "postId": 1 });
db.comments.createIndex({ "userId": 1 });

print('Database initialized successfully');