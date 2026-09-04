/**
 * Helper to open official Razorpay Checkout modal or trigger mock simulation handler.
 * Pure logic module — no UI, no JSX, no design tokens needed here.
 */
export function openRazorpayCheckout({
  config,
  onPaymentSuccess,
  onPaymentFailure,
  onModalDismiss
}) {
  if (typeof window !== 'undefined' && window.Razorpay) {
    try {
      const options = {
        ...config,
        handler: function (response) {
          console.log('[Razorpay Checkout] Success handler response:', response);
          if (onPaymentSuccess) {
            onPaymentSuccess(response);
          }
        },
        modal: {
          ondismiss: function () {
            console.log('[Razorpay Checkout] Modal dismissed by user');
            if (onModalDismiss) {
              onModalDismiss();
            }
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on('payment.failed', function (response) {
        console.log('[Razorpay Checkout] Payment failed event:', response);
        if (onPaymentFailure) {
          onPaymentFailure(response);
        }
      });

      rzpInstance.open();
      return rzpInstance;
    } catch (err) {
      console.warn('Error opening Razorpay checkout window:', err);
    }
  } else {
    console.warn('Razorpay checkout.js script not detected in window.');
  }
}