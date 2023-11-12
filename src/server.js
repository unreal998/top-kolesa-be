import express, { json, urlencoded } from 'express';
import cors from 'cors';
import http from 'http'
import mysql from 'mysql2'

const app = express();
app.use(cors());
app.use(json());
app.use(urlencoded());
app.set('trust proxy', true);

const db = mysql.createConnection({
    host: "topkolesa.com.ua",
    port: '3306',
    user: "u_topkolesa_vn",
    database: "shina5e",
    password: "m9gAkCp8Zog4"
});

db.connect(function(err){
    if (err) {
      return console.error("Ошибка: " + err.message);
    }
    else{
      console.log("Подключение к серверу MySQL успешно установлено");
    }
});

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
        db.query(`SELECT DISTINCT width FROM ${`mod_tires_sizes`}`, function (err, result) {
            const widthArray = []
            result.forEach(item => {
                widthArray.push(item.width)
            })
            response.tireSizes.width = widthArray;
            db.query(`SELECT DISTINCT diametr FROM ${`mod_tires_sizes`}`, function (err, result) {
                const diametrArray = []
                result.forEach(item => {
                    diametrArray.push(item.diametr)
                })
                response.tireSizes.diametr = diametrArray;
                db.query(`SELECT DISTINCT height FROM ${`mod_tires_sizes`}`, function (err, result) {
                    const heightArray = []
                    result.forEach(item => {
                        heightArray.push(item.height)
                    })
                    response.tireSizes.height = heightArray;
                    db.query(`SELECT DISTINCT speed FROM ${`mod_tires_sizes`}`, function (err, result) {
                        const speedArray = []
                        result.forEach(item => {
                            speedArray.push(item.speed)
                        })
                        response.tireSizes.speed = speedArray;
                        db.query(`SELECT DISTINCT weight FROM ${`mod_tires_sizes`}`, function (err, result) {
                            const weightArray = []
                            result.forEach(item => {
                                weightArray.push(item.weight)
                            })
                            response.tireSizes.weight = weightArray;
                            db.query(`SELECT DISTINCT name FROM ${`mod_tires_brands`}`, function (err, result) {
                                const brandsArray = []
                                result.forEach(item => {
                                    brandsArray.push(item.name)
                                })
                                response.tireSizes.brands = brandsArray;
                                db.query(`SELECT DISTINCT price_uah FROM ${`mod_tires_prices`}`, function (err, result) {
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
    })

app.get('/item', function(clientRequest, clientResponse) {
    const query = clientRequest.query;
    db.query(`SELECT *
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
        const id = result[result.length - 1].id + 1
        db.query('SELECT id FROM `mod_orders`', function(err, result) {
            if (err) throw err;
            const orderId = result[result.length - 1].id + 1
            db.query(`INSERT INTO mod_orders_content VALUES(` +
            `${id}, ${orderId}, ${body.brandId}, ${body.modelId}, ${body.sizeId},` +
            `${body.locationId}, ${body.supplierId}, ${body.paymentId}, ${body.paymentCost},` +
            `${body.paymentCostType}, '${body.paymentComment}', ${body.shipmentId}, ${body.shipmentCost},` +
            `${body.shipmentCostType}, '${body.shipmentComment}', ${body.shipmentCompId},` +
            `${body.otherCost}, '${body.otherCostName}', ${body.otherCostType}, ${body.discount}, ${body.profit},` +
            `${body.prepay}, '${body.country}', ${body.year}, ${body.inWarehous},` +
            `'${body.productType}', '${body.brand}', '${body.tireName}', '${body.size}',` +
            `${body.quantity}, ${body.priceBuy}, ${body.priceSell}, '${body.createdAt}',` +
            `'${body.updatedAt}')`, function(err, result) {
                if (err) throw err;
                db.query(`INSERT INTO mod_orders VALUES(` +
                    `${orderId}, ${body.userId}, ${body.statusId}, ${body.customerId},` +
                    `${body.cityId}, ${body.paymentStatusId}, ${body.shipCompId}, ${body.paymentId},` +
                    `${body.paymentCost}, ${body.paymentCostType}, ${body.shipmentId}, ${body.shipmentCost},` +
                    `${body.shipmentCostType}, ${body.driverId}, ${body.driverCost}, ${body.driverCostType},` +
                    `${body.otherCost}, '${body.otherCostName}', ${body.otherCostType}, ${body.sellSum}, ${body.profit},` +
                    `'${body.nameFirm}', '${body.name}', '${body.phone}', '${body.phoneIndex}',` +
                    `'${body.email}', '${body.addressCity}', '${body.address}', '${body.shipment}',` +
                    `'${body.shipmentFrom}', '${body.shipmentUntil}', '${body.comment}', '${body.source}',` +
                    `'${body.referer}', ${body.forPrint}, ${body.forExport}, ${body.checkNum},` +
                    `'${body.checkDate}', '${body.checkPayer}', '${body.paymentType}', ${body.politicsCheckBox},` +
                    `'${body.smsText}', '${body.smsSendAt}', '${body.createdAt}', '${body.updatedAt}'` +
                    `)`, function(err, result) {
                        if (err) clientResponse.send(err);
                        clientResponse.send({code: 200});
                })
            })
        })
    })
})


const server = http.createServer(app);

export default server;