const db = require('../database');

const getProductsByCategory = (catid, callback) => {
    const query = 'SELECT * FROM products WHERE catid = ?';
    db.query(query, [catid], callback);
};

module.exports = { getProductsByCategory };
