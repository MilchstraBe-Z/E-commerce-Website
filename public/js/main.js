document.addEventListener("DOMContentLoaded", function () {
    loadCategories();
    loadCartDisplay(); 

    const categoryDropdown = document.getElementById('category-dropdown');
    if (categoryDropdown) {
        categoryDropdown.addEventListener('change', function (event) {
            const catid = event.target.value;
            if (catid === 'all') {
                window.location.href = '/';
            } else {
                window.location.href = '/?catid=' + catid;
            }
        });        
    }

    const body = document.body;
    body.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-cart')) {
            const productCard = event.target.closest('.product-block');  
            const pid = event.target.getAttribute('data-pid');
            const name = event.target.getAttribute('data-name');
            const price = event.target.getAttribute('data-price');
            const quantityInput = productCard.querySelector('.quantity-input'); 
            const quantity = parseInt(quantityInput.value) || 1;  
            addToCart(pid, name, price, quantity); 
        }
    });

    const cartButton = document.getElementById('cart-button');
    const cartDropdown = document.getElementById('cart-dropdown');
    if (cartButton && cartDropdown) {
        cartButton.addEventListener('click', function () {
            if (cartDropdown.style.display === 'block') {
                cartDropdown.style.display = 'none';
            } else {
                cartDropdown.style.display = 'block';
            }
        });
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function()  {
        fetch('/api/check-auth')
            .then(response => response.json())
            .then(data => {
                if (!data.isAuthenticated) {
                    window.location.href = '/login'; 
                } else {
                    window.location.href = '/cart'; 
                }
            });
        });
    }

    let lastScrollTop = 0;
    window.addEventListener('scroll', function () {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        if (currentScroll > lastScrollTop) {
            document.querySelector('header').classList.add('hide-header');
        } else {
            document.querySelector('header').classList.remove('hide-header');
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; 
    });

    const checkboxes = document.querySelectorAll('.item-checkbox');
    const checkoutButton = document.getElementById('paypal-button');

    function toggleCheckoutButton() {
        const anyChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);
        if (checkoutButton) {
            checkoutButton.disabled = !anyChecked;
        }
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', toggleCheckoutButton);
    });

    toggleCheckoutButton();

    const breadcrumb = document.getElementById('breadcrumb');
    const params = new URLSearchParams(window.location.search);
    const catid = params.get('catid');

    if (breadcrumb && catid && catid !== 'all') {
        fetch(`/api/categories/${catid}`)
            .then(res => res.json())
            .then(category => {
                if (category && category.name) {
                    const sep = document.createTextNode(' > ');
                    const link = document.createElement('a');
                    link.href = `/?catid=${category.catid}`;
                    link.textContent = category.name;
                    breadcrumb.appendChild(sep);
                    breadcrumb.appendChild(link);
                }
            })
            .catch(err => console.error('Failed to load breadcrumb category:', err));
    }

});

function loadCategories() {
    const params = new URLSearchParams(window.location.search);
    const currentCatid = params.get('catid');

    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            const categoryDropdown = document.getElementById('category-dropdown');
            if (categoryDropdown) {
                categoryDropdown.innerHTML = '<option value="all">All Categories</option>';
                categories.forEach(category => {
                    categoryDropdown.innerHTML += `
                        <option value="${category.catid}">${category.name}</option>
                    `;
                });

                if (currentCatid) {
                    categoryDropdown.value = currentCatid;
                }
            }
        })
        .catch(error => console.error('Error loading categories:', error));
}

// Load Products 
function loadProducts(catid) {
    const url = catid === "all" ? `/api/products` : `/api/products?catid=${catid}`;
    fetch(url)
        .then(response => response.json())
        .then(products => {
            const productList = document.getElementById('product-list');
            if (productList) {
                productList.innerHTML = '';  
                products.forEach(product => {
                    productList.innerHTML += `
                        <div class="product-block">
                            <a href="/product/${product.pid}">
                                <img src="${product.image}" alt="${product.name}" class="product-image">
                                <p class="product-name">${product.name}</p>
                            </a>
                            <p class="product-price">$${product.price}</p>
                            <!-- Quantity input and + / - buttons -->
                            <div class="quantity-controls">
                                <button class="decrement">-</button>
                                <input type="number" class="quantity-input" value="1" min="1" data-pid="${product.pid}">
                                <button class="increment">+</button>
                            </div>
                            <button class="add-to-cart" data-pid="${product.pid}" data-name="${product.name}" data-price="${product.price}">Add to Cart</button>
                        </div>
                    `;
                });
            }
        })
        .catch(error => console.error('Error loading products:', error));
}

// Add to Cart
function addToCart(pid, name, price, quantity = 1) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let productIndex = cart.findIndex(item => item.pid === pid);

    if (productIndex === -1) {
        cart.push({ pid, name, price, quantity });
    } else {
        cart[productIndex].quantity += quantity; 
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    loadCartDisplay();  
}

// Load Cart Display
function loadCartDisplay() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartList = document.getElementById('cart-list');
    const totalPriceElement = document.getElementById('total-price');

    if (!cartList || !totalPriceElement) return; 

    cartList.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        cartList.innerHTML += `
            <li>
                <a href="/product/${item.pid}" title="${item.name}">${item.name}</a>
                <span class="product-price">$${parseFloat(item.price).toFixed(2)}</span>
                <div class="quantity-controls">
                    <button class="decrement" data-pid="${item.pid}">-</button>
                    <input type="number" value="${item.quantity}" min="1" data-pid="${item.pid}" class="quantity-input" />
                    <button class="increment" data-pid="${item.pid}">+</button>
                    <button class="remove-item" data-pid="${item.pid}">Remove</button>
                </div>
            </li>
        `;
        total += item.price * item.quantity;
    });   
    
    cartList.querySelectorAll(".quantity-input").forEach(input =>
        input.addEventListener("change", () => {
            const pid = input.dataset.pid;
            let qty = parseInt(input.value);
            if (isNaN(qty) || qty < 1) qty = 1;
            input.value = qty;

            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            const item = cart.find(i => i.pid === pid);
            if (item) {
                item.quantity = qty;
                localStorage.setItem("cart", JSON.stringify(cart));
                loadCartDisplay(); 
            }
        })
    );

    totalPriceElement.textContent = total.toFixed(2);
}

// Update Quantity
document.body.addEventListener('click', function(event) {
    if (event.target.classList.contains('decrement')) {
        const pid = event.target.getAttribute('data-pid');
        updateCartQuantity(pid, -1);
    } else if (event.target.classList.contains('increment')) {
        const pid = event.target.getAttribute('data-pid');
        updateCartQuantity(pid, 1);
    } else if (event.target.classList.contains('remove-item')) {
        const pid = event.target.getAttribute('data-pid');
        removeFromCart(pid);
    } 
});

// Update Cart Quantity
function updateCartQuantity(pid, increment) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const productIndex = cart.findIndex(item => item.pid === pid);

    if (productIndex !== -1) {
        cart[productIndex].quantity += increment;

        if (cart[productIndex].quantity <= 0) {
            cart.splice(productIndex, 1);
        }
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCartDisplay();
}

// Remove item from cart
function removeFromCart(pid) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.pid !== pid);
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCartDisplay(); 
}

// Product + and - buttons for the quantity
document.body.addEventListener('click', function(event) {
    if (event.target.classList.contains('increment')) {
        const inputBox = event.target.previousElementSibling;
        let value = parseInt(inputBox.value);
        inputBox.value = value + 1;  
    } else if (event.target.classList.contains('decrement')) {
        const inputBox = event.target.nextElementSibling;
        let value = parseInt(inputBox.value);
        if (value > 1) {
            inputBox.value = value - 1;  
        }
    }
});

/*//////////////////// admin panel ////////////////////////////////////*/

// Open and close modal
const modal = document.getElementById('messageModal');
const closeBtn = document.querySelector('.close-btn');
if (closeBtn) {
    closeBtn.onclick = function() {
        const modal = document.getElementById('messageModal');
        if (modal) modal.style.display = 'none';
    };
};

// Function to show modal with message
function showModal(messageText, type) {
    document.getElementById('modalMessageText').innerText = messageText;
    modal.style.display = 'block';
    modal.classList.add(type);  
}

function getCSRFTokenFromCookie() {
    const match = document.cookie.match(/(?:^|; )_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}  

function getCookie(name) {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1];
}

if (typeof window.jQuery === 'function') {
    $(document).ready(function() {
        $('#addProductForm').submit(function(event) {
            event.preventDefault();  

            const formData = new FormData(this); 
            const csrfToken = getCookie('XSRF-TOKEN');
            $.ajax({
                url: '/admin/add-product',
                type: 'POST',
                data: formData,
                processData: false,  
                contentType: false,  
                headers: {
                    'X-CSRF-Token': csrfToken
                },
                success: function(response) {
                    if (response.success) {
                        showModal(response.message, 'success');  
                    } else {
                        showModal(response.message, 'error'); 
                    }
                },
                error: function(xhr, status, error) {
                    console.error(error);
                    showModal('An error occurred. Please try again later.', 'error');
                }
            });
        });
    });    

    $('#addCategoryForm').submit(function(event) {
        event.preventDefault();
        const categoryData = $(this).serialize();
        const csrfToken = getCookie('XSRF-TOKEN');
        $.ajax({
            url: '/admin/add-category',
            type: 'POST',
            data: categoryData,
            headers: {
                'X-CSRF-Token': csrfToken
            },
            success: function(response) {
                if (response.success) {
                    showModal(response.message, 'success');
                } else {
                    showModal(response.message, 'error');
                }
            },
            error: function() {
                showModal('Something went wrong. Please try again later.', 'error');
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname === "/cart") {
        renderCartInMainBody();
    }
    const form = document.getElementById("paypal-form");
    if (form) {
        form.addEventListener("submit", async function (e) {
        e.preventDefault(); 
    
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const selected = document.querySelectorAll(".checkout-checkbox:checked");
        if (selected.length === 0) return alert("Please select items to checkout.");
    
        const selectedItems = [];
        selected.forEach(cb => {
            const pid = cb.dataset.pid;
            const quantity = getCartItem(pid)?.quantity || 0;
            if (quantity > 0) selectedItems.push({ pid, quantity });
        });
        
        const csrfToken = getCookie('XSRF-TOKEN');
        const res = await fetch("/api/create-order", {
            method: "POST",
            credentials: "same-origin",
            headers: {
            "Content-Type": "application/json",
            'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify({ items: selectedItems })
        });
    
        const { success, orderId, digest, paypalFields } = await res.json();
        if (!success) return alert("Order creation failed.");
    
        const wrapper = document.getElementById("paypal-hidden-fields");
        wrapper.innerHTML = "";
        paypalFields.forEach(f => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = f.name;
            input.value = f.value;
            wrapper.appendChild(input);
        });
    
        document.getElementById("paypal-invoice").value = orderId;
        document.getElementById("paypal-custom").value = digest;
    
        localStorage.removeItem("cart");
    
        form.submit();
        });
    }
});
      


function updateCheckedTotal() {
    const list = document.getElementById("cart-items-list");
    const totalEl = document.getElementById("cart-total-price");
    if (!list || !totalEl) return;
  
    let sum = 0;
    list.querySelectorAll(".cart-item").forEach(itemEl => {
      const cb = itemEl.querySelector(".checkout-checkbox");
      if (cb && cb.checked) {
        const subtotalStr = itemEl.querySelector(".item-subtotal").textContent;
        sum += parseFloat(subtotalStr.replace('$','')) || 0;
      }
    });
  
    totalEl.textContent = sum.toFixed(2);
}

function renderCartInMainBody() {
    const prevChecked = new Set();
    const oldList = document.getElementById("cart-items-list");
    if (oldList) {
      oldList.querySelectorAll(".checkout-checkbox:checked")
             .forEach(cb => prevChecked.add(cb.dataset.pid));
    }
  
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const list = document.getElementById("cart-items-list");
    const totalEl = document.getElementById("cart-total-price");
    if (!list || !totalEl) return;
  
    list.innerHTML = ""; 
  
    cart.forEach(item => {
      const subtotal = item.quantity * item.price;
      list.innerHTML += `
        <li class="cart-item" data-pid="${item.pid}">
          <input type="checkbox"
                 class="checkout-checkbox"
                 data-pid="${item.pid}"
                 ${prevChecked.has(item.pid) ? 'checked' : ''} />
  
          <a href="/product/${item.pid}" class="cart-item-name">
            ${item.name}
          </a>
  
          <div class="quantity-controls">
            <input type="number"
                   class="quantity-input"
                   data-pid="${item.pid}"
                   value="${item.quantity}"
                   min="1" />
          </div>
  
          <span class="item-subtotal">
            $${subtotal.toFixed(2)}
          </span>
  
          <button class="remove-item" data-pid="${item.pid}">
            Remove
          </button>
        </li>`;
    });
  
    // manual quantity input
    list.querySelectorAll(".quantity-input").forEach(input =>
        input.addEventListener("change", () => {
            const pid = input.dataset.pid;
            let qty = parseInt(input.value);
          
            if (isNaN(qty) || qty < 1) qty = 1;
            input.value = qty;
          
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            const item = cart.find(i => i.pid === pid);
            if (item) {
              item.quantity = qty;
              localStorage.setItem("cart", JSON.stringify(cart));
              updateCheckedTotal(); 
            }
      })
    );
    //  remove
    list.querySelectorAll(".remove-item").forEach(btn =>
      btn.addEventListener("click", () => {
        removeFromCart(btn.dataset.pid);
        renderCartInMainBody();
      })
    );
    // checkbox toggles
    list.querySelectorAll(".checkout-checkbox").forEach(cb =>
      cb.addEventListener("change", updateCheckedTotal)
    );
  
    updateCheckedTotal();
  }
  
  function getCartItem(pid) {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    return cart.find(i => i.pid === pid) || { quantity: 0 };
  }
  