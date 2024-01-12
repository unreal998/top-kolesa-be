import db from './database.js';

export async function getOrderData(orderId) {
    return new Promise( (resolve, reject) =>
        db.getConnection((err, connection) => {
            connection.queryData('SELECT * FROM `mod_orders` WHERE `id` = ' + orderId + ' ORDER BY `id`  DESC ', (err, result) => {
                if (err) {
                    connection.release();
                    reject(err)
                }
                connection.release();
                resolve(result);
            })
        })
    )
}

export async function getOrderContentData(orderId) {
    return new Promise( (resolve, reject) =>
        db.getConnection((err, connection) => {
            connection.queryData('SELECT * FROM `mod_orders_content` WHERE `order_id` = ' + orderId + ' ORDER BY `id`  DESC ', (err, result) => {
                if (err) {
                    connection.release();
                    reject(err)
                }
                connection.release();
                resolve(result)
            })  
        })
    )
}

export async function getFilterData() {
    return new Promise( (resolve, reject) => 
    db.getConnection((err, connection) => {
        connection.execute(`SELECT DISTINCT width FROM ${`mod_tires_sizes`}`, function (err, result) {
            if (err) {
                console.log('=====err===', err)
            }
            const widthArray = [];
            result.forEach(item => {
                widthArray.push(item.width)
            })
            const responseData = {
                tireSizes: {
                    width: '',
                    diametr: '',
                    height: '',
                    speed: '',
                    weight: '',
                    brands: ''
                }
            }
            responseData.tireSizes.width = widthArray;
            connection.execute(`SELECT DISTINCT diametr FROM ${`mod_tires_sizes`}`, function (err, result) {
                if (err) {
                    connection.release();
                    reject(err);
                }
                const diametrArray = []
                result.forEach(item => {
                    diametrArray.push(item.diametr)
                })
                responseData.tireSizes.diametr = diametrArray;
                connection.execute(`SELECT DISTINCT height FROM ${`mod_tires_sizes`}`, function (err, result) {
                    if (err) {
                        connection.release();
                        reject(err);
                    }
                    const heightArray = []
                    result.forEach(item => {
                        heightArray.push(item.height)
                    })
                    responseData.tireSizes.height = heightArray;
                    connection.execute(`SELECT DISTINCT speed FROM ${`mod_tires_sizes`}`, function (err, result) {
                        if (err) {
                            connection.release();
                            reject(err);
                        }
                        const speedArray = []
                        result.forEach(item => {
                            speedArray.push(item.speed)
                        })
                        responseData.tireSizes.speed = speedArray;
                        connection.execute(`SELECT DISTINCT weight FROM ${`mod_tires_sizes`}`, function (err, result) {
                            if (err) {
                                connection.release();
                                reject(err);
                            }
                            const weightArray = []
                            result.forEach(item => {
                                weightArray.push(item.weight)
                            })
                            responseData.tireSizes.weight = weightArray;
                            connection.execute(`SELECT DISTINCT name FROM ${`mod_tires_brands`}`, function (err, result) {
                                if (err) {
                                    connection.release();
                                    reject(err);
                                }
                                const brandsArray = []
                                result.forEach(item => {
                                    brandsArray.push(item.name)
                                })
                                responseData.tireSizes.brands = brandsArray;
                                connection.execute(`SELECT DISTINCT price_uah FROM ${`mod_tires_prices`}`, function (err, result) {
                                    if (err) {
                                        connection.release();
                                        reject(err);
                                    }
                                    const pricesArray = []
                                    result.forEach(item => {
                                        pricesArray.push(+item.price_uah)
                                    })
                                    responseData.tireSizes.prices = pricesArray;
                                    connection.release();
                                    resolve(responseData)
                                })
                            })
                        })
                    })
                })
            })
        })
        })
    )
}

export async function getShopData(queryParam) {
    return new Promise( (resolve, reject) => {
            const response = {
                tiresList: {},
            }
            let tiresQuery = '';
            tiresQuery = `SELECT *
            FROM ${`mod_tires`}, ${`mod_tires_prices`}
            WHERE mod_tires.id = mod_tires_prices.tire_id`;
            if (queryParam.price) {
                const minPrice = queryParam.price.split('-')[0];
                const maxPrice = queryParam.price.split('-')[1];
                tiresQuery += ` AND mod_tires_prices.price_uah > ${minPrice} AND mod_tires_prices.price_uah < ${maxPrice}`
            }
            if (queryParam.diametr && queryParam.diametr !== '""') {
                tiresQuery += ` AND mod_tires_prices.diametr = ${JSON.parse(queryParam.diametr)}`
            }
            if (queryParam.profile && queryParam.profile !== '""') {
                tiresQuery += ` AND mod_tires_prices.height = ${JSON.parse(queryParam.profile)}`
            }
            if (queryParam.width && queryParam.width !== '""') {
                tiresQuery += ` AND mod_tires_prices.width = ${JSON.parse(queryParam.width)}`
            }
            if (queryParam.season && JSON.parse(queryParam.season).length) {
                const seasons = JSON.parse(queryParam.season);
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
            if (queryParam.brand && JSON.parse(queryParam.brand).length) {
                let brandString = '';
                const brands = JSON.parse(queryParam.brand);
                brands.forEach((item, index) => {
                    if (index === brands.length - 1) {
                        brandString += `'${item}'`
                    } else {
                        brandString += `'${item}', `
                    }
                    
                });
                tiresQuery += ` AND mod_tires_prices.brand IN (${brandString})`;
            }
            db.getConnection((err, connection) => {
                connection.query(tiresQuery, function (err, result) {
                    if (err) {
                        connection.release();
                        reject(err);
                    }
                    response.tiresList = result;
                    connection.release();
                    resolve(JSON.stringify(response))
                })
            })

    })
}

export async function createOrder(orderData) {
    return new Promise( (resolve, reject) => {
        db.getConnection((err, connection) => {
            connection.query('SELECT id FROM `mod_orders_content`', function(err, result) {
                if (err) throw err;
                let id = result[result.length - 1].id;
                connection.query('SELECT id FROM `mod_orders`', function(err, result) {
                    if (err) throw err;
                    const orderId = result[result.length - 1].id + 1
                    addNewOrder(orderData, id, orderId)
                    .then( () => {
                        connection.release();
                        resolve(orderId)
                    }
                    ).catch(err => {
                        connection.release();
                        reject(err);
                    })
                })
            })
        }) 

    })
}

export async function getItemData() {
    return new Promise( (resolve, reject) => { 
        db.getConnection((err, connection) => {
            connection.execute(`SELECT *
            FROM ${`mod_tires`}, ${`mod_tires_prices`}
            WHERE mod_tires.id = mod_tires_prices.tire_id`, function (err, result) {
                if (err) {
                    connection.release();
                    reject(err);
                }
                connection.release();
                resolve(JSON.stringify(result))
            })
        })

    })
}

async function addNewOrder(orderItems, id, orderId) {
    const item = orderItems[0]; // first we create an order with single id
    return new Promise( (resolve, reject) => {
        db.getConnection((db) => {
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
                        db.release();
                        reject(err);
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
                            if (err) {
                                db.release();
                                reject(err);
                            }
                            db.release();
                            resolve();
                        })
                    })
            })
        })
    })
}