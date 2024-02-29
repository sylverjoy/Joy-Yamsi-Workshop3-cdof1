const express = require('express');
const fs = require('fs');
const cors = require('cors')
const mongoose = require('mongoose');

const app = express(); 
const port = 3000;

let products = [];
let orders = [];
let carts = {};

// Creating a ledger that will contain all operations to synchronise
let ledger = []

app.use(express.json());
app.use(cors());

// Middleware to save data after each request
app.use((req, res, next) => {
    saveData();
    next();
});

// Middleware to periodically replicate data to secondary storage 
setInterval(() => {
    replicateData();
}, 300000); 

// MongoDB connection URL
const mongoURI = 'mongodb://localhost:27017/ecommerce';

// MongoDB models
const Product = mongoose.model('Product', new mongoose.Schema({
    id: Number,
    name: String,
    price: Number,
    category: String,
    inStock: Boolean
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: Number,
    userId: Number,
    products: [{
        productId: Number,
        quantity: Number
    }],
    status: String
}));

const Cart = mongoose.model('Cart', new mongoose.Schema({
    userId: Number,
    products: [{
        productId: Number,
        quantity: Number
    }]
}));

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

// Load data from JSON files or mirror (MongoDb) if JSON file not available
async function loadData() {
    try {
        if (fs.existsSync('products.json')) {
            products = JSON.parse(fs.readFileSync('products.json', 'utf8'));
        } else {
            try {
                products =  await Product.find();
            } catch (err) {
                console.error('Error loading products data:', err);
                products = [];
            }
        } 
    } catch (err) {
        console.error('Error loading products data:', err);
        products = [];
    }

    try {
        if (fs.existsSync('orders.json')) {
            orders = JSON.parse(fs.readFileSync('orders.json', 'utf8'));
        } else {
            try {
                orders =  await Order.find();
            } catch (err) {
                console.error('Error loading orders data:', err);
                orders = [];
            }
        }
    } catch (err) {
        console.error('Error loading orders data:', err);
        orders = [];
    }

    try {
        if (fs.existsSync('carts.json')) {
            carts = JSON.parse(fs.readFileSync('carts.json', 'utf8'));
        } else {
            try {
                const cart_objs =  await Cart.find();
                for (obj of cart_objs) {
                    if (!carts[obj.userId]) {
                        carts[obj.userId] = {};
                    }
                    for (prod of obj.products) {
                        if (!carts[obj.userId][prod.productId]) {
                            carts[obj.userId][prod.productId] = prod.quantity;
                        } else {
                            carts[obj.userId][prod.productId] += prod.quantity;
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading carts data:', err);
                carts = [];
            }
        }
    } catch (err) {
        console.error('Error loading carts data:', err);
        carts = {};
    }
}

// Save data to JSON files
function saveData() {
    fs.writeFileSync('products.json', JSON.stringify(products, null, 2), 'utf8');
    fs.writeFileSync('orders.json', JSON.stringify(orders, null, 2), 'utf8');
    fs.writeFileSync('carts.json', JSON.stringify(carts, null, 2), 'utf8');
}

// Replicate data to secondary storage using ledger 
async function replicateData() { 

    for (obj of ledger) {
        switch (obj['operation']) {
            case 'create': 
                if (obj['model'] == "product") { 
                    try {
                        await Product.create(obj['object']);
                        delete ledger[ledger.indexOf(obj)];
                    } catch (err) {
                        console.log('Error saving product to secondary DB: ', err);
                    }
                } else if (obj['model'] == "order") {
                    try {
                        await Order.create(obj['object']);
                        delete ledger[ledger.indexOf(obj)];
                    } catch (err) {
                        console.log('Error saving order to secondary DB: ', err);
                    }
                } else if (obj['model'] == "cart") {
                    try {
                        await Cart.create(obj['object']);
                        delete ledger[ledger.indexOf(obj)];
                    } catch (err) {
                        console.log('Error saving cart to secondary DB: ', err);
                    }
                }
                break;
            case 'update':
                if (obj['model'] == "product") { 
                    const prod = await Product.find({id: obj['object_id']});
                    try {
                        await Product.findByIdAndUpdate(prod._id, obj['object'], { new: true });
                        delete ledger[ledger.indexOf(obj)];
                    } catch (err) {
                        console.log("Error saving product to secondary DB: ", err);
                    }

                } else if (obj['model'] == "cart") {
                    if (!obj['product_id']) {
                        // updating cart
                        try {
                            await Cart.findOneAndUpdate(
                                { userId: obj['user_id'] },
                                { $addToSet: { products: obj['object'] }},
                                { upsert: true, new: true }
                            );
                            delete ledger[ledger.indexOf(obj)];
                        } catch (err) {
                            console.log("Error saving cart to secondary DB: ", err);
                        }
                    } else {
                        // deleting product from cart
                        try {
                            await Cart.findOneAndUpdate(
                                { userId: obj['user_id'] },
                                { $pull: { products: { productId: obj['product_id'] } } },
                                { new: true }
                            );
                            delete ledger[ledger.indexOf(obj)];
                        } catch (err) {
                            console.log("Error saving cart to secondary DB: ", err);
                        }
                    }

                } 
                break;
            case 'delete':
                if (obj['model'] == "product") { 
                    const prod = await Product.find({id: obj['object_id']});
                    try {
                        await Product.findByIdAndDelete(prod._id);
                        delete ledger[ledger.indexOf(obj)];
                    } catch (err) {
                        console.log("Error deleting from secondary DB: ", err);
                    }
                }
                break;
            default : console.log('Unknown Operation: ', obj['operation']);
        }
    }
}

// Load initial data
loadData();

// We save each post, put and delete operation to the ledger for replication

// GET /products
app.get('/products', (req, res) => {
    let filteredProducts = products;
    if (req.query.category) {
        filteredProducts = filteredProducts.filter(product => product.category === req.query.category);
    }
    if (req.query.inStock) {
        const inStock = req.query.inStock === 'true';
        filteredProducts = filteredProducts.filter(product => product.inStock === inStock);
    }
    res.json(filteredProducts);
});

// GET /products/:id
app.get('/products/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const product = products.find(product => product.id === productId);
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
});

// POST /products
app.post('/products', (req, res) => {
    const newProduct = req.body;
    let ledgerObject = {};
    if (products.length > 0) {
        newProduct.id = products[products.length - 1].id + 1;
    } else {
        newProduct.id = 1;
    }

    ledgerObject['operation'] = "create";
    ledgerObject['model'] = 'product';
    ledgerObject['object'] = newProduct

    products.push(newProduct);
    ledger.push(ledgerObject);
    res.status(201).json(newProduct);
});

// PUT /products/:id
app.put('/products/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const updatedProduct = req.body;
    let ledgerObject = {};
    const index = products.findIndex(product => product.id === productId);
    if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }

    ledgerObject['operation'] = "update";
    ledgerObject['model'] = 'product';
    ledgerObject['object_id'] = productId;
    ledgerObject['object'] = updatedProduct

    products[index] = { ...products[index], ...updatedProduct };
    ledger.push(ledgerObject);
    res.json(products[index]);
});

// DELETE /products/:id
app.delete('/products/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    let ledgerObject = {};
    const index = products.findIndex(product => product.id === productId);
    if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }

    ledgerObject['operation'] = "delete";
    ledgerObject['model'] = 'product';
    ledgerObject['object_id'] = productId;

    products.splice(index, 1);
    ledger.push(ledgerObject);
    res.json({ message: 'Product deleted successfully' });
});


// Orders Routes

app.post('/orders', (req, res) => {
    const newOrder = req.body;
    let ledgerObject = {};
    if (!newOrder.userId) {
        newOrder.userId = 1;
    }
    if (orders.length > 0) {
        newOrder.id = orders[orders.length - 1].id + 1;
    } else {
        newOrder.id = 1;
    }
    newOrder.status = "Completed"

    ledgerObject['operation'] = "create";
    ledgerObject['model'] = 'order';
    ledgerObject['object'] = newOrder;

    orders.push(newOrder);
    ledger.push(ledgerObject);
    res.status(201).json(newOrder);
});

app.get('/orders/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userOrders = orders.filter(order => order.userId === userId);
    
    for (ord of userOrders) {
        let totalPrice = 0;
        for (prod of ord.products) {
            const product = products.find(product => product.id === parseInt(prod.productId))
            totalPrice += prod.quantity * product.price;
        }
        ord.totalPrice = totalPrice;
    }
    res.json(userOrders);
});

// Cart Routes

app.post('/cart/:userId', (req, res) => {
    const userId = req.params.userId;
    const { productId, quantity } = req.body;
    let ledgerObject = {};

    ledgerObject['operation'] = "update";
    if (!carts[userId]) {
        carts[userId] = {};
        ledgerObject['operation'] = "create";
    }
    if (!carts[userId][productId]) {
        carts[userId][productId] = quantity;
    } else {
        carts[userId][productId] += quantity;
    }

    
    ledgerObject['model'] = 'cart';
    ledgerObject['object'] = { productId, quantity };
    ledgerObject['user_id'] = userId;

    ledger.push(ledgerObject);
    res.json(carts[userId]);
});

app.get('/cart/:userId', (req, res) => {
    const userId = req.params.userId;
    if (!carts[userId]) {
        return res.json({ message: 'Cart is empty' });
    }
    let cartDetails = [];
    for (const [productId, quantity] of Object.entries(carts[userId])) {
        const product = products.find(product => product.id === parseInt(productId));
        if (product) {
            cartDetails.push({ ...product, quantity });
        }
    }
    const totalPrice = cartDetails.reduce((total, item) => total + (item.price * item.quantity), 0);
    res.json({ cart: cartDetails, total_price: totalPrice });
});

app.delete('/cart/:userId/item/:productId', (req, res) => {
    const userId = req.params.userId;
    const productId = req.params.productId;
    let ledgerObject = {};
    if (!carts[userId] || !carts[userId][productId]) {
        return res.status(404).json({ error: 'Item not found in cart' });
    }

    ledgerObject['operation'] = "update";
    ledgerObject['model'] = 'cart';
    ledgerObject['product_id'] = productId;
    ledgerObject['user_id'] = userId;

    ledger.push(ledgerObject);
    delete carts[userId][productId];
    res.json(carts[userId]);
});

app.listen(port, () => {
    console.log(`E-commerce API listening at http://localhost:${port}`);
});
