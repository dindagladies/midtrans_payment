const midtransClient = require('midtrans-client');
const { customAlphabet } = require('nanoid')

const router_module = require('./router_module.js')


// Access Key Midtrans
const accesskeyMidtrans = {
    idmerchant: "G197524875",
    clientkey: "SB-Mid-client-95ucmCEb3jS_Axx5",
    serverkey: "SB-Mid-server-GDbZsAXheisrpmzv6w-T9K5g"
}
// Create Core API instance
let coreApi = new midtransClient.CoreApi({
    isProduction: false,
    serverKey: accesskeyMidtrans.serverkey,
    clientKey: accesskeyMidtrans.clientkey
});


exports.sys_api = async (req, res) => {
    try {
        switch (req.params.mode) {
            case 'method_payment': {
                const dataPaymentResolve = await router_module.OpenQueryV1(`SELECT ID,CodePayment,NamePayment,TypePayment FROM paymentmethod_midtrans WHERE isActive="0"`)
                if (dataPaymentResolve.dataset.length > 0) {
                    res.send({ status: 'true', data: dataPaymentResolve.dataset })
                } else {
                    res.send({ status: 'false', message: 'Tidak ada data metode pembayaran' })
                }
            } break;
            case 'create_billing': {
                const { kindpayemnt, grandtotal } = req.body
                // Generate No. Invoice
                const nanoid = customAlphabet('1234567890', 10)
                const docnumber = `test-${nanoid()}`
                console.log('No. Billing : ' + docnumber)

                // Insert Data Billing To Database 
                const ssqlinsertBilling = `INSERT INTO billing_midtrans (DocNumber,GrandTotal,StatusPayment,TimeCreated,TimeUpdated) VALUES ("${docnumber}","${grandtotal}","none",NOW(),NOW());`
                const dataResolve = await router_module.ExecQueryV1(ssqlinsertBilling)
                // Paramenter For Payment Midtrans
                let parameter = {
                    "payment_type": "bank_transfer",
                    "transaction_details": {
                        "gross_amount": grandtotal,
                        "order_id": docnumber,
                    },
                    "bank_transfer": {
                        "bank": kindpayemnt
                    }
                };

                // Cretae Billing On Midtrans
                console.log('run core api');
                coreApi.charge(parameter)
                    .then((chargeResponse) => {
                        console.log('chargeResponse:', JSON.stringify(chargeResponse));
                        responseCoreApi(chargeResponse)
                    })
                    .catch((e) => {
                        console.log('Error occured:', e.message);
                        res.send({ status: 'false', message: e.message })
                    });

                // function 
                async function responseCoreApi(statusResponse) {
                    let orderId = statusResponse.order_id;
                    let transactionStatus = statusResponse.transaction_status;
                    let fraudStatus = statusResponse.fraud_status;

                    console.log(`Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`);

                    // Sample transactionStatus handling logic
                    let ssqlUpdateBilling = ''
                    if (transactionStatus == 'capture') {
                        // capture only applies to card transaction, which you need to check for the fraudStatus
                        if (fraudStatus == 'challenge') {
                            // TODO set transaction status on your databaase to 'challenge'
                            ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="challenge" WHERE DocNumber="${docnumber}"`
                        } else if (fraudStatus == 'accept') {
                            // TODO set transaction status on your databaase to 'success'
                            ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="success" WHERE DocNumber="${docnumber}"`
                        }
                    } else if (transactionStatus == 'settlement') {
                        // TODO set transaction status on your databaase to 'success'
                        ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                    } else if (transactionStatus == 'deny') {
                        // TODO you can ignore 'deny', because most of the time it allows payment retries
                        // and later can become success
                        ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                    } else if (transactionStatus == 'cancel' ||
                        transactionStatus == 'expire') {
                        // TODO set transaction status on your databaase to 'failure'
                        ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                    } else if (transactionStatus == 'pending') {
                        // TODO set transaction status on your databaase to 'pending' / waiting payment
                        ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                    }
                    if (ssqlUpdateBilling != '') {
                        const dataUpdateBillingResolve = await router_module.ExecQueryV1(ssqlUpdateBilling)
                    }

                    res.send({ status: 'true', message: 'Billing Created', orderId: orderId, transactionStatus: transactionStatus, fraudStatus: fraudStatus })
                }
            } break;
            case 'status_billing': {
                const { docnumber } = req.body
                coreApi.transaction.status(docnumber)
                    .then((statusResponse) => {
                        console.log(statusResponse);
                        let orderId = statusResponse.order_id;
                        let transactionStatus = statusResponse.transaction_status;
                        let fraudStatus = statusResponse.fraud_status;
                        let message = statusResponse.status_message;

                        let paymentInfo = ''
                        if (statusResponse.payment_type == 'bank_transfer') {
                            if (statusResponse.va_numbers.length > 0) {
                                paymentInfo = {
                                    payment_type: 'bank transfer',
                                    bank: statusResponse.va_numbers[0].bank,
                                    va_number: statusResponse.va_numbers[0].va_number,
                                }
                            }
                        }
                        res.send({ status: 'true', message: message, orderId: orderId, transactionStatus: transactionStatus, fraudStatus: fraudStatus, paymentInfo: paymentInfo })
                    }).catch((e) => {
                        console.log('Error occured:', e.message);
                        res.send({ status: 'false', message: e.message })
                    });

            } break;
            case 'cancel_billing': {
                const { docnumber } = req.body
                coreApi.transaction.cancel(docnumber)
                    .then((response) => {
                        console.log(response);
                        res.send({ status: 'true', message: response.status_message })
                    }).catch((e) => {
                        console.log('Error occured:', e.message);
                        res.send({ status: 'false', message: e.message })
                    });;
            } break;
        }
    } catch (error) {
        console.log(error)
        res.send({ status: 'false', message: error })
    }
}

exports.webhook_midtrans = async (req, res) => {
    try {
        switch (req.params.mode) {
            case 'notification_handing': {
                const statusResponse = req.body
                console.log(statusResponse);
                const ssql = `INSERT INTO notification_midtrans(DocNumber,Notes,TimeCreated) VALUES ("","",NOW());`
                const dataNotificationResolve = await router_module.ExecQueryV1(ssql)

                res.send({ status: 'true', message: 'Notification Confirmed' })
            } break;
            case 'finish': {
                const statusResponse = req.body
                let orderId = statusResponse.order_id;
                let transactionStatus = statusResponse.transaction_status;
                let fraudStatus = statusResponse.fraud_status;

                const docnumber = orderId

                console.log(`Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`);

                // Sample transactionStatus handling logic
                let ssqlUpdateBilling = ''
                if (transactionStatus == 'capture') {
                    // capture only applies to card transaction, which you need to check for the fraudStatus
                    if (fraudStatus == 'challenge') {
                        // TODO set transaction status on your databaase to 'challenge'
                        ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="challenge" WHERE DocNumber="${docnumber}"`
                    } else if (fraudStatus == 'accept') {
                        // TODO set transaction status on your databaase to 'success'
                        ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="success" WHERE DocNumber="${docnumber}"`
                    }
                } else if (transactionStatus == 'settlement') {
                    // TODO set transaction status on your databaase to 'success'
                    ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                } else if (transactionStatus == 'deny') {
                    // TODO you can ignore 'deny', because most of the time it allows payment retries
                    // and later can become success
                    ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                } else if (transactionStatus == 'cancel' ||
                    transactionStatus == 'expire') {
                    // TODO set transaction status on your databaase to 'failure'
                    ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                } else if (transactionStatus == 'pending') {
                    // TODO set transaction status on your databaase to 'pending' / waiting payment
                    ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                }
                if (ssqlUpdateBilling != '') {
                    const dataUpdateBillingResolve = await router_module.ExecQueryV1(ssqlUpdateBilling)
                }

                res.send({ status: 'true', message: 'Billing Confirmed', orderId: orderId, transactionStatus: transactionStatus, fraudStatus: fraudStatus })
            } break;
            case 'unfinish': {
                const statusResponse = req.body
                let orderId = statusResponse.order_id;
                let transactionStatus = statusResponse.transaction_status;
                let fraudStatus = statusResponse.fraud_status;

                const docnumber = orderId

                console.log(`Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`);

                // Sample transactionStatus handling logic
                let ssqlUpdateBilling = ''
                if (transactionStatus == 'capture') {
                    // capture only applies to card transaction, which you need to check for the fraudStatus
                    if (fraudStatus == 'challenge') {
                        // TODO set transaction status on your databaase to 'challenge'
                        ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="challenge" WHERE DocNumber="${docnumber}"`
                    } else if (fraudStatus == 'accept') {
                        // TODO set transaction status on your databaase to 'success'
                        ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="success" WHERE DocNumber="${docnumber}"`
                    }
                } else if (transactionStatus == 'settlement') {
                    // TODO set transaction status on your databaase to 'success'
                    ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                } else if (transactionStatus == 'deny') {
                    // TODO you can ignore 'deny', because most of the time it allows payment retries
                    // and later can become success
                    ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                } else if (transactionStatus == 'cancel' ||
                    transactionStatus == 'expire') {
                    // TODO set transaction status on your databaase to 'failure'
                    ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                } else if (transactionStatus == 'pending') {
                    // TODO set transaction status on your databaase to 'pending' / waiting payment
                    ssqlUpdateBilling = `UPDATE billing_midtrans SET StatusPayment="${transactionStatus}" WHERE DocNumber="${docnumber}"`
                }
                if (ssqlUpdateBilling != '') {
                    const dataUpdateBillingResolve = await router_module.ExecQueryV1(ssqlUpdateBilling)
                }

                res.send({ status: 'true', message: 'Billing Confirmed', orderId: orderId, transactionStatus: transactionStatus, fraudStatus: fraudStatus })
            } break;
        }
    } catch (error) {
        console.log(error)
        res.send({ status: 'false', message: error })
    }
}