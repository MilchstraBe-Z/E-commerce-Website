const mysql = require('mysql');

const db = mysql.createPool({
  host: 'localhost', 
  user: 'root',
  password: 'cNuE]WW>3Sd`A~hW', 
  database: 'shopping_site'
});

db.getConnection((err, connection) => {
  if (err) {
    console.log("Error connecting to database:", err);
  } else {
    console.log("Connected to the database!");
    connection.release(); 
  }
});


module.exports = db;
