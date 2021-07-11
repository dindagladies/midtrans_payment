const app = require('./app.js');
const router_module = require('./router_module.js');
const fs = require('fs');

exports.OpenQueryV1 = (ssql) => {
    return new Promise((resolve, reject) => {
        let pool = app.module_app();
        pool.getConnection(function (err, connection) {
            if (err) throw err;
            connection.query(ssql, function (error, results, fields) {
                connection.release();
                if (error) throw error;
                let sdatareturn = {
                    error: error,
                    dataset: results,
                    fields: fields,
                }
                resolve(sdatareturn)
                // connection.destroy()
            });
        });
    });
}

exports.ExecQueryV1 = (ssql) => {
    return new Promise((resolve, reject) => {
        let pool = app.module_app();
        pool.getConnection(function (err, connection) {
            if (err) throw err;
            connection.query(ssql, function (err, result) {
                connection.release();
                try {
                    if (err) throw err;
                    let sdatareturn = {
                        error: err,
                        dataset: result,
                    }
                    resolve(sdatareturn)
                } catch (error) {
                    console.log(error)
                    reject(error.sqlMessage)
                }
                // connection.destroy()
            });
        });
    });
}

exports.LogTraffic = (req) => {
    // log traffic 
    let datesesi = new Date();
    if (JSON.stringify(req.query) != "{}") console.log('log ----> host : ' + req.headers.host + req.originalUrl + ' ip :' + req.connection.remoteAddress.split(`:`).pop() + ' / time :' + datesesi + ' / url : ' + req.url + ' / get : ' + JSON.stringify(req.query) + " / post : " + JSON.stringify(req.body));
    else if (JSON.stringify(req.body) != "{}") console.log('log ----> host : ' + req.headers.host + req.originalUrl + ' ip :' + req.connection.remoteAddress.split(`:`).pop() + ' / time :' + datesesi + ' / url : ' + req.url + ' / get : ' + JSON.stringify(req.query) + " / post : " + JSON.stringify(req.body));
}

exports.GetSQLQueryData = async (NameQuery, resolve) => {
    try {
        let ssql = ''
        if (NameQuery == "QGenerateDocNumber") {
            ssql = `
            SET @doctype='?doctype'; #0
            SET @mydate=(SELECT DATE_FORMAT(NOW(),'%Y-%m-%d')); #1
            
            #check dbsrecno
            SET @recno = (SELECT DocNo FROM dbsrecno WHERE DocType=@doctype AND yy=DATE_FORMAT(@mydate,'%Y') AND mm=DATE_FORMAT(@mydate,'%m')); #2
            
            INSERT INTO dbsrecno (DocType,yy,mm,DocNo) 
            SELECT a.* FROM (SELECT @doctype,DATE_FORMAT(@mydate,'%Y'),DATE_FORMAT(@mydate,'%m'),0) a WHERE @recno IS NULL; #3
            #update & generate docnumber
            UPDATE dbsrecno SET DocNo=DocNo+1 WHERE DocType=@doctype AND yy=DATE_FORMAT(@mydate,'%Y') AND mm=DATE_FORMAT(@mydate,'%m'); #4
            SET @recno = (SELECT DocNo FROM dbsrecno WHERE DocType=@doctype AND yy=DATE_FORMAT(@mydate,'%Y') AND mm=DATE_FORMAT(@mydate,'%m')); #5
            
            SET @docnumber =(SELECT CASE WHEN (LENGTH(@recno))="1" THEN CONCAT(@doctype,"-",DATE_FORMAT(@mydate,'%Y%m%d'),"00",@recno) 
            WHEN (LENGTH(@recno))="2" THEN CONCAT(@doctype,"-",DATE_FORMAT(@mydate,'%Y%m%d'),"0",@recno)
            WHEN (LENGTH(@recno))="3" THEN CONCAT(@doctype,"-",DATE_FORMAT(@mydate,'%Y%m%d'),"",@recno)
            END AS docnumber); #6
		   
            SELECT @docnumber AS DocNumber; #7`
            // result = dataset[6].DocNumber 
        }
        // console.log(ssql);
        resolve(ssql)
    } catch (error) {
        console.log(error);
    }
}

exports.GenerateDocNumber = (doctype) => {
    return new Promise(async (resolve, reject) => {
        let ssqlforgeneratedocnumber = await new Promise((resolve) => { router_module.GetSQLQueryData('QGenerateDocNumber', resolve) })
        ssqlforgeneratedocnumber = ssqlforgeneratedocnumber.replace("?doctype", doctype)
        let data_Resolve = await router_module.OpenQueryV1(ssqlforgeneratedocnumber);
        resolve(data_Resolve.dataset[7][0].DocNumber)
    })
}

exports.GetSizeFile = (filename) => {
    var stats = fs.statSync(filename);
    var fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

// #########  function with library external
exports.FirebaseCloudMessage = (mode, data) => {
    console.log('FirebaseCloudMessage');
    // send message using firebase admin sdk
    if (mode == "broadcast") {
        // send all device subscribe topic
        let firebaseadmin = app.module_firebase()
        let stopic = data.topic
        let stitle = data.title
        let smessage = data.message

        const messages = [];
        messages.push({
            notification: { title: stitle, body: smessage },
            topic: stopic,
        });

        firebaseadmin.messaging().sendAll(messages)
            .then((response) => {
                console.log(response.successCount + ' messages were sent successfully');
            })
            .catch((error) => {
                console.log('Error sending message:', error);
            });;
    } else if (mode == "sendmessage") {
        // send message single device
        let firebaseadmin = app.module_firebase()
        let stitle = data.title
        let smessage = data.message
        let registrationToken = data.token

        let message = {
            notification: {
                title: stitle,
                body: smessage,
            },
            token: registrationToken
        };

        firebaseadmin.messaging().send(message)
            .then((response) => {
                // Response is a message ID string.
                console.log('Successfully sent message:', response);
            })
            .catch((error) => {
                console.log('Error sending message:', error);
            });
    }
}
exports.RajaOngkir = async (req, res) => {
    const fetch = require("node-fetch")
    const { URLSearchParams } = require("url")
    const api = `4924bc93cc8ebeea43980df0609f1ff5`

    console.log('access raja ongkir')
    if (req.params.nameprocedure == 'province') {
        fetch("https://pro.rajaongkir.com/api/province?key=" + api)
            .then((res) => res.json())
            .then((json) => {
                res.send(json)
            });
    } else if (req.params.nameprocedure == 'city') {
        let id = req.query.id;
        fetch("https://pro.rajaongkir.com/api/city?key=" + api + "&province=" + id)
            .then((res) => res.json())
            .then((json) => {
                res.send(json)
            });
    } else if (req.params.nameprocedure == 'subdistrict') {
        let id = req.query.id;
        fetch("https://pro.rajaongkir.com/api/subdistrict?key=" + api + "&city=" + id)
            .then((res) => res.json())
            .then((json) => {
                res.send(json)
            });
    } else if (req.params.nameprocedure == 'cost') {
        const params = new URLSearchParams();
        params.append("key", api);
        params.append("originType", "city");
        params.append("destinationType", "city");
        params.append("origin", parseInt(req.body.origin));
        params.append("destination", parseInt(req.body.destination));
        params.append("weight", '1000'); // satuan gram
        params.append("courier", "jne");

        console.log(params);
        fetch("https://pro.rajaongkir.com/api/cost", {
            method: "POST",
            headers: {
                'key': api,
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: params
        })
            .then((res) => res.json())
            .then((json) => {
                res.send(json)
            }).catch((err) => {
                console.log(err);
                res.send(err)
            });
    } else if (req.params.nameprocedure == 'track') {
        const params = new URLSearchParams();
        params.append("key", api);
        params.append("waybill", 'JT8239344929');
        params.append("courier", 'jnt');

        fetch("https://pro.rajaongkir.com/api/waybill", { method: "POST", body: params })
            .then((res) => res.json())
            .then((json) => {
                res.send(json)
            })
    } else if (req.params.nameprocedure == 'cekstatus') {
        const params = new URLSearchParams();
        params.append("key", api);
        params.append("waybill", req.body.resi);
        params.append("courier", req.body.kurir);

        fetch("https://pro.rajaongkir.com/api/waybill", { method: "POST", body: params })
            .then((res) => res.json())
            .then((json) => {
                let hasil = json.rajaongkir.result.delivered
                res.send(hasil)
            })
    } else res.send('not found')
}