const db = require('../database');

// Export function to fetch categories from the database
exports.getCategories = (req, res) => {
    db.query('SELECT * FROM categories', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.json(results); 
    });
};


