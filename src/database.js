import mysql from 'mysql2'

let db;
const dbConfig = {
  connectionLimit : 20,
  host: "topkolesa.com.ua",
  port: '3306',
  user: "u_topkolesa_vn",
  database: "shina5e",
  password: "m9gAkCp8Zog4"
};
db = mysql.createPool(dbConfig);
                                 // process asynchronous requests in the meantime.

export default db;