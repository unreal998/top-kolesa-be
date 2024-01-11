import express, { json, urlencoded } from 'express';
import cors from 'cors';
import http from 'http';
import db from './database.js';

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
    const response = {
        tiresList: {},
    }
    let tiresQuery = ''
    if (!query.price) {
        tiresQuery = `SELECT *
        FROM ${`mod_tires`}, ${`mod_tires_prices`}
        WHERE mod_tires.id = mod_tires_prices.tire_id`
    } else {
        const seasons = JSON.parse(query.season);
        const minPrice = query.price.split('-')[0];
        const maxPrice = query.price.split('-')[1];
        tiresQuery = `SELECT *
        FROM ${`mod_tires`}, ${`mod_tires_prices`}
        WHERE mod_tires.id = mod_tires_prices.tire_id AND mod_tires_prices.price_uah > ${minPrice} AND mod_tires_prices.price_uah < ${maxPrice}`
        if (query.diametr !== '""') {
            tiresQuery += ` AND mod_tires_prices.diametr = ${query.diametr}`
        }
        if (query.profile !== '""') {
            tiresQuery += ` AND mod_tires_prices.height = ${query.profile}`
        }
        if (query.width !== '""') {
            tiresQuery += ` AND mod_tires_prices.width = ${query.width}`
        }
        if (seasons.winter || seasons.summer || seasons.allSeason) {
            if (seasons.winter) {
                tiresQuery += ` AND mod_tires.season = 'winter'`
            }
            if (seasons.summer) {
                tiresQuery += ` AND mod_tires.season = 'summer'`
            }
            if (seasons.allSeason) {
                tiresQuery += ` AND mod_tires.season = 'all-season'`
            }
        }
        if (query.brand.length > 2) {
            tiresQuery += ` AND mod_tires_prices.brand = ${query.brand}`
        }
    }
    db.query(tiresQuery, function (err, result) {
        if (err) throw err;
        response.tiresList = result;
        clientResponse.send(JSON.stringify(response))
    })

    console.log(tiresQuery)

})

app.get('/filterData', function(clientRequest, clientResponse) {
    const response = {
        tireSizes: {
            width: '',
            diametr: '',
            height: '',
            speed: '',
            weight: '',
            brands: ''
        }
    }
    db.execute(`SELECT DISTINCT width FROM ${`mod_tires_sizes`}`, function (err, result) {
        const widthArray = [];
        result.forEach(item => {
            widthArray.push(item.width)
        })
        response.tireSizes.width = widthArray;
            db.execute(`SELECT DISTINCT diametr FROM ${`mod_tires_sizes`}`, function (err, result) {
                const diametrArray = []
                result.forEach(item => {
                    diametrArray.push(item.diametr)
                })
                response.tireSizes.diametr = diametrArray;
                db.execute(`SELECT DISTINCT height FROM ${`mod_tires_sizes`}`, function (err, result) {
                    const heightArray = []
                    result.forEach(item => {
                        heightArray.push(item.height)
                    })
                    response.tireSizes.height = heightArray;
                    db.execute(`SELECT DISTINCT speed FROM ${`mod_tires_sizes`}`, function (err, result) {
                        const speedArray = []
                        result.forEach(item => {
                            speedArray.push(item.speed)
                        })
                        response.tireSizes.speed = speedArray;
                        db.execute(`SELECT DISTINCT weight FROM ${`mod_tires_sizes`}`, function (err, result) {
                            const weightArray = []
                            result.forEach(item => {
                                weightArray.push(item.weight)
                            })
                            response.tireSizes.weight = weightArray;
                            db.execute(`SELECT DISTINCT name FROM ${`mod_tires_brands`}`, function (err, result) {
                                const brandsArray = []
                                result.forEach(item => {
                                    brandsArray.push(item.name)
                                })
                                response.tireSizes.brands = brandsArray;
                                db.execute(`SELECT DISTINCT price_uah FROM ${`mod_tires_prices`}`, function (err, result) {
                                    const pricesArray = []
                                    result.forEach(item => {
                                        pricesArray.push(+item.price_uah)
                                    })
                                    response.tireSizes.prices = pricesArray;
                                    clientResponse.send(JSON.stringify(response))
                                })
                            })
                        })
                    })
                })
            })
        })
    }
)

app.get('/item', function(clientRequest, clientResponse) {
    db.execute(`SELECT *
        FROM ${`mod_tires`}, ${`mod_tires_prices`}
        WHERE mod_tires.id = mod_tires_prices.tire_id`, function (err, result) {
            if (err) throw err;
            clientResponse.send(JSON.stringify(result))
    })
})


app.post('/order', function(clientRequest, clientResponse) {
    const body = clientRequest.body;
    db.query('SELECT id FROM `mod_orders_content`', function(err, result) {
        if (err) throw err;
        let id = result[result.length - 1].id;
        db.query('SELECT id FROM `mod_orders`', function(err, result) {
            if (err) throw err;
            const orderId = result[result.length - 1].id + 1
            addNewOrder(body, id, orderId)
            .then( () => {
                clientResponse.send({orderId: orderId})
            }
            ).catch(err => {
                clientResponse.send(err);
            })
        })
    })
})

app.get('/orderData', async function(clientRequest, clientResponse) {
    const query = clientRequest.query;
    const orderDataResponce = await getOrderData(query.id, clientResponse);
    const orderData = orderDataResponce[0];
    const orderContent = await getOrderContentData(query.id, clientResponse);
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
    console.log(responceData);
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

async function getOrderData(orderId, clientResponse) {
    return new Promise( (resolve, reject) => db.query('SELECT * FROM `mod_orders` WHERE `id` = ' + orderId + ' ORDER BY `id`  DESC ', (err, result) => {
        if (err) {
            clientResponse.send(err)
            throw err;
        }
        resolve(result);
    }))
}

async function getOrderContentData(orderId, clientResponse) {
    return new Promise( (resolve, reject) => db.query('SELECT * FROM `mod_orders_content` WHERE `order_id` = ' + orderId + ' ORDER BY `id`  DESC ', (err, result) => {
        if (err) {
            clientResponse.send(err)
            throw err;
        }
        resolve(result)
    }))
}


async function addNewOrder(orderItems, id, orderId) {
    const item = orderItems[0]; // first we create an order with single id
    db.query(`INSERT INTO mod_orders VALUES(` +
                `${orderId}, ${item.userId}, ${item.statusId}, ${item.customerId},` +
                `${item.cityId}, ${item.paymentStatusId}, ${item.shipCompId}, ${item.paymentId},` +
                `${item.paymentCost}, ${item.paymentCostType}, ${item.shipmentId}, ${item.shipmentCost},` +
                `${item.shipmentCostType}, ${item.driverId}, ${item.driverCost}, ${item.driverCostType},` +
                `${item.otherCost}, '${item.otherCostName}', ${item.otherCostType}, ${item.sellSum}, ${item.profit},` +
                `'${item.nameFirm}', '${item.name}', '${item.phone}', '${item.phoneIndex}',` +
                `'${item.email}', '${item.addressCity}', '${item.address}', '${item.shipment}',` +
                `'${item.shipmentFrom}', '${item.shipmentUntil}', '${item.comment}', '${item.source}',` +
                `'${item.referer}', ${item.forPrint}, ${item.forExport}, ${item.checkNum},` +
                `'${item.checkDate}', '${item.checkPayer}', '${item.paymentType}', ${item.politicsCheckBox},` +
                `'${item.smsText}', '${item.smsSendAt}', '${item.createdAt}', '${item.updatedAt}'` +
                `)`, function(err, result) {
                    if (err) {
                        throw err;
                    }
                    // now we need to pass all the our cart items to the created order
                    orderItems.forEach((item) => {
                        id++
                        db.query(`INSERT INTO mod_orders_content VALUES(` +
                        `${id}, ${orderId}, ${item.brandId}, ${item.modelId}, ${item.sizeId},` +
                        `${item.locationId}, ${item.supplierId}, ${item.paymentId}, ${item.paymentCost},` +
                        `${item.paymentCostType}, '${item.paymentComment}', ${item.shipmentId}, ${item.shipmentCost},` +
                        `${item.shipmentCostType}, '${item.shipmentComment}', ${item.shipmentCompId},` +
                        `${item.otherCost}, '${item.otherCostName}', ${item.otherCostType}, ${item.discount}, ${item.profit},` +
                        `${item.prepay}, '${item.country}', ${item.year}, ${item.inWarehous},` +
                        `'${item.productType}', '${item.brand}', '${item.tireName}', '${item.size}',` +
                        `${item.quantity}, ${item.priceBuy}, ${item.priceSell}, '${item.createdAt}',` +
                        `'${item.updatedAt}')`, function(err, result) {
                            if (err) throw err;
                        })
                    })
            })
}

const server = http.createServer(app);

export default server;