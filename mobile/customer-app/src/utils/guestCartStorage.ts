import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cart, CartItem, CartMutationResponse } from '../types/cart';
import { apiClient } from '../api/client';

const GUEST_CART_STORAGE_KEY = '@uchooz_guest_cart';

function createEmptyCart(): Cart {
  return {
    _id: 'guest_cart',
    userId: 'guest',
    items: [],
    totalAmount: 0,
    currency: 'INR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
}

function normalizeKey(productId: string, variantId?: string): string {
  return `${String(productId)}::${String(variantId || '')}`;
}

export const guestCartStorage = {
  /**
   * Retrieve guest cart from local storage.
   */
  async getCart(): Promise<Cart> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_CART_STORAGE_KEY);
      if (!raw) return createEmptyCart();
      const cart = JSON.parse(raw) as Cart;
      // Recompute total to be absolutely sure
      cart.totalAmount = calculateTotal(cart.items || []);
      return cart;
    } catch (e) {
      console.warn('[guestCartStorage] Error reading guest cart:', e);
      return createEmptyCart();
    }
  },

  /**
   * Add an item to guest cart. Validates with backend /cart/validate-item if available,
   * with offline fallback to product metadata.
   */
  async addItem(params: {
    productId: string;
    quantity: number;
    variantId?: string;
    product?: any;
  }): Promise<CartMutationResponse> {
    const { productId, quantity = 1, variantId = '', product } = params;
    const cart = await this.getCart();

    // Check if item already exists in guest cart
    const existingIndex = cart.items.findIndex((item) => {
      const pId = typeof item.productId === 'object' ? item.productId._id : item.productId;
      return String(pId) === String(productId) && String(item.variantId || '') === String(variantId || '');
    });

    let enrichedItem: CartItem | null = null;
    let action = 'SUCCESS';
    let message = 'Item added to cart';

    // 1. Try server-side validation & enrichment
    try {
      const serverCartItems = cart.items.map((it) => {
        const id = typeof it.productId === 'object' ? it.productId._id : it.productId;
        return {
          productId: id,
          quantity: it.quantity,
          variantId: it.variantId || '',
        };
      });

      const response = await apiClient.post('/cart/validate-item', {
        productId,
        quantity,
        variantId,
        cartItems: serverCartItems,
      });

      const resData = response.data?.data;
      if (resData && resData.addedItem) {
        const serverItem = resData.addedItem;
        action = resData.action || 'SUCCESS';
        message = resData.message || message;

        enrichedItem = {
          _id: `guest_item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          productId: {
            _id: productId,
            name: serverItem.name || product?.name || 'Product',
            slug: product?.slug || '',
            images: [{ url: serverItem.image, isPrimary: true }],
            price: serverItem.price || 0,
            stock: serverItem.stock ?? 99,
            isActive: true,
            status: 'APPROVED',
            sellerId: serverItem.vendorId,
          },
          sellerId: serverItem.vendorId || (product?.sellerId?._id || product?.sellerId || 'store_default'),
          quantity: Number(quantity || 1),
          price: Number(serverItem.price || product?.price || 0),
          image: serverItem.image || (product?.images?.[0]?.url || product?.images?.[0] || ''),
          variantId: serverItem.variantId || variantId || '',
          variantSku: serverItem.variantSku || '',
          variantTitle: serverItem.variantTitle || '',
          variantAttributes: serverItem.variantAttributes || {},
        };
      }
    } catch (apiErr) {
      // Fallback: build from provided product object if API is unreachable
      console.warn('[guestCartStorage] Backend validation skipped, using local fallback:', apiErr);
    }

    // 2. Fallback construction if server item wasn't resolved
    if (!enrichedItem) {
      const unitPrice = Number(product?.discountPrice || product?.price || 0);
      const rawImg =
        product?.images?.find?.((im: any) => im.isPrimary)?.url ||
        product?.images?.[0]?.url ||
        (typeof product?.images?.[0] === 'string' ? product.images[0] : '');

      enrichedItem = {
        _id: `guest_item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        productId: {
          _id: productId,
          name: product?.name || 'Product',
          slug: product?.slug || '',
          images: [{ url: rawImg, isPrimary: true }],
          price: unitPrice,
          stock: product?.stock ?? 99,
          isActive: true,
          status: 'APPROVED',
          sellerId: product?.sellerId?._id || product?.sellerId || '',
        },
        sellerId: product?.sellerId?._id || product?.sellerId || 'store_default',
        quantity: Number(quantity || 1),
        price: unitPrice,
        image: rawImg,
        variantId: variantId || '',
        variantSku: '',
        variantTitle: '',
        variantAttributes: {},
      };
    }

    // 3. Update cart items
    if (existingIndex >= 0) {
      const existing = cart.items[existingIndex];
      const newQty = existing.quantity + (Number(quantity) || 1);
      cart.items[existingIndex] = {
        ...existing,
        quantity: newQty,
        // Refresh price & image if newly resolved
        price: enrichedItem.price || existing.price,
        image: enrichedItem.image || existing.image,
      };
      enrichedItem = cart.items[existingIndex];
    } else {
      cart.items.push(enrichedItem);
    }

    cart.totalAmount = calculateTotal(cart.items);
    cart.updatedAt = new Date().toISOString();

    await AsyncStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));

    return {
      action,
      message,
      cart,
      addedItem: enrichedItem,
    };
  },

  /**
   * Update quantity of an item in the guest cart.
   */
  async updateQuantity(productId: string, quantity: number, variantId?: string): Promise<Cart> {
    const cart = await this.getCart();
    const index = cart.items.findIndex((item) => {
      const pId = typeof item.productId === 'object' ? item.productId._id : item.productId;
      return String(pId) === String(productId) && String(item.variantId || '') === String(variantId || '');
    });

    if (index >= 0) {
      if (quantity <= 0) {
        cart.items.splice(index, 1);
      } else {
        cart.items[index].quantity = quantity;
      }
      cart.totalAmount = calculateTotal(cart.items);
      cart.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
    }

    return cart;
  },

  /**
   * Remove an item from the guest cart.
   */
  async removeItem(productId: string, variantId?: string): Promise<Cart> {
    const cart = await this.getCart();
    cart.items = cart.items.filter((item) => {
      const pId = typeof item.productId === 'object' ? item.productId._id : item.productId;
      const matchProduct = String(pId) === String(productId);
      const matchVariant = String(item.variantId || '') === String(variantId || '');
      return !(matchProduct && matchVariant);
    });

    cart.totalAmount = calculateTotal(cart.items);
    cart.updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
    return cart;
  },

  /**
   * Clear the entire guest cart.
   */
  async clearCart(): Promise<Cart> {
    const empty = createEmptyCart();
    await AsyncStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(empty));
    return empty;
  },

  /**
   * Get formatted items to pass to /auth/merge-guest-data.
   */
  async getItemsForMerge(): Promise<Array<{
    productId: string;
    quantity: number;
    variantId: string;
    price: number;
    name: string;
    image: string;
  }>> {
    const cart = await this.getCart();
    return (cart.items || []).map((item) => {
      const pId = typeof item.productId === 'object' ? item.productId._id : item.productId;
      const pName = typeof item.productId === 'object' ? item.productId.name : 'Product';
      return {
        productId: String(pId),
        quantity: Number(item.quantity || 1),
        variantId: String(item.variantId || ''),
        price: Number(item.price || 0),
        name: pName,
        image: item.image || '',
      };
    });
  },
};
