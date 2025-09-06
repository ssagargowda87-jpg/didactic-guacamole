/**
 * EcoFinds - LocalStorage-powered prototype
 * Data Models:
 * users: [{id, email, password, username}]
 * currentUserId: string | null
 * products: [{id, ownerId, title, description, category, price, image, createdAt}]
 * carts: { [userId]: [{productId, qty}] }
 * purchases: { [userId]: [{productId, qty, purchasedAt}] }
 */

const DB_KEYS = {
  users: 'ef_users',
  currentUserId: 'ef_current_user',
  products: 'ef_products',
  carts: 'ef_carts',
  purchases: 'ef_purchases',
};

const CATEGORIES = ['Clothing','Electronics','Furniture','Books','Home','Toys','Other'];

function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }
function get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch{ return fallback; } }
function set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
function now(){ return new Date().toISOString(); }

function db(){
  const seedProducts = [
    { title:'Vintage Denim Jacket', price:25, category:'Clothing', image:"shopping.system folder', description:'Well-loved denim jacket, size M.' },
    { title:'Used Laptop 8GB/256GB', price:220, category:'Electronics', image:'https://via.placeholder.com/600x450?text=EcoFinds+Laptop', description:'Works great, minor scratches.' },
    { title:'Wooden Coffee Table', price:60, category:'Furniture', image:'https://via.placeholder.com/600x450?text=EcoFinds+Table', description:'Solid wood, 90x45 cm.' },
  ];
  let users = get(DB_KEYS.users, []);
  let products = get(DB_KEYS.products, []);
  if(products.length === 0){
    // create a demo user and own the seeded products
    const demoUser = { id: uid(), email:'demo@ecofinds.app', password:'demo123', username:'DemoUser' };
    users.push(demoUser);
    products = seedProducts.map(p => ({ id:uid(), ownerId: demoUser.id, createdAt: now(), ...p }));
    set(DB_KEYS.users, users);
    set(DB_KEYS.products, products);
  }
  if(get(DB_KEYS.carts, null) == null) set(DB_KEYS.carts, {});
  if(get(DB_KEYS.purchases, null) == null) set(DB_KEYS.purchases, {});
  return { users, products };
}

function requireAuth(redirectIfMissing=true){
  const id = get(DB_KEYS.currentUserId, null);
  if(!id && redirectIfMissing){
    window.location.href = "index.html";
  }
  return id;
}

function currentUser(){
  const id = get(DB_KEYS.currentUserId, null);
  const users = get(DB_KEYS.users, []);
  return users.find(u => u.id === id) || null;
}

function saveUser(u){
  const users = get(DB_KEYS.users, []);
  const i = users.findIndex(x=>x.id===u.id);
  if(i>=0) users[i]=u; else users.push(u);
  set(DB_KEYS.users, users);
}

function logOut(){
  localStorage.removeItem(DB_KEYS.currentUserId);
  window.location.href = "index.html";
}

function productById(id){
  const products = get(DB_KEYS.products, []);
  return products.find(p=>p.id===id) || null;
}

function saveProduct(p){
  const products = get(DB_KEYS.products, []);
  const i = products.findIndex(x=>x.id===p.id);
  if(i>=0) products[i]=p; else products.push(p);
  set(DB_KEYS.products, products);
}

function deleteProduct(id){
  let products = get(DB_KEYS.products, []);
  products = products.filter(p=>p.id!==id);
  set(DB_KEYS.products, products);
}

function userCart(uid_){
  const carts = get(DB_KEYS.carts, {});
  return carts[uid_] || [];
}
function setUserCart(uid_, items){
  const carts = get(DB_KEYS.carts, {});
  carts[uid_] = items;
  set(DB_KEYS.carts, carts);
}

function addToCart(productId, qty=1){
  const uid_ = requireAuth();
  let items = userCart(uid_);
  const i = items.findIndex(it=>it.productId===productId);
  if(i>=0){ items[i].qty += qty; } else { items.push({productId, qty}); }
  setUserCart(uid_, items);
  alert("Added to cart 🛒");
}

function checkout(){
  const uid_ = requireAuth();
  const items = userCart(uid_);
  if(items.length===0){ alert("Cart is empty"); return; }
  const purchases = get(DB_KEYS.purchases, {});
  const prev = purchases[uid_] || [];
  const nowIso = now();
  purchases[uid_] = prev.concat(items.map(i=>({...i, purchasedAt: nowIso})));
  set(DB_KEYS.purchases, purchases);
  setUserCart(uid_, []);
  alert("Checkout complete! ✅");
  window.location.href = "purchases.html";
}

function renderHeader(){
  const el = document.getElementById("app-header");
  if(!el) return;
  const user = currentUser();
  el.innerHTML = `
    <div class="wrap">
      <a class="brand" href="feed.html"><img alt="logo" src="https://via.placeholder.com/64?text=EF"><span>EcoFinds</span></a>
      <nav class="nav">
        <a href="feed.html">Feed</a>
        <a href="my-listings.html">My Listings</a>
        <a href="add-product.html">Add Item</a>
        <a href="cart.html">Cart</a>
        <a href="purchases.html">Purchases</a>
        <a href="dashboard.html">${user ? (user.username || user.email) : 'Dashboard'}</a>
        <a href="#" id="logout-link">Logout</a>
      </nav>
    </div>`;
  const out = el.querySelector("#logout-link");
  if(out){ out.addEventListener('click', (e)=>{ e.preventDefault(); logOut(); }); }
}

function qs(obj){
  return new URLSearchParams(obj).toString();
}

function param(name){
  return new URLSearchParams(window.location.search).get(name);
}

document.addEventListener("DOMContentLoaded", ()=>{
  // page routers by data-page attribute
  const page = document.body.getAttribute("data-page");

  // Render header on pages that have it
  if(document.getElementById("app-header")) renderHeader();

  // INDEX (login/signup)
  if(page === "index"){
    db(); // ensure seed
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const swapToSign = document.getElementById("to-signup");
    const swapToLogin = document.getElementById("to-login");

    swapToSign.addEventListener("click", (e)=>{ e.preventDefault(); document.getElementById("auth-cards").classList.add("signup"); });
    swapToLogin.addEventListener("click", (e)=>{ e.preventDefault(); document.getElementById("auth-cards").classList.remove("signup"); });

    loginForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      const email = loginForm.email.value.trim().toLowerCase();
      const pass = loginForm.password.value;
      const users = get(DB_KEYS.users, []);
      const user = users.find(u=>u.email===email && u.password===pass);
      if(user){
        set(DB_KEYS.currentUserId, user.id);
        window.location.href = "feed.html";
      } else {
        alert("Invalid credentials");
      }
    });

    signupForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      const email = signupForm.email.value.trim().toLowerCase();
      const pass = signupForm.password.value;
      const username = signupForm.username.value.trim();
      if(!email || !pass || !username){ alert("Please fill all fields"); return; }
      let users = get(DB_KEYS.users, []);
      if(users.some(u=>u.email===email)){ alert("Email already exists"); return; }
      const u = { id: uid(), email, password: pass, username };
      users.push(u);
      set(DB_KEYS.users, users);
      set(DB_KEYS.currentUserId, u.id);
      window.location.href = "feed.html";
    });
  }

  // FEED
  if(page === "feed"){
    requireAuth();
    const { products } = db();
    const listEl = document.getElementById("feed-list");
    const search = document.getElementById("search");
    const cat = document.getElementById("category");

    // categories
    CATEGORIES.forEach(c=>{
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      cat.appendChild(opt);
    });

    function render(){
      const q = (search.value || "").toLowerCase();
      const c = cat.value;
      const all = get(DB_KEYS.products, []);
      const filtered = all.filter(p=>
        (c==="" || p.category===c) &&
        (q==="" || p.title.toLowerCase().includes(q))
      ).sort((a,b)=> (b.createdAt || "").localeCompare(a.createdAt || ""));
      listEl.innerHTML = filtered.map(p=>`
        <div class="prod-card">
          <img src="${p.image || 'https://via.placeholder.com/600x450?text=EcoFinds+Item'}" alt="${p.title}">
          <div class="p-body">
            <div class="badge">${p.category}</div>
            <h3>${p.title}</h3>
            <div class="price">₹${Number(p.price).toLocaleString()}</div>
            <div class="inline">
              <a class="link" href="product.html?${qs({id:p.id})}">View</a>
              <button onclick="addToCart('${p.id}')">Add to Cart</button>
            </div>
          </div>
        </div>
      `).join("");
    }
    search.addEventListener("input", render);
    cat.addEventListener("change", render);
    render();
  }

  // ADD / EDIT PRODUCT
  if(page === "add-product"){
    const uid_ = requireAuth();
    const form = document.getElementById("prod-form");
    const cat = form.category;
    const isEdit = !!param("edit");
    const titleEl = document.getElementById("add-title");
    titleEl.textContent = isEdit ? "Edit Product" : "Add New Product";

    CATEGORIES.forEach(c=>{ const opt=document.createElement("option"); opt.value=c; opt.textContent=c; cat.appendChild(opt); });

    if(isEdit){
      const p = productById(param("edit"));
      if(!p){ alert("Not found"); window.location.href="my-listings.html"; return; }
      if(p.ownerId !== uid_){ alert("You can only edit your products"); window.location.href="my-listings.html"; return; }
      form.title.value = p.title;
      form.description.value = p.description || "";
      form.category.value = p.category || "";
      form.price.value = p.price;
      form.image.value = p.image || "";
    }

    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const data = {
        title: form.title.value.trim(),
        description: form.description.value.trim(),
        category: form.category.value,
        price: Number(form.price.value),
        image: form.image.value.trim() || 'https://via.placeholder.com/600x450?text=EcoFinds+Item'
      };
      if(!data.title || !data.category || !data.price){ alert("Please fill title, category, and price"); return; }
      if(isEdit){
        const p = productById(param("edit"));
        Object.assign(p, data);
        saveProduct(p);
        alert("Updated ✅");
      } else {
        const p = { id: uid(), ownerId: uid_, createdAt: now(), ...data };
        saveProduct(p);
        alert("Created ✅");
      }
      window.location.href="my-listings.html";
    });
  }

  // MY LISTINGS
  if(page === "my-listings"){
    const uid_ = requireAuth();
    const listEl = document.getElementById("mine");
    function render(){
      const mine = get(DB_KEYS.products, []).filter(p=>p.ownerId===uid_);
      listEl.innerHTML = mine.map(p=>`
        <tr>
          <td><img src="${p.image}" alt="" style="width:60px; height:44px; object-fit:cover; border-radius:8px"></td>
          <td>${p.title}<div class="muted" style="font-size:12px">${p.category}</div></td>
          <td>₹${Number(p.price).toLocaleString()}</td>
          <td>
            <div class="inline">
              <a class="link" href="product.html?${qs({id:p.id})}">View</a>
              <a class="link" href="add-product.html?${qs({edit:p.id})}">Edit</a>
              <button class="ghost" data-delete="${p.id}">Delete</button>
            </div>
          </td>
        </tr>
      `).join("");
      listEl.querySelectorAll("button[data-delete]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          if(confirm("Delete this listing?")){
            deleteProduct(btn.getAttribute("data-delete"));
            render();
          }
        });
      });
    }
    render();
  }

  // PRODUCT DETAIL
  if(page === "product"){
    requireAuth();
    const id = param("id");
    const p = productById(id);
    const container = document.getElementById("prod-detail");
    if(!p){ container.innerHTML = "<p>Product not found.</p>"; return; }
    container.innerHTML = `
      <div class="grid cols-2">
        <div class="card">
          <img style="width:100%; border-radius:12px" src="${p.image}" alt="${p.title}">
        </div>
        <div class="card">
          <div class="badge">${p.category}</div>
          <h2>${p.title}</h2>
          <div class="price" style="font-size:24px">₹${Number(p.price).toLocaleString()}</div>
          <div class="hr"></div>
          <p>${p.description || ''}</p>
          <div class="hr"></div>
          <div class="inline">
            <button onclick="addToCart('${p.id}')">Add to Cart</button>
            <a class="ghost" href="feed.html">Back to Feed</a>
          </div>
        </div>
      </div>
    `;
  }

  // DASHBOARD
  if(page === "dashboard"){
    const uid_ = requireAuth();
    const user = currentUser();
    const form = document.getElementById("profile-form");
    const avatar = document.getElementById("avatar");
    avatar.textContent = (user.username || user.email || "U").slice(0,1).toUpperCase();
    form.email.value = user.email;
    form.username.value = user.username || "";
    form.password.value = user.password || "";

    form.addEventListener("submit",(e)=>{
      e.preventDefault();
      user.email = form.email.value.trim().toLowerCase();
      user.username = form.username.value.trim();
      user.password = form.password.value;
      saveUser(user);
      alert("Profile saved ✅");
      renderHeader();
    });
  }

  // CART
  if(page === "cart"){
    const uid_ = requireAuth();
    const tbody = document.getElementById("cart-body");
    const totalEl = document.getElementById("cart-total");

    function render(){
      const items = userCart(uid_);
      const products = get(DB_KEYS.products, []);
      let total = 0;
      tbody.innerHTML = items.map(it=>{
        const p = products.find(x=>x.id===it.productId);
        const price = p ? Number(p.price) : 0;
        const line = price * it.qty;
        total += line;
        return `
          <tr>
            <td><img src="${p?.image || ''}" alt="" style="width:60px; height:44px; object-fit:cover; border-radius:8px"></td>
            <td>${p?.title || 'Unknown'}</td>
            <td>₹${price.toLocaleString()}</td>
            <td class="qty">
              <button data-dec="${it.productId}">-</button>
              <span>${it.qty}</span>
              <button data-inc="${it.productId}">+</button>
            </td>
            <td><button class="ghost" data-rm="${it.productId}">Remove</button></td>
          </tr>
        `;
      }).join("");
      totalEl.textContent = "₹" + total.toLocaleString();

      tbody.querySelectorAll("[data-inc]").forEach(b=> b.addEventListener("click", ()=> changeQty(b.getAttribute("data-inc"), 1)));
      tbody.querySelectorAll("[data-dec]").forEach(b=> b.addEventListener("click", ()=> changeQty(b.getAttribute("data-dec"), -1)));
      tbody.querySelectorAll("[data-rm]").forEach(b=> b.addEventListener("click", ()=> removeItem(b.getAttribute("data-rm"))));
    }

    function changeQty(pid, delta){
      let items = userCart(uid_);
      const i = items.findIndex(it=>it.productId===pid);
      if(i>=0){
        items[i].qty += delta;
        if(items[i].qty<=0) items.splice(i,1);
        setUserCart(uid_, items);
        render();
      }
    }
    function removeItem(pid){
      let items = userCart(uid_);
      items = items.filter(it=>it.productId!==pid);
      setUserCart(uid_, items);
      render();
    }

    document.getElementById("checkout").addEventListener("click", checkout);
    render();
  }

  // PURCHASES
  if(page === "purchases"){
    const uid_ = requireAuth();
    const list = document.getElementById("purch-list");
    const purchases = get(DB_KEYS.purchases, {})[uid_] || [];
    const products = get(DB_KEYS.products, []);
    if(purchases.length===0){
      list.innerHTML = `<tr><td colspan="4" class="muted">No purchases yet.</td></tr>`;
      return;
    }
    list.innerHTML = purchases.map(it=>{
      const p = products.find(x=>x.id===it.productId);
      return `
        <tr>
          <td><img src="${p?.image || ''}" style="width:60px; height:44px; object-fit:cover; border-radius:8px"></td>
          <td>${p?.title || 'Unknown'}</td>
          <td>₹${Number(p?.price||0).toLocaleString()}</td>
          <td>${new Date(it.purchasedAt).toLocaleString()}</td>
        </tr>
      `;
    }).join("");
  }
});
