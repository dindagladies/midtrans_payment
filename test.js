const midtransClient = require('midtrans-client');
const { customAlphabet } = require('nanoid')

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

const nanoid = customAlphabet('1234567890', 10)
const docnumber = `test-${nanoid()}`
const grandotal = 25300
console.log(docnumber);


// prepare Core API parameter ( refer to: https://api-docs.midtrans.com ) minimum parameter example:
let parameter = {
    "payment_type": "bank_transfer",
    "transaction_details": {
        "gross_amount": grandotal,
        "order_id": docnumber,
    },
    "bank_transfer": {
        "bank": "bni"
    }
};
coreApi.charge(parameter)
    .then((chargeResponse) => {
        console.log('chargeResponse:', JSON.stringify(chargeResponse));
        responseCoreApi(chargeResponse)
    })
    .catch((e) => {
        console.log('Error occured:', e.message);
    });

// result from request http coreapi midtrans
function responseCoreApi(statusResponse) {
    let orderId = statusResponse.order_id;
    let transactionStatus = statusResponse.transaction_status;
    let fraudStatus = statusResponse.fraud_status;

    console.log(`Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`);

    // Sample transactionStatus handling logic

    if (transactionStatus == 'capture') {
        // capture only applies to card transaction, which you need to check for the fraudStatus
        if (fraudStatus == 'challenge') {
            // TODO set transaction status on your databaase to 'challenge'
        } else if (fraudStatus == 'accept') {
            // TODO set transaction status on your databaase to 'success'
        }
    } else if (transactionStatus == 'settlement') {
        // TODO set transaction status on your databaase to 'success'
    } else if (transactionStatus == 'deny') {
        // TODO you can ignore 'deny', because most of the time it allows payment retries
        // and later can become success
    } else if (transactionStatus == 'cancel' ||
        transactionStatus == 'expire') {
        // TODO set transaction status on your databaase to 'failure'
    } else if (transactionStatus == 'pending') {
        // TODO set transaction status on your databaase to 'pending' / waiting payment
    }
}