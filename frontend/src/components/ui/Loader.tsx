import { BrandMark } from "./BrandMark";

/** The template's in-page spinner: `spinner-border fs-1` with a visually hidden label. */
export function Loader({ label = "Loading...", className = "py-5" }: { label?: string; className?: string }) {
  return (
    <div className={`col-12 text-center align-items-center ${className}`}>
      <div className="spinner-border fs-1 text-primary" role="status">
        <span className="visually-hidden">{label}</span>
      </div>
    </div>
  );
}

/**
 * The template's splash screen (index.html): a full-height primary panel with the logo
 * in a white pill, the app name, and a white spinner. Used while the session is restored.
 */
export function SplashLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <section className="bg-primary vh-100 d-flex align-items-center">
      <div className="container">
        <div className="row">
          <div className="col-12 text-center text-white align-items-center">
            <div className="py-5 my-5 px-5">
              <BrandMark size={140} tone="light" className="border" />
              <h1 className="display-5 my-5 fw-bold">Urban Gear</h1>
              <div className="col-12 text-center text-white align-items-center mb-5">
                <div className="spinner-border fs-1" role="status">
                  <span className="visually-hidden">{label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
