const db = require('../database');

const getCategories = callback => {
    db.query('SELECT * FROM categories', callback);
};

module.exports = { getCategories };
