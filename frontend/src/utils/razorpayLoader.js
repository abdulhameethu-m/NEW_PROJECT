export function ensureRazorpay() {
  if (typeof window !== "undefined" && typeof window.Razorpay === "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const resolveWhenReady = () => {
      if (typeof window !== "undefined" && typeof window.Razorpay === "function") {
        resolve();
        return true;
      }
      return false;
    };

    if (resolveWhenReady()) return;

    const existing = document.querySelector(
      'script[data-razorpay-sdk="true"], script[src*="checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      const timeoutId = setTimeout(() => {
        reject(new Error("Razorpay SDK loading timeout. Please check your internet connection."));
      }, 30000);
      const intervalId = window.setInterval(() => {
        if (resolveWhenReady()) {
          clearTimeout(timeoutId);
          window.clearInterval(intervalId);
        }
      }, 250);
      existing.addEventListener(
        "load",
        () => {
          clearTimeout(timeoutId);
          window.clearInterval(intervalId);
          resolve();
        },
        { once: true }
      );
      existing.addEventListener(
        "error",
        () => {
          clearTimeout(timeoutId);
          window.clearInterval(intervalId);
          reject(new Error("Failed to load Razorpay checkout."));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpaySdk = "true";

    const timeoutId = setTimeout(() => {
      reject(new Error("Razorpay SDK loading timeout. Please check your internet connection and try again."));
    }, 30000);

    script.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error("Failed to load Razorpay checkout."));
    };
    document.body.appendChild(script);
  });
}
