import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader } from "../components/ui";
import { ProductCard } from "../components/ProductCard";
import { productService } from "../services/product.service";
import { itemAdded } from "../store/cart.slice";
import { toastShown } from "../store/ui.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { Product } from "../types/api";

/** The search field lives in the layout header, so this page renders results for `?q=` only. */
export function SearchPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    let active = true;
    setLoading(true);
    void productService
      .list({ search: query || undefined, pageSize: 24 })
      .then((response) => {
        if (active) setProducts(response.data);
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <p className="small text-primary fw-semibold m-0">CATALOG SEARCH</p>
          <h5 className="fw-bold mb-0">{query ? `Results for “${query}”` : "Browse the catalog"}</h5>
        </div>
        {!loading && <span className="badge rounded-pill bg-white text-secondary shadow-sm px-3 py-2">{products.length}</span>}
      </div>

      {loading ? (
        <Loader />
      ) : products.length === 0 ? (
        <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
          <i className="mdi mdi-magnify-close fs-1 text-primary d-block mb-2" />
          {query
            ? `No products match “${query}”. Try a different name, category, or SKU.`
            : "Type in the search bar above to filter the catalog."}
        </div>
      ) : (
        <div className="row g-3">
          {products.map((product) => (
            <div className="col-6" key={product.id}>
              <ProductCard
                product={product}
                isAdmin={isAdmin}
                onAdd={
                  isAdmin
                    ? undefined
                    : (item) => {
                        dispatch(itemAdded(item));
                        dispatch(
                          toastShown({ message: `${item.name} added to cart.`, tone: "success" }),
                        );
                      }
                }
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
