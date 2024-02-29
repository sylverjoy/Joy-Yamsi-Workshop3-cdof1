const express = require('express');
const fs = require('fs');
const cors = require('cors')


const app = express();
const port = 3000;

let products = [];
let orders = [];
let carts = {};

app.use(express.json());
app.use(cors());

// Middleware to save data after each request
app.use((req, res, next) => {
    saveData();
    next();
});

// Load data from JSON files or mirror if main file not available
function loadData() {
    try {
        if (fs.existsSync('products.json')) {
            products = JSON.parse(fs.readFileSync('products.json', 'utf8'));
        } else if (fs.existsSync('products_mirror.json')) {
            products = JSON.parse(fs.readFileSync('products_mirror.json', 'utf8'));
        } else {
            products = [];
        }
    } catch (err) {
        console.error('Error loading products data:', err);
        products = [];
    }

    try {
        if (fs.existsSync('orders.json')) {
            orders = JSON.parse(fs.readFileSync('orders.json', 'utf8'));
        } else if (fs.existsSync('products_mirror.json')) {
            orders = JSON.parse(fs.readFileSync('orders_mirror.json', 'utf8'));
        } else {
            orders = [];
        }
    } catch (err) {
        console.error('Error loading orders data:', err);
        orders = [];
    }

    try {
        if (fs.existsSync('carts.json')) {
            carts = JSON.parse(fs.readFileSync('carts.json', 'utf8'));
        } else if (fs.existsSync('products_mirror.json')) {
            carts = JSON.parse(fs.readFileSync('carts_mirror.json', 'utf8'));
        } else {
            carts = {};
        }
    } catch (err) {
        console.error('Error loading carts data:', err);
        carts = {};
    }
}

// Save data to JSON files
function saveData() {
    fs.writeFileSync('products.json', JSON.stringify(products, null, 2), 'utf8');
    fs.writeFileSync('products_mirror.json', JSON.stringify(products, null, 2), 'utf8');
    fs.writeFileSync('orders.json', JSON.stringify(orders, null, 2), 'utf8');
    fs.writeFileSync('orders_mirror.json', JSON.stringify(orders, null, 2), 'utf8');
    fs.writeFileSync('carts.json', JSON.stringify(carts, null, 2), 'utf8');
    fs.writeFileSync('carts_mirror.json', JSON.stringify(carts, null, 2), 'utf8');
}

// Load initial data
loadData();

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
    if (products.length > 0) {
        newProduct.id = products[products.length - 1].id + 1;
    } else {
        newProduct.id = 1;
    }
    
    products.push(newProduct);
    res.status(201).json(newProduct);
});

// PUT /products/:id
app.put('/products/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const updatedProduct = req.body;
    const index = products.findIndex(product => product.id === productId);
    if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    products[index] = { ...products[index], ...updatedProduct };
    res.json(products[index]);
});

// DELETE /products/:id
app.delete('/products/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const index = products.findIndex(product => product.id === productId);
    if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    products.splice(index, 1);
    res.json({ message: 'Product deleted successfully' });
});


// Orders Routes

app.post('/orders', (req, res) => {
    const newOrder = req.body;
    if (!newOrder.userId) {
        newOrder.userId = 1;
    }
    if (orders.length > 0) {
        newOrder.id = orders[orders.length - 1].id + 1;
    } else {
        newOrder.id = 1;
    }
    newOrder.status = "Completed"
    orders.push(newOrder);
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
    if (!carts[userId]) {
        carts[userId] = {};
    }
    if (!carts[userId][productId]) {
        carts[userId][productId] = quantity;
    } else {
        carts[userId][productId] += quantity;
    }
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
    if (!carts[userId] || !carts[userId][productId]) {
        return res.status(404).json({ error: 'Item not found in cart' });
    }
    delete carts[userId][productId];
    res.json(carts[userId]);
});

app.listen(port, () => {
    console.log(`E-commerce API listening at http://localhost:${port}`);
});
