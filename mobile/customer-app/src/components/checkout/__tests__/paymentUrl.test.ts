import { resolvePaymentIntentUrl } from '../../../utils/paymentIntent';

describe('resolvePaymentIntentUrl', () => {
  it('returns empty string when given empty or null URL', () => {
    expect(resolvePaymentIntentUrl('')).toBe('');
    expect(resolvePaymentIntentUrl(undefined as any)).toBe('');
  });

  it('converts standard Android intent:// UPI URLs to upi:// URLs', () => {
    const rawIntentUrl =
      'intent://pay?pa=rzp@icici&pn=UChooseMe&am=499.00&cu=INR#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end';
    const resolved = resolvePaymentIntentUrl(rawIntentUrl);

    expect(resolved).toBe('upi://pay?pa=rzp@icici&pn=UChooseMe&am=499.00&cu=INR');
  });

  it('extracts embedded data parameter if present in intent: URL', () => {
    const intentWithData =
      'intent:#Intent;action=android.intent.action.VIEW;data=upi%3A%2F%2Fpay%3Fpa%3Dstore%40upi%26am%3D1200;package=com.phonepe.app;end';
    const resolved = resolvePaymentIntentUrl(intentWithData);

    expect(resolved).toBe('upi://pay?pa=store@upi&am=1200');
  });

  it('preserves native UPI app deep link URLs unmodified', () => {
    const upiUrl = 'upi://pay?pa=merchant@upi&pn=Store&am=100';
    const gpayUrl = 'gpay://upi/pay?pa=merchant@upi';
    const phonepeUrl = 'phonepe://pay?pa=merchant@upi';

    expect(resolvePaymentIntentUrl(upiUrl)).toBe(upiUrl);
    expect(resolvePaymentIntentUrl(gpayUrl)).toBe(gpayUrl);
    expect(resolvePaymentIntentUrl(phonepeUrl)).toBe(phonepeUrl);
  });

  it('preserves standard HTTPS URLs without intent prefixes', () => {
    const httpsUrl = 'https://checkout.razorpay.com/v1/checkout.js';
    expect(resolvePaymentIntentUrl(httpsUrl)).toBe(httpsUrl);
  });
});
