import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ConfirmModal, Field, Loader } from "../components/ui";
import { ProductCard } from "../components/ProductCard";
import { productService } from "../services/product.service";
import { apiErrorMessage, referenceCollections, slugify } from "../constants";
import { itemAdded } from "../store/cart.slice";
import { toastShown } from "../store/ui.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { Product } from "../types/api";

const emptyProductForm = {
  sku: "",
  name: "",
  slug: "",
  description: "",
  category: "",
  price: "",
  imageUrl: "",
};

export function HomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productSaving, setProductSaving] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const adminPanelRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === "ADMIN";

  function loadProducts() {
    setLoading(true);
    return productService
      .list({ pageSize: 12 })
      .then((response) => setProducts(response.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function addToCart(product: Product) {
    dispatch(itemAdded(product));
    dispatch(toastShown({ message: `${product.name} added to cart.`, tone: "success" }));
  }

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductSaving(true);
    const payload = {
      ...productForm,
      slug: slugify(productForm.slug || productForm.name),
      imageUrl: productForm.imageUrl || null,
    };
    try {
      if (editingProductId) {
        await productService.update(editingProductId, payload);
      } else {
        await productService.create({
          ...payload,
          price: Number(payload.price),
          isAvailable: true,
          currency: "INR",
        });
      }
      setProductForm(emptyProductForm);
      setSlugTouched(false);
      setFormOpen(false);
      await loadProducts();
      dispatch(
        toastShown({
          message: `Product ${editingProductId ? "updated" : "added"} successfully.`,
          tone: "success",
        }),
      );
      setEditingProductId(null);
    } catch (error) {
      dispatch(
        toastShown({
          message: apiErrorMessage(
            error,
            `Product could not be ${editingProductId ? "updated" : "added"}. Check the required fields.`,
          ),
          tone: "error",
        }),
      );
    } finally {
      setProductSaving(false);
    }
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setSlugTouched(true);
    setFormOpen(true);
    setProductForm({
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl ?? "",
    });
    adminPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await productService.remove(pendingDelete.id);
      setProducts((current) => current.filter((item) => item.id !== pendingDelete.id));
      dispatch(toastShown({ message: "Product deleted successfully.", tone: "success" }));
      setPendingDelete(null);
    } catch (error) {
      dispatch(
        toastShown({
          message: apiErrorMessage(error, "Product could not be deleted."),
          tone: "error",
        }),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Hero, styled after the template's offer banner. */}
      <div className="bg-primary text-white rounded-4 p-4 position-relative shadow overflow-hidden mb-4">
        <h2 className="fw-bold mb-1">{isAdmin ? "Catalog" : "Your margin"}</h2>
        <h5 className="mb-1">{isAdmin ? "Control room" : "Your customer price"}</h5>
        <p className="mb-3 text-white-50 small">
          {isAdmin
            ? "Publish a product and every active reseller is notified instantly."
            : "Set it once, then preview customer pricing before an order exists."}
        </p>
        <button
          className="btn btn-sm btn-dark rounded-pill small"
          onClick={() => navigate(isAdmin ? "/orders" : "/profile")}
        >
          {isAdmin ? "REVIEW ORDERS" : "SET MARGIN"} <i className="bi bi-arrow-right" />
        </button>
      </div>

      {/* Category shortcuts, mirroring the template's ingredient row. */}
      <div className="row g-2 mb-4">
        {referenceCollections.map((collection) => (
          <div className="col" key={collection.title}>
            <div className="bg-white shadow-sm rounded-4 text-center p-2 position-relative h-100">
              <img src={collection.image} alt="" className="img-fluid rounded-3 mb-1" />
              <p className="little-text m-0 text-dark fw-semibold">{collection.title}</p>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div ref={adminPanelRef} className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <p className="small text-primary fw-semibold m-0">ADMIN TOOL</p>
              <h5 className="fw-bold mb-0">
                {editingProductId ? "Update product" : "Add a product"}
              </h5>
            </div>
            <button
              className={`btn btn-sm rounded-pill ${formOpen ? "btn-light shadow-sm" : "btn-primary"}`}
              onClick={() => {
                setFormOpen(!formOpen);
                if (formOpen) {
                  setEditingProductId(null);
                  setProductForm(emptyProductForm);
                  setSlugTouched(false);
                }
              }}
            >
              {formOpen ? "Close" : "New product"}{" "}
              <i className={`mdi mdi-${formOpen ? "close" : "plus"}`} />
            </button>
          </div>

          {formOpen && (
            <div className="bg-white rounded-4 shadow-sm p-3">
              <form onSubmit={submitProduct}>
                <Field
                  id="product-name"
                  label="Name"
                  icon="tag-outline"
                  placeholder="Product name"
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: slugTouched ? current.slug : slugify(event.target.value),
                    }))
                  }
                  required
                />
                <Field
                  id="product-sku"
                  label="SKU"
                  icon="barcode"
                  placeholder="SKU, e.g. UG-BAG-001"
                  value={productForm.sku}
                  onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })}
                  required
                />
                <Field
                  id="product-slug"
                  label="Slug"
                  icon="link-variant"
                  placeholder="Slug, e.g. urban-everyday-backpack"
                  value={productForm.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setProductForm((current) => ({ ...current, slug: event.target.value }));
                  }}
                  onBlur={(event) =>
                    setProductForm((current) => ({ ...current, slug: slugify(event.target.value) }))
                  }
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  title="Lowercase letters, numbers, and single hyphens"
                  required
                />
                <Field
                  id="product-category"
                  label="Category"
                  icon="shape-outline"
                  placeholder="Category, e.g. Bags"
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({ ...productForm, category: event.target.value })
                  }
                  required
                />
                <Field
                  id="product-price"
                  label="Cost price (INR)"
                  icon="currency-inr"
                  placeholder="Cost price in INR"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                  required
                />
                <Field
                  id="product-image"
                  label="Image URL"
                  icon="image-outline"
                  placeholder="Image URL (optional)"
                  type="url"
                  value={productForm.imageUrl}
                  onChange={(event) =>
                    setProductForm({ ...productForm, imageUrl: event.target.value })
                  }
                />
                <div className="input-group mb-3 bg-white rounded-4 shadow-sm p-1">
                  <span className="input-group-text bg-white border-0 ps-3 align-items-start pt-3">
                    <i className="mdi mdi-text fs-4 text-primary" />
                  </span>
                  <textarea
                      id="product-description"
                      aria-label="Description"
                      className="form-control border-0 px-2 py-3"
                      placeholder="Description, e.g. water resistant commuter backpack"
                      rows={3}
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm({ ...productForm, description: event.target.value })
                      }
                      required
                  />
                </div>
                <Button className="w-100" type="submit" disabled={productSaving}>
                  {productSaving
                    ? "Saving..."
                    : editingProductId
                      ? "Update product"
                      : "Add product"}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <p className="small text-primary fw-semibold m-0">CATALOG</p>
          <h5 className="fw-bold mb-0">Products for your next order</h5>
        </div>
        <button className="btn btn-light btn-sm rounded-pill shadow-sm" onClick={() => navigate("/search")}>
          View all
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : products.length === 0 ? (
        <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
          The catalog is empty.
        </div>
      ) : (
        <div className="row g-3">
          {products.map((product) => (
            <div className="col-6" key={product.id}>
              <ProductCard
                product={product}
                isAdmin={isAdmin}
                onAdd={isAdmin ? undefined : addToCart}
                onEdit={isAdmin ? editProduct : undefined}
                onDelete={isAdmin ? setPendingDelete : undefined}
              />
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        icon="trash-can-outline"
        title="Delete this product?"
        message={`${pendingDelete?.name ?? ""} will be removed from the catalog for every reseller. This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
