
const configdata = {
    mysql_host: process.env.mysql_host || 'localhost',
    mysql_username: process.env.mysql_username || 'root',
    mysql_password: process.env.mysql_password || 'ilovesomeone',
    mysql_database: process.env.mysql_database || 'modul_midtrans',
    mysql_port: process.env.mysql_port || '3306',
    port: process.env.port || '3000',
}

module.exports = configdata
// exports.config = configdata;