const db = require('../database'); 

// Get products based on the category ID
exports.getProducts = (req, res) => {
    const { catid } = req.query;
    let query = 'SELECT * FROM products';

    if (catid) {
        query += ` WHERE catid = ?`;
    }

    db.query(query, [catid], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }
        res.json(results); 
    });
};

