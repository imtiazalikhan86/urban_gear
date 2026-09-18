import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import { quoteService } from "../services/quote.service";
import { orderService } from "../services/order.service";
import {
  cartCleared,
  quantityChanged,
  quotePreviewed,
  selectCartCount,
  selectCartLines,
} from "../store/cart.slice";
import { toastShown } from "../store/ui.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function CartPage() {
  const dispatch = useAppDispatch();
  const lines = useAppSelector(selectCartLines);
  const count = useAppSelector(selectCartCount);
  const quote = useAppSelector((state) => state.cart.quote);
  const margin = useAppSelector((state) => state.auth.user?.marginPercent ?? 15);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  const items = lines.map((line) => ({ productId: line.product.id, quantity: line.quantity }));

  async function previewQuote() {
    setQuoteLoading(true);
    try {
      const response = await quoteService.preview(items, margin);
      dispatch(quotePreviewed(response.data));
    } catch {
      dispatch(toastShown({ message: "Quote preview could not be generated.", tone: "error" }));
    } finally {
      setQuoteLoading(false);
    }
  }

  async function placeOrder() {
    if (!quote) return;
    setOrderLoading(true);
    try {
      const response = await orderService.create(items, quote.marginPercent);
      dispatch(cartCleared());
      dispatch(
        toastShown({
          message: `${response.data.orderNumber} created successfully.`,
          tone: "success",
        }),
      );
    } catch {
      dispatch(
        toastShown({
          message: "Order could not be created. Check product availability.",
          tone: "error",
        }),
      );
    } finally {
      setOrderLoading(false);
    }
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <p className="small text-primary fw-semibold m-0">QUOTE PREVIEW</p>
          <h5 className="fw-bold mb-0">Customer pricing</h5>
        </div>
        <span className="badge rounded-pill bg-white text-secondary shadow-sm px-3 py-2">
          {count} items
        </span>
      </div>

      {lines.length === 0 ? (
        <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
          <i className="mdi mdi-cart-outline fs-1 text-primary d-block mb-2" />
          Your cart is empty. Add catalog products to calculate a customer-ready offer.
          <Link className="btn btn-primary rounded-4 w-100 mt-3" to="/">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <>
          {lines.map(({ product, quantity }) => (
            <div className="bg-white rounded-4 mb-3 shadow-sm" key={product.id}>
              <div className="d-flex p-3 align-items-center">
                <div className="lh-sm me-auto">
                  <p className="mb-1 fw-bold">{product.name}</p>
                  <p className="mb-0 text-secondary small">
                    {product.currency} {product.price} cost
                  </p>
                </div>
                <div className="quantity-compo d-flex align-items-center gap-2">
                  <button
                    className="btn btn-light shadow-sm rounded-pill"
                    onClick={() => dispatch(quantityChanged({ productId: product.id, change: -1 }))}
                    aria-label={`Remove one ${product.name}`}
                  >
                    <i className="mdi mdi-minus" />
                  </button>
                  <span className="fw-bold">{quantity}</span>
                  <button
                    className="btn btn-primary rounded-pill"
                    onClick={() => dispatch(quantityChanged({ productId: product.id, change: 1 }))}
                    aria-label={`Add one ${product.name}`}
                  >
                    <i className="mdi mdi-plus" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-white rounded-4 shadow-sm p-3 mb-3">
            <Button className="w-100" onClick={previewQuote} disabled={quoteLoading}>
              {quoteLoading ? "Calculating..." : "Preview customer pricing"}
              <i className="bi bi-arrow-right ms-2" />
            </Button>

            {quote && (
              <div className="mt-3 border-top pt-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary small">Margin applied</span>
                  <span className="fw-bold">{quote.marginPercent}%</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-secondary small">Customer total</span>
                  <h5 className="fw-bold mb-0 text-primary">
                    {quote.currency} {quote.total.toFixed(2)}
                  </h5>
                </div>
                <Button
                  className="w-100"
                  variant="secondary"
                  onClick={placeOrder}
                  disabled={orderLoading}
                >
                  {orderLoading ? "Placing order..." : "Place bulk order"}
                  <i className="bi bi-arrow-right ms-2" />
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-4 shadow-sm p-3 d-flex gap-2 align-items-start">
            <i className="mdi mdi-information-outline text-primary fs-5" />
            <p className="small text-muted mb-0">
              A preview is not an order. Customer pricing comes from your margin; your reseller cost
              is never shown to the customer.
            </p>
          </div>
        </>
      )}
    </>
  );
}
