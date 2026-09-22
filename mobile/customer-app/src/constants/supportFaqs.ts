import { FAQItem } from '../types/support';

export const SUPPORT_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Orders & Delivery',
    question: 'How can I track my order in real-time?',
    answer: 'Navigate to "My Account" > "My Orders", tap on your order, and view the step-by-step Tracking Timeline. You will see live updates from order placement through dispatch, transit, and delivery.',
  },
  {
    id: 'faq-2',
    category: 'Orders & Delivery',
    question: 'Can I change my delivery address after placing an order?',
    answer: 'If your order is still in "Pending" or "Confirmed" status and has not yet been dispatched, you can contact our support team immediately or cancel the order and place a new one with the correct address.',
  },
  {
    id: 'faq-3',
    category: 'Orders & Delivery',
    question: 'What should I do if my package shows delivered but I haven\'t received it?',
    answer: 'First, check with household members, neighbors, or building security. If you still cannot locate it, please raise a support ticket under "Orders & Delivery" within 48 hours and we will investigate with our courier partner.',
  },
  {
    id: 'faq-4',
    category: 'Returns & Refunds',
    question: 'How do I initiate a return or replacement?',
    answer: 'Open your delivered order in "My Orders" and tap "Return or Replace Items". Select the reason, upload photo/video proof of the item, and submit. Once approved, our courier will pick up the package from your doorstep.',
  },
  {
    id: 'faq-5',
    category: 'Returns & Refunds',
    question: 'How long does it take to get my refund?',
    answer: 'Once the returned item is picked up and passes quality inspection at the fulfillment hub, refunds are processed within 3 to 5 business days to your original payment method, or credited to your store balance.',
  },
  {
    id: 'faq-6',
    category: 'Returns & Refunds',
    question: 'Can I return only one item from a multi-item order?',
    answer: 'Yes! Our returns system allows you to select specific individual items, specify the quantity, and choose whether you want a replacement or a full refund for each item.',
  },
  {
    id: 'faq-7',
    category: 'Payment & Billing',
    question: 'My money was deducted but the order was not placed. What should I do?',
    answer: 'If your transaction failed at the payment gateway, any deducted amount will be automatically reversed by your bank within 24 to 48 banking hours. If not reflected, raise a ticket with your transaction reference number.',
  },
  {
    id: 'faq-8',
    category: 'Payment & Billing',
    question: 'How does Cash on Delivery (COD) work?',
    answer: 'For eligible orders, select "Cash on Delivery" at checkout. Depending on platform policy, a minor security advance may be requested, and the remaining balance is paid directly to the delivery executive upon package arrival.',
  },
  {
    id: 'faq-9',
    category: 'Payment & Billing',
    question: 'Where can I download my official GST / Tax Invoice?',
    answer: 'Tap on any confirmed or delivered order in "My Orders" and select "View & Download Tax Invoice". You can view the digital receipt, download a high-resolution vector PDF, or share it via WhatsApp and email.',
  },
  {
    id: 'faq-10',
    category: 'Account & Security',
    question: 'How do I change my password or secure my account?',
    answer: 'Go to "My Account" > "Account Security" to update your password. You can also view all active device sessions and log out of other devices in one tap.',
  },
];

export const SUPPORT_CONTACT_INFO = {
  phone: '+91 1800 123 4567',
  displayPhone: '1800-123-4567 (Toll Free)',
  email: 'support@marketplace.com',
  workingHours: 'Mon - Sat: 9:00 AM - 8:00 PM IST',
  responseTime: 'Average reply time: under 2 hours',
};
