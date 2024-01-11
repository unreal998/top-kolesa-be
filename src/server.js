import express, { json, urlencoded } from 'express';
import cors from 'cors';
import http from 'http';
import { 
    getOrderContentData, 
    getOrderData,
    getShopData,
    getFilterData, 
    createOrder, 
    getItemData 
} from './sql.js'

const app = express();
app.use(cors());
app.use(json());
app.use(urlencoded());
app.set('trust proxy', true);

app.get('/', function(clientRequest, clientResponse) {
    clientResponse.send('helloWorld')
})

app.get('/shop', function(clientRequest, clientResponse) {
    const query = clientRequest.query;
    getShopData(query)
    .then(data => {
        clientResponse.send(data);
    }).catch(err => {
        clientResponse.send(err);
    });
})

app.get('/filterData', function(clientRequest, clientResponse) {
    getFilterData().then(data => {
        clientResponse.send(JSON.stringify(data))
    }).catch(err => {
        console.log(err);
        clientResponse.send(err);
    });

    }
)

app.get('/item', function(clientRequest, clientResponse) {
    getItemData().then( data => {
        clientResponse.send(data)
    }).catch(err => {
        clientResponse.send(err)
    })

})

app.post('/order', function(clientRequest, clientResponse) {
    const body = clientRequest.body;
    createOrder(body).then(data => {
        clientResponse.send({orderId: data})
    }).catch(err => {
        clientResponse.send(err)
    });
})

app.get('/orderData', async function(clientRequest, clientResponse) {
    const query = clientRequest.query;
    const orderDataResponce = await getOrderData(query.id, clientResponse).catch(err => {
        clientResponse.send(err)
    });
    const orderData = orderDataResponce[0];
    const orderContent = await getOrderContentData(query.id, clientResponse).catch(err => {
        clientResponse.send(err)
    });
    const {itemsList, totalAmount} = unifiyOrderItemsData(orderContent);
    const responceData = {
        orderId: orderData.id,
        userName: orderData.name,
        userEmail: orderData.email,
        orderComment: orderData.comment,
        deliveryAddress: orderData.address_city + ' ' + orderData.address,
        phoneNumber: orderData.phone,
        orderTime: orderData.created_at,
        itemsList,
        totalAmount
    }
    clientResponse.send(responceData);
})

function unifiyOrderItemsData(orderContent) {
    let totalAmount = 0;
    const itemsList = orderContent.map(item => {
        totalAmount += item.price_buy;
        return {
            price: item.price_buy,
            brand: item.brand,
            name: item.name,
            size: item.size,
            count: item.quantity
        }
    })
    return {itemsList, totalAmount}
}

const server = http.createServer(app);

export default server;