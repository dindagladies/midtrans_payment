/** konfigurasi expressjs */
const express = require('express')
const app = express()
const port = 3000

/**setting expressjs untuk mangambil nilai pada request method postF */
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

/** konfigurasi library mysql */
const mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ilovesomeone',
    database: 'modul_midtrans',
});


/** contoh request type get */
app.get('/test_get', (req, res) => {
    let param1 = req.query.nama
    res.send('Welcome ' + param1)
})

/** contoh request type post */
app.post('/test_post', (req, res) => {
    let param1 = req.body.nama
    res.send('Method Post : Nama : ' + param1)
})

/** contoh menambah data ke database */
app.post('/transaction_add', function (req, res) {

    /** menambah data */
    const no_invoice = req.body.noinvoice
    const grandtotal = req.body.grandtotal
    const ssqlinsert = 'INSERT INTO `dbttrans` (`DocNumber`,`GrandTotal`,`TimeCreated`) VALUES ("' + no_invoice + '","' + grandtotal + '",NOW())'
    connection.query(ssqlinsert, function (error, results, fields) {
        try {
            if (error) throw error;
            res.send(results)
        } catch (err) {
            res.send(err)
        }
    });
})


/** port listen */
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})