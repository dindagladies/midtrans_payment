const express = require('express')
const cors = require('cors');
const fs = require('fs');

const router_system = require('./router_system.js')
const router_module = require('./router_module.js')
const config = require('./config.js')


// --------------------------------------------------------  konfigurasi library
const app = express()
const port = config.port

// library untuk handle cors policy connection
app.use(cors());

// library menghandle data pos menggunakan express.json
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

// library untuk mysql
var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit: 1000,
    host: config.mysql_host,
    user: config.mysql_username,
    password: config.mysql_password,
    database: config.mysql_database,
    port: config.mysql_port,
    multipleStatements: true,
    // queueLimit: 30,
    // acquireTimeout: 1000000
});

// rest api untuk list product
var myLogger = function (req, res, next) {
    router_module.LogTraffic(req)
    next()
}
app.use(myLogger)
// --------------------------------------------------------  kumpulan function untuk restapi

app.use(express.static('public'))
app.post('/api/:mode', router_system.sys_api)
app.post('/webhook_midtrans/:mode', router_system.webhook_midtrans)

// --------------------------------------------------------  kumpulan function untuk restapi [END]

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
exports.module_app = () => { return pool }
console.log(config);