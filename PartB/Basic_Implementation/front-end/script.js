document.addEventListener("DOMContentLoaded", function() {
    const productsList = document.getElementById("products-list");
    const ordersList = document.getElementById("orders-list");
    const cartList = document.getElementById("cart-list");
    const productForm = document.getElementById("product-form");


    function fetchProducts() {
        fetch('http://localhost:3000/products')
            .then(response => response.json())
            .then(products => {
                renderProducts(products);
            })
            .catch(error => console.error('Error fetching products:', error));
    }

    function fetchOrders() {
        fetch('http://localhost:3000/orders/1')
            .then(response => response.json())
            .then(orders => {
                renderOrders(orders);
            })
            .catch(error => console.error('Error fetching orders:', error));
    }

    function fetchCart() {
        fetch('http://localhost:3000/cart/1')
            .then(response => response.json())
            .then(cart => {
                renderCart(cart);
            })
            .catch(error => console.error('Error fetching cart:', error));
    }

    function renderProducts(products) {
        productsList.innerHTML = ''; 
        const prodTitleDiv = document.createElement('div');
        prodTitleDiv.innerHTML = `<h2>Products</h2>`
        productsList.appendChild(prodTitleDiv);
        products.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.innerHTML = `
                <h3>${product.name}</h3>
                <p>Price: $${product.price}</p>
                <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
            `;
            productsList.appendChild(productDiv);
        });
        
        const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-product-id');
                addToCart(productId);
            });
        });
    }

    function addToCart(productId) {
        const userId = 1; 
        const quantity = 1; 
        fetch(`http://localhost:3000/cart/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: productId,
                quantity: quantity
            })
        })
        .then(response => response.json())
        .then(cart => {
            alert('Product added to cart! Refresh to see change!');
            console.log('Updated Cart:', cart);
        })
        .catch(error => console.error('Error adding product to cart:', error));

    }

    function renderOrders(orders) {
        ordersList.innerHTML = ''; 
        const ordTitleDiv = document.createElement('div');
        ordTitleDiv.innerHTML = `<h2>Orders</h2>`
        ordersList.appendChild(ordTitleDiv);
        orders.forEach(order => {
            const orderInfoDiv = document.createElement('div');
            const orderTPriceDiv = document.createElement('div');
            order.products.forEach( prod => {
                fetch(`http://localhost:3000/products/${prod.productId}`)
                    .then(response => response.json())
                    .then(product => {
                        orderInfoDiv.innerHTML += `
                        <p>${product.name}</p>
                        <p>Price: $${product.price}</p>
                        <p>Quantity: ${prod.quantity}</p>
                        `;
                    
                    })
                    .catch(error => console.error('Error fetching products:', error));
            })
            ordersList.appendChild(orderInfoDiv)
            orderTPriceDiv.innerHTML = `
            <h3><b>Total Price:<b> $${order.totalPrice}</h3>
            `
            ordersList.appendChild(orderTPriceDiv);
        });
    }

    function renderCart(cart) {
        cartList.innerHTML = ''; 
        const cartTitleDiv = document.createElement('div');
        cartTitleDiv.innerHTML = `<h2>Your Cart</h2>`
        cartList.appendChild(cartTitleDiv);

        cart.cart.forEach(cartDetail => {
            const cartInfoDiv = document.createElement('div');
            cartInfoDiv.innerHTML = `
                        <h3>${cartDetail.name}</h3>
                        <p>Price: $${cartDetail.price}</p>
                        <p>Quantity: ${cartDetail.quantity}</p>
                        <button class="delete-from-cart-btn" data-product-id="${cartDetail.id}">Delete</button>
                        `;
            cartList.appendChild(cartInfoDiv);
        });
        const cartTPriceDiv = document.createElement('div');
        cartTPriceDiv.innerHTML = `
                            <p><b>Total Price:<b> $${cart.total_price}</p>
                            <button class="place-order">Order</button>
                            `;
        cartList.appendChild(cartTPriceDiv);

        const deleteFromCartButtons = document.querySelectorAll('.delete-from-cart-btn');
        deleteFromCartButtons.forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-product-id');
                deleteFromCart(productId);
            });
        });

        const placeOrderButton = document.querySelector('.place-order');
        placeOrderButton.addEventListener('click', () => {
            placeOrder(); 
        })
    }

    function deleteFromCart(productId) {
        const userId = 1; 
        const quantity = 1; 
        fetch(`http://localhost:3000/cart/${userId}/item/${productId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(cart => {
            alert('Product deleted from cart! Refresh to see change!');
            console.log('Updated Cart:', cart);
        })
        .catch(error => console.error('Error deleting product cart:', error));
    }

    function placeOrder() {
        const userId = 1;
        let products = [];
        fetch('http://localhost:3000/cart/1')
            .then(response => response.json())
            .then(cart => {
                cart.cart.forEach(cartDetail => {
                    products.push({
                        "productId": cartDetail.id,
                        "quantity": cartDetail.quantity
                    })
                })
                fetch(`http://localhost:3000/orders/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        products: products,
                        userId: userId
                    })
                })
                .then(response => response.json())
                .then(order => {
                    alert('Order Placed! Refresh to see change!');
                    console.log('Order:', order);
                    emptyCart();
                })
                .catch(error => console.error('Error placing order:', error));
            })
            .catch(error => console.error('Error fetching cart:', error));
        
        
    }

    function emptyCart() {
        fetch('http://localhost:3000/cart/1')
            .then(response => response.json())
            .then(cart => {
                cart.cart.forEach(cartDetail => {
                    deleteFromCart(cartDetail.id) ;
                })
            })
            .catch(error => console.error('Error fetching cart:', error));
    }

    productForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const formData = new FormData(productForm);
        const newProduct = {
            name: formData.get('name'),
            price: parseFloat(formData.get('price')),
            category: formData.get('category'),
            inStock: formData.get('inStock') === 'true'
        };

        fetch('http://localhost:3000/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newProduct)
        })
        .then(response => response.json())
        .then(product => {
            alert('Product added successfully! Refresh to see change!');
        })
        .catch(error => console.error('Error adding product:', error));
    });

    fetchProducts();
    fetchOrders();
    fetchCart();
});
