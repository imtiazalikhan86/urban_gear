import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Home,
  Menu,
  MapPin,
  Minus,
  Package,
  Pencil,
  Percent,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { Button, Field, Panel, StatusPill, Toast } from "./components/ui";
import { authService } from "./services/auth.service";
import { productService } from "./services/product.service";
import { quoteService } from "./services/quote.service";
import { orderService } from "./services/order.service";
import {
  notificationService,
  type NotificationItem,
} from "./services/notification.service";
import type { Order, Product, QuotePreviewResponse } from "./types/api";
import { signedIn, signedOut, userUpdated } from "./store/auth.slice";
import { useAppDispatch, useAppSelector } from "./store/hooks";

const referenceCollections = [
  { title: "Bags & Backpacks", image: "/reference/catalog/bags-1.jpg" },
  { title: "Employee Gifting", image: "/reference/catalog/bags-2.jpg" },
  {
    title: "Corporate Kits",
    image: "/reference/catalog/corporate-gifting.png",
  },
];

const referenceImageByCategory: Record<string, string> = {
  Bags: "/reference/catalog/bags-1.jpg",
  Drinkware: "/reference/catalog/bags-2.jpg",
};

function App() {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [margin, setMargin] = useState(user?.marginPercent ?? 15);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [quoteItems, setQuoteItems] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<QuotePreviewResponse["data"] | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const quotePanelRef = useRef<HTMLElement>(null);
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    slug: "",
    description: "",
    category: "",
    price: "",
    imageUrl: "",
  });
  const [productSaving, setProductSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  function openNotifications() {
    setDrawerOpen(false);
    setNotificationsOpen(true);
  }

  useEffect(() => {
    if (!notificationsOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node))
        setNotificationsOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!token) return;
    void authService
      .me()
      .then((response) => {
        dispatch(userUpdated(response.data));
        setMargin(response.data.marginPercent ?? 15);
      })
      .catch(() => dispatch(signedOut()));
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void productService
      .list({ search: search || undefined, pageSize: 12 })
      .then((response) => setProducts(response.data))
      .finally(() => setLoading(false));
  }, [search, token]);

  useEffect(() => {
    if (!token) return;
    setOrderLoading(true);
    void orderService
      .list()
      .then((response) => setOrders(response.data))
      .finally(() => setOrderLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void notificationService
      .list()
      .then((response) => setNotifications(response.data))
      .catch(() => setNotifications([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    return notificationService.stream({
      onNotification: (notification) => {
        setNotifications((current) =>
          current.some((item) => item.id === notification.id)
            ? current
            : [notification, ...current],
        );
        setToast({ message: notification.message, tone: "success" });
      },
    });
  }, [token]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const response = await authService.login(
        String(form.get("email")),
        String(form.get("password")),
      );
      dispatch(
        signedIn({
          token: response.data.accessToken,
          user: response.data.user,
        }),
      );
      setNotice("Welcome back. Your catalog is ready.");
    } catch {
      setNotice("Login failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveMargin() {
    try {
      const response = await authService.updateMargin(margin);
      dispatch(userUpdated(response.data));
      setNotice(`Default margin saved at ${margin}%.`);
    } catch {
      setNotice("Margin could not be saved.");
    }
  }

  function addToQuote(productId: string) {
    const product = products.find((item) => item.id === productId);
    setQuoteItems((current) => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1,
    }));
    setQuote(null);
    setNotice(`${product?.name ?? "Product"} added to cart.`);
    setToast({
      message: `${product?.name ?? "Product"} added to cart.`,
      tone: "success",
    });
  }

  function openCart() {
    setDrawerOpen(false);
    quotePanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function changeQuantity(productId: string, change: number) {
    setQuoteItems((current) => {
      const nextQuantity = (current[productId] ?? 0) + change;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: nextQuantity };
    });
    setQuote(null);
  }

  async function previewQuote() {
    const items = Object.entries(quoteItems).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    if (!items.length) {
      setNotice("Add at least one product to preview a quote.");
      return;
    }
    setQuoteLoading(true);
    try {
      const response = await quoteService.preview(items, margin);
      setQuote(response.data);
      setNotice("Customer pricing preview updated.");
    } catch {
      setNotice("Quote preview could not be generated.");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function placeOrder() {
    const items = Object.entries(quoteItems).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    if (!quote || !items.length) {
      setNotice("Preview customer pricing before placing the order.");
      return;
    }
    setOrderLoading(true);
    try {
      const response = await orderService.create(items, quote.marginPercent);
      setOrders((current) => [response.data, ...current]);
      setQuoteItems({});
      setQuote(null);
      setNotice(`${response.data.orderNumber} created successfully.`);
    } catch {
      setNotice("Order could not be created. Check product availability.");
    } finally {
      setOrderLoading(false);
    }
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductSaving(true);
    try {
      if (editingProductId) {
        await productService.update(editingProductId, {
          ...productForm,
          price: productForm.price,
          imageUrl: productForm.imageUrl || null,
        });
      } else {
        await productService.create({
          ...productForm,
          price: Number(productForm.price),
          imageUrl: productForm.imageUrl || null,
          isAvailable: true,
          currency: "INR",
        });
      }
      setProductForm({
        sku: "",
        name: "",
        slug: "",
        description: "",
        category: "",
        price: "",
        imageUrl: "",
      });
      const response = await productService.list({
        search: search || undefined,
        pageSize: 12,
      });
      setProducts(response.data);
      const notificationResponse = await notificationService.list();
      setNotifications(notificationResponse.data);
      const action = editingProductId ? "updated" : "added";
      setToast({ message: `Product ${action} successfully.`, tone: "success" });
      setEditingProductId(null);
    } catch {
      setToast({
        message: `Product could not be ${editingProductId ? "updated" : "added"}. Check the required fields.`,
        tone: "error",
      });
    } finally {
      setProductSaving(false);
    }
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setProductForm({
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl ?? "",
    });
    document
      .querySelector(".admin-product-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try {
      await productService.remove(product.id);
      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );
      setToast({ message: "Product deleted successfully.", tone: "success" });
    } catch {
      setToast({ message: "Product could not be deleted.", tone: "error" });
    }
  }

  if (!token || !user) {
    return (
      <main className="login-layout">
        <div className="login-art">
          <span className="eyebrow">URBAN GEAR / RESELLER WORKSPACE</span>
          <h1>Turn your catalog into a sharper customer offer.</h1>
          <p>
            Browse wholesale products, set your margin, and prepare a
            customer-ready quote in one calm workspace.
          </p>
          <div className="login-signal">
            <ShieldCheck size={18} /> Protected reseller access
          </div>
        </div>
        <Panel className="login-panel">
          <div className="brand-lockup">
            <img
              className="brand-logo"
              src="/reference/logo.png"
              alt="Urban Gear"
            />
            <span>Urban Gear</span>
          </div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to your reseller workspace.</p>
          <form onSubmit={handleLogin}>
            <Field
              id="email"
              name="email"
              type="email"
              label="Email address"
              placeholder="reseller@urbangear.local"
              required
            />
            <Field
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="Your password"
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Open workspace"}{" "}
              <ArrowRight size={17} />
            </Button>
          </form>
          {notice && <p className="form-notice">{notice}</p>}
        </Panel>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${drawerOpen ? "sidebar--open" : ""}`}>
        <div className="drawer-profile">
          <img
            className="brand-logo"
            src="/reference/logo.png"
            alt="Urban Gear"
          />
          <div>
            <strong>Hey, {user.name.split(" ")[0]}!</strong>
            <span>{user.role} workspace</span>
          </div>
          <button
            className="drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>
        <div className="brand-lockup">
          <img
            className="brand-logo sidebar-logo"
            src="/reference/logo.png"
            alt="Urban Gear"
          />
          <span>Urban Gear</span>
        </div>
        <nav>
          <a
            className="nav-link nav-link--active"
            onClick={() => setDrawerOpen(false)}
          >
            <Home size={18} /> Home
          </a>
          <a className="nav-link" onClick={() => setDrawerOpen(false)}>
            <Search size={18} /> Search
          </a>
          <a className="nav-link" onClick={openCart}>
            <ShoppingBag size={18} /> Cart{" "}
            <span className="nav-count">
              {Object.values(quoteItems).reduce(
                (total, quantity) => total + quantity,
                0,
              )}
            </span>
          </a>
          <a className="nav-link" onClick={openNotifications}>
            <Bell size={18} /> Notifications
          </a>
          <a className="nav-link" onClick={() => setDrawerOpen(false)}>
            <UserCircle size={18} /> Profile
          </a>
        </nav>
        <div className="sidebar-foot">
          <StatusPill tone="positive">{user.role}</StatusPill>
          <span>{user.name}</span>
          <button className="sign-out" onClick={() => dispatch(signedOut())}>
            Sign out
          </button>
        </div>
      </aside>
      {drawerOpen && (
        <button
          className="drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        />
      )}
      {toast && (
        <Toast tone={toast.tone} onClose={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}
      <nav className="reference-bottom-nav" aria-label="Primary navigation">
        <a className="reference-bottom-nav__active">
          <Home size={19} />
          <span>Home</span>
        </a>
        <a>
          <Search size={19} />
          <span>Search</span>
        </a>
        <a onClick={openCart}>
          <ShoppingBag size={19} />
          <span>
            Cart{" "}
            {Object.values(quoteItems).reduce(
              (total, quantity) => total + quantity,
              0,
            ) > 0
              ? `(${Object.values(quoteItems).reduce((total, quantity) => total + quantity, 0)})`
              : ""}
          </span>
        </a>
        <a onClick={openNotifications}>
          <Bell size={19} />
          <span>Alerts</span>
        </a>
        <a>
          <UserCircle size={19} />
          <span>Profile</span>
        </a>
      </nav>
      <main className="workspace">
        <header className="reference-header">
          <div className="reference-header-row">
            <div className="location-prompt">
              <MapPin size={25} />
              <div>
                <strong>Location</strong>
                <span>California, USA</span>
              </div>
            </div>
            <div className="header-actions" ref={notificationsRef}>
              <button className="header-avatar" aria-label="Open profile">
                <img src="/reference/logo.png" alt="Profile" />
              </button>
              <button
                className="header-icon"
                aria-label="Open notifications"
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={19} />
                {notifications.some((notification) => !notification.readAt) && (
                  <span className="notification-dot" />
                )}
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <div className="panel-heading">
                    <strong>Notifications</strong>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notifications"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="muted">No new product notifications.</p>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <button
                        className={`notification-item ${notification.readAt ? "notification-item--read" : ""}`}
                        key={notification.id}
                        onClick={() => {
                          void notificationService
                            .markRead(notification.id)
                            .then(() =>
                              setNotifications((current) =>
                                current.map((item) =>
                                  item.id === notification.id
                                    ? {
                                        ...item,
                                        readAt: new Date().toISOString(),
                                      }
                                    : item,
                                ),
                              ),
                            );
                        }}
                      >
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <button
                className="mobile-menu-button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={21} />
              </button>
            </div>
          </div>
          <label className="reference-search">
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
            />
          </label>
        </header>
        <header className="topbar">
          <div>
            <span className="eyebrow">RESELLER CONTROL ROOM</span>
            <h1>Good to see you, {user.name.split(" ")[0]}.</h1>
          </div>
          <div className="topbar-status">
            <span className="status-dot" /> Catalog live
          </div>
        </header>
        <div className="workspace-grid">
          <section className="content-column">
            <Panel className="hero-panel">
              <div>
                <span className="eyebrow eyebrow--gold">
                  YOUR CUSTOMER OFFER
                </span>
                <h2>Make every product work harder.</h2>
                <p>
                  Set your default margin once, then preview polished customer
                  pricing before an order exists.
                </p>
                <Button onClick={saveMargin}>
                  Save margin <ArrowRight size={17} />
                </Button>
              </div>
              <div className="hero-icon">
                <Percent size={42} />
              </div>
            </Panel>
            {user.role === "ADMIN" && (
              <Panel className="admin-product-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">ADMIN TOOL</span>
                    <h2>
                      {editingProductId
                        ? "Update catalog product"
                        : "Add catalog product"}
                    </h2>
                  </div>
                  <Package size={20} />
                </div>
                <p className="muted">
                  Create a product for resellers. The stored price is the
                  reseller cost price.
                </p>
                <form className="product-form" onSubmit={createProduct}>
                  <div className="product-form-grid">
                    <Field
                      id="product-sku"
                      label="SKU"
                      value={productForm.sku}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          sku: event.target.value,
                        })
                      }
                      required
                    />
                    <Field
                      id="product-name"
                      label="Name"
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          name: event.target.value,
                        })
                      }
                      required
                    />
                    <Field
                      id="product-slug"
                      label="Slug"
                      value={productForm.slug}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          slug: event.target.value,
                        })
                      }
                      required
                    />
                    <Field
                      id="product-category"
                      label="Category"
                      value={productForm.category}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          category: event.target.value,
                        })
                      }
                      required
                    />
                    <Field
                      id="product-price"
                      label="Cost price (INR)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={productForm.price}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          price: event.target.value,
                        })
                      }
                      required
                    />
                    <Field
                      id="product-image"
                      label="Image URL"
                      type="url"
                      value={productForm.imageUrl}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          imageUrl: event.target.value,
                        })
                      }
                    />
                  </div>
                  <label className="ui-field">
                    <span>Description</span>
                    <textarea
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          description: event.target.value,
                        })
                      }
                      rows={3}
                      required
                    />
                  </label>
                  <div className="product-form-actions">
                    <Button type="submit" disabled={productSaving}>
                      {productSaving
                        ? "Saving product..."
                        : editingProductId
                          ? "Update product"
                          : "Add product"}{" "}
                      <Plus size={17} />
                    </Button>
                    {editingProductId && (
                      <Button
                        type="button"
                        variant="quiet"
                        onClick={() => {
                          setEditingProductId(null);
                          setProductForm({
                            sku: "",
                            name: "",
                            slug: "",
                            description: "",
                            category: "",
                            price: "",
                            imageUrl: "",
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Panel>
            )}
            <div
              className="reference-collections"
              aria-label="Corporate gifting collections"
            >
              {referenceCollections.map((collection) => (
                <article
                  className="reference-collection"
                  key={collection.title}
                >
                  <img src={collection.image} alt="" />
                  <div>
                    <span className="eyebrow">
                      TOTAL GIFT SOLUTIONS REFERENCE
                    </span>
                    <strong>{collection.title}</strong>
                  </div>
                </article>
              ))}
            </div>
            <div className="section-heading">
              <div>
                <span className="eyebrow">CATALOG</span>
                <h2>Products for your next order</h2>
              </div>
            </div>
            {loading ? (
              <div className="empty-state">Loading catalog...</div>
            ) : (
              <div className="product-grid">
                {products.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div className="product-image">
                      <img
                        src={
                          product.imageUrl ??
                          referenceImageByCategory[product.category] ??
                          "/reference/catalog/corporate-gifting.png"
                        }
                        alt=""
                      />
                    </div>
                    <div className="product-card-body">
                      <div className="product-meta">
                        <span>{product.category}</span>
                        <StatusPill
                          tone={product.isAvailable ? "positive" : "warning"}
                        >
                          {product.isAvailable ? "Available" : "Unavailable"}
                        </StatusPill>
                      </div>
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>
                      <div className="product-footer">
                        <strong>
                          {product.currency} {product.price}
                        </strong>
                        <button
                          className="product-add-button"
                          aria-label={`Add ${product.name} to quote`}
                          onClick={() => addToQuote(product.id)}
                        >
                          <Plus size={17} />
                        </button>
                        {user.role === "ADMIN" && (
                          <div className="admin-product-actions">
                            <button
                              aria-label={`Edit ${product.name}`}
                              onClick={() => editProduct(product)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              aria-label={`Delete ${product.name}`}
                              onClick={() => deleteProduct(product)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <aside className="margin-column">
            <Panel>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">PRICING RULE</span>
                  <h2>Default margin</h2>
                </div>
                <Percent size={20} />
              </div>
              <p className="muted">
                Applied to your customer quote previews. You can override it for
                a single quote.
              </p>
              <div className="margin-input">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={margin}
                  onChange={(event) => setMargin(Number(event.target.value))}
                />
                <span>%</span>
              </div>
              <Button className="full-width" onClick={saveMargin}>
                Update margin
              </Button>
            </Panel>
            <Panel className="insight-panel">
              <span className="eyebrow">NEXT STEP</span>
              <h2>Build a customer quote</h2>
              <p>
                Select catalog items and preview a clear customer price without
                exposing your reseller cost.
              </p>
              <div className="insight-line">
                <Sparkles size={17} /> Quote preview is not an order
              </div>
            </Panel>
            <Panel className="quote-panel" ref={quotePanelRef}>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">QUOTE PREVIEW</span>
                  <h2>
                    <ShoppingBag size={18} /> Customer pricing
                  </h2>
                </div>
                <StatusPill>
                  {Object.values(quoteItems).reduce(
                    (total, quantity) => total + quantity,
                    0,
                  )}{" "}
                  items
                </StatusPill>
              </div>
              {Object.entries(quoteItems).length === 0 ? (
                <p className="muted">
                  Add catalog products here to calculate a customer-ready offer.
                </p>
              ) : (
                <>
                  <div className="quote-lines">
                    {Object.entries(quoteItems).map(([productId, quantity]) => {
                      const product = products.find(
                        (item) => item.id === productId,
                      );
                      if (!product) return null;
                      return (
                        <div className="quote-line" key={productId}>
                          <div>
                            <strong>{product.name}</strong>
                            <span>
                              {product.currency} {product.price} cost
                            </span>
                          </div>
                          <div className="quantity-control">
                            <button
                              onClick={() => changeQuantity(productId, -1)}
                              aria-label={`Remove one ${product.name}`}
                            >
                              <Minus size={14} />
                            </button>
                            <span>{quantity}</span>
                            <button
                              onClick={() => changeQuantity(productId, 1)}
                              aria-label={`Add one ${product.name}`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    className="full-width"
                    onClick={previewQuote}
                    disabled={quoteLoading}
                  >
                    {quoteLoading
                      ? "Calculating..."
                      : "Preview customer pricing"}{" "}
                    <ArrowRight size={16} />
                  </Button>
                  {quote && (
                    <div className="quote-result">
                      <div>
                        <span>Margin applied</span>
                        <strong>{quote.marginPercent}%</strong>
                      </div>
                      <div>
                        <span>Customer total</span>
                        <strong>
                          {quote.currency} {quote.total.toFixed(2)}
                        </strong>
                      </div>
                      <Button
                        className="full-width"
                        variant="secondary"
                        onClick={placeOrder}
                        disabled={orderLoading}
                      >
                        {orderLoading ? "Placing order..." : "Place bulk order"}{" "}
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Panel>
            <Panel className="orders-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">ORDER HISTORY</span>
                  <h2>Recent orders</h2>
                </div>
                <Package size={18} />
              </div>
              {orderLoading && !orders.length ? (
                <p className="muted">Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className="muted">Your placed orders will appear here.</p>
              ) : (
                <div className="order-list">
                  {orders.slice(0, 5).map((order) => (
                    <div className="order-row" key={order.id}>
                      <div>
                        <strong>{order.orderNumber}</strong>
                        <span>
                          {order.items.reduce(
                            (total, item) => total + item.quantity,
                            0,
                          )}{" "}
                          items · {order.currency} {order.total.toFixed(2)}
                        </span>
                      </div>
                      <StatusPill
                        tone={
                          order.status === "CONFIRMED"
                            ? "positive"
                            : order.status === "CANCELLED"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {order.status}
                      </StatusPill>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
