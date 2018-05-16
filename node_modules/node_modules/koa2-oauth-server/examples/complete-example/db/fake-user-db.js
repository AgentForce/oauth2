const MemoryStorage = require('simple-memory-storage');

const db = new MemoryStorage();

//pre-store an user for the example
db.set('waychan23', {
    'username': 'waychan23',
    'password': 'waychan23',
    'firstName': 'Way',
    'lastName': 'Chan',
    'hobbies': [ 'coding', 'reading' ]
});

/**
 * we don't use real database in this example
 */
module.exports = db;

