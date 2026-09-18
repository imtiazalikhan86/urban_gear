import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Loader } from "../components/ui";
import { productService } from "../services/product.service";
import { referenceImageByCategory } from "../constants";
import { itemAdded, selectCartCount } from "../store/cart.slice";
import { toastShown } from "../store/ui.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { Product } from "../types/api";

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const cartCount = useAppSelector(selectCartCount);
  const isAdmin = useAppSelector((state) => state.auth.user?.role) === "ADMIN";
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setMissing(false);
    void productService
      .get(id)
      .then((response) => {
        if (active) setProduct(response.data);
      })
      .catch(() => {
        if (active) setMissing(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Loader />
    );
  }

  if (missing || !product) {
    return (
      <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
        <i className="mdi mdi-package-variant-closed-remove fs-1 text-primary d-block mb-2" />
        This product is no longer in the catalog.
        <Link className="btn btn-primary rounded-4 w-100 mt-3" to="/">
          Back to the catalog
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-4 shadow-sm overflow-hidden mb-3">
        <img
          src={
            product.imageUrl ??
            referenceImageByCategory[product.category] ??
            "/reference/catalog/corporate-gifting.png"
          }
          className="img-fluid w-100"
          style={{ height: 220, objectFit: "cover" }}
          alt=""
        />
        <div className="p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="badge rounded-pill bg-primary px-3 py-2">{product.category}</span>
            <span
              className={`badge rounded-pill px-3 py-2 ${product.isAvailable ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning-emphasis"}`}
            >
              {product.isAvailable ? "Available" : "Unavailable"}
            </span>
          </div>
          <h5 className="fw-bold mb-1">{product.name}</h5>
          <p className="text-muted small">{product.description}</p>

          <div className="row g-2 border-top pt-3">
            <div className="col-6">
              <p className="text-muted little-text text-uppercase mb-1">SKU</p>
              <p className="fw-bold mb-0 small">{product.sku}</p>
            </div>
            <div className="col-6 text-end">
              <p className="text-muted little-text text-uppercase mb-1">Your cost price</p>
              <h4 className="fw-bold mb-0 text-primary">
                <small className="text-muted fw-normal me-1">{product.currency}</small>
                {product.price}
              </h4>
            </div>
          </div>

          {!isAdmin && (
            <div className="vstack gap-2 mt-3">
              <Button
                className="w-100"
                disabled={!product.isAvailable}
                onClick={() => {
                  dispatch(itemAdded(product));
                  dispatch(toastShown({ message: `${product.name} added to cart.`, tone: "success" }));
                }}
              >
                {product.isAvailable ? "Add to cart" : "Currently unavailable"}
                <span className="mdi mdi-plus ms-2" />
              </Button>
              {cartCount > 0 && (
                <Link className="btn btn-light shadow-sm rounded-4 w-100" to="/cart">
                  <span className="mdi mdi-cart-outline me-2" /> Go to cart ({cartCount})
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-muted little-text text-center">
        {isAdmin
          ? "This is the reseller cost price stored in the catalog."
          : "This price is your reseller cost. Preview customer pricing from the cart."}
      </p>
    </>
  );
}
