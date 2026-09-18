import { Link } from "react-router-dom";
import { referenceImageByCategory } from "../constants";
import type { Product } from "../types/api";

interface ProductCardProps {
  product: Product;
  isAdmin: boolean;
  onAdd?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductCard({ product, isAdmin, onAdd, onEdit, onDelete }: ProductCardProps) {
  const image =
    product.imageUrl ??
    referenceImageByCategory[product.category] ??
    "/reference/catalog/corporate-gifting.png";

  return (
    <div className="bg-white rounded-4 shadow-sm overflow-hidden osahan-card-2 h-100 d-flex flex-column">
      <Link to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
        <img src={image} className="card-img-top img-fluid product-thumb" alt="" />
      </Link>
      <div className="p-3 d-flex flex-column flex-grow-1">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <p className="small text-primary fw-semibold m-0 text-truncate">{product.category}</p>
          {!product.isAvailable && (
            <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">Out</span>
          )}
        </div>
        <Link to={`/products/${product.id}`} className="text-decoration-none text-dark">
          <h5 className="mb-0 h6 fw-bold pt-1 text-truncate">{product.name}</h5>
        </Link>
        <p className="text-muted small mb-3 mt-1 lh-sm">{product.description}</p>
        <div className="d-flex align-items-center justify-content-between mt-auto">
          <h4 className="mb-0 fw-bold text-dark">
            <small className="text-muted fw-normal me-1">{product.currency}</small>
            {product.price}
          </h4>
          <div className="d-flex align-items-center gap-1">
            {isAdmin && onEdit && (
              <button
                className="btn btn-light btn-sm rounded-pill shadow-sm"
                aria-label={`Edit ${product.name}`}
                onClick={() => onEdit(product)}
              >
                <i className="mdi mdi-pencil-outline" />
              </button>
            )}
            {isAdmin && onDelete && (
              <button
                className="btn btn-light btn-sm rounded-pill shadow-sm"
                aria-label={`Delete ${product.name}`}
                onClick={() => onDelete(product)}
              >
                <i className="mdi mdi-trash-can-outline" />
              </button>
            )}
            {onAdd && (
              <button
                className="btn btn-primary btn-sm rounded-pill"
                aria-label={`Add ${product.name} to quote`}
                onClick={() => onAdd(product)}
              >
                <i className="mdi mdi-plus" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
