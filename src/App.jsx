import { useEffect, useMemo, useState } from "react";
import AuthSheet from "./components/AuthSheet.jsx";
import BottomTabs from "./components/BottomTabs.jsx";
import CartBar from "./components/CartBar.jsx";
import CheckoutSheet from "./components/CheckoutSheet.jsx";
import DetailSheet from "./components/DetailSheet.jsx";
import HomeView from "./components/HomeView.jsx";
import OrderCompleteSheet from "./components/OrderCompleteSheet.jsx";
import OrderDetailSheet from "./components/OrderDetailSheet.jsx";
import OrdersView from "./components/OrdersView.jsx";
import ProfileView from "./components/ProfileView.jsx";
import ShowroomView from "./components/ShowroomView.jsx";
import StylistView from "./components/StylistView.jsx";
import TopBar from "./components/TopBar.jsx";
import TrackingView from "./components/TrackingView.jsx";
import { products as localProducts, showrooms as localShowrooms } from "./data.js";
import { continueAsGuest, getCurrentUser, getGuestUser, signInWithEmail, signOut } from "./services/authService.js";
import { fetchProducts, fetchShowrooms } from "./services/catalogService.js";
import { fetchOrders, saveOrder } from "./services/orderService.js";
import { createOrderDraft } from "./utils/orderTransforms.js";
import { readJson, removeItem, writeJson } from "./utils/storage.js";

const DEFAULT_USER_ID = "guest-fitnow-user";
const storageKeyForUser = (kind, currentUser) => `fitnow:${kind}:${currentUser?.id ?? DEFAULT_USER_ID}`;

const fallbackOrder = {
  etaMinutes: 32,
  showroom: "어반클로젯 성수",
  statusIndex: 2,
};

function CatalogStatus({ status }) {
  if (status.isLoading) return <p className="catalog-status">쇼룸 재고 확인 중</p>;
  if (status.error) return <p className="catalog-status warning">DB 연결 대기 중 · 로컬 데이터 표시</p>;
  return <p className="catalog-status">{status.source === "supabase" ? "실시간 쇼룸 재고" : "로컬 샘플 데이터"}</p>;
}

export default function App() {
  const [activeView, setActiveView] = useState("home");
  const [user, setUser] = useState(getGuestUser());
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState({ isSubmitting: false, error: null });
  const [catalog, setCatalog] = useState({ products: localProducts, showrooms: localShowrooms });
  const [catalogStatus, setCatalogStatus] = useState({ isLoading: true, source: "local", error: null });
  const [lineItems, setLineItems] = useState(() => readJson(storageKeyForUser("lineItems", getGuestUser()), []));
  const [detailProduct, setDetailProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSaveStatus, setOrderSaveStatus] = useState({ isSaving: false, error: null });
  const [order, setOrder] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [orders, setOrders] = useState(() => readJson(storageKeyForUser("orders", getGuestUser()), []));

  const cartCount = useMemo(() => lineItems.reduce((sum, item) => sum + item.quantity, 0), [lineItems]);
  const total = useMemo(() => lineItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [lineItems]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const currentUser = await getCurrentUser();
        const [remoteProducts, remoteShowrooms, remoteOrders] = await Promise.all([
          fetchProducts(),
          fetchShowrooms(),
          fetchOrders(currentUser),
        ]);
        if (!isMounted) return;

        setUser(currentUser);
        setLineItems(readJson(storageKeyForUser("lineItems", currentUser), []));

        const hasRemoteCatalog = remoteProducts.length > 0 || remoteShowrooms.length > 0;
        setCatalog({
          products: remoteProducts.length > 0 ? remoteProducts : localProducts,
          showrooms: remoteShowrooms.length > 0 ? remoteShowrooms : localShowrooms,
        });
        setOrders(!currentUser.isGuest && remoteOrders.length > 0 ? remoteOrders : readJson(storageKeyForUser("orders", currentUser), []));
        setCatalogStatus({ isLoading: false, source: hasRemoteCatalog ? "supabase" : "local", error: null });
      } catch (error) {
        if (!isMounted) return;
        setCatalog({ products: localProducts, showrooms: localShowrooms });
        setCatalogStatus({ isLoading: false, source: "local", error: error.message });
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    writeJson(storageKeyForUser("lineItems", user), lineItems);
  }, [lineItems, user]);

  useEffect(() => {
    writeJson(storageKeyForUser("orders", user), orders);
  }, [orders, user]);

  function addProduct(product, options = {}) {
    const size = options.size ?? "FREE";
    setLineItems((items) => {
      const existing = items.find((item) => item.product.key === product.key && item.size === size);
      if (existing) {
        return items.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1, selectedAt: new Date().toISOString() } : item,
        );
      }
      return [...items, { id: `${product.key}-${size}`, product, size, quantity: 1, selectedAt: new Date().toISOString() }];
    });
  }

  function addRecommendedSet() {
    const recommendedProducts = catalog.products.filter((product) => ["jacket", "ring"].includes(product.key));
    recommendedProducts.forEach((product) => addProduct(product, { size: product.key === "ring" ? "FREE" : "M" }));
  }

  function updateLineItemQuantity(itemId, change) {
    setLineItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + change } : item)).filter((item) => item.quantity > 0),
    );
  }

  function removeLineItem(itemId) {
    setLineItems((items) => items.filter((item) => item.id !== itemId));
  }

  async function createOrder(deliveryDetails = {}) {
    const orderDraft = createOrderDraft({ lineItems, total, user, deliveryDetails });
    setOrderSaveStatus({ isSaving: true, error: null });
    try {
      await saveOrder(orderDraft);
      setCompletedOrder(orderDraft);
      setOrders((items) => [orderDraft, ...items]);
      setLineItems([]);
      setIsCheckoutOpen(false);
    } catch {
      setOrderSaveStatus({ isSaving: false, error: "주문 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." });
      return;
    }
    setOrderSaveStatus({ isSaving: false, error: null });
  }

  async function handleEmailSignIn(email) {
    setAuthStatus({ isSubmitting: true, error: null });
    try {
      const nextUser = await signInWithEmail(email);
      const savedLineItems = readJson(storageKeyForUser("lineItems", nextUser), []);
      const nextLineItems = user.isGuest ? mergeLineItems(savedLineItems, lineItems) : savedLineItems;
      setUser(nextUser);
      setLineItems(nextLineItems);
      setOrders(readJson(storageKeyForUser("orders", nextUser), []));
      writeJson(storageKeyForUser("lineItems", nextUser), nextLineItems);
      setAuthSheetOpen(false);
      setActiveView("profile");
    } catch {
      setAuthStatus({ isSubmitting: false, error: "로그인 요청에 실패했습니다. 이메일을 확인해 주세요." });
      return;
    }
    setAuthStatus({ isSubmitting: false, error: null });
  }

  function handleGuestContinue() {
    const guest = continueAsGuest();
    setUser(guest);
    setLineItems(readJson(storageKeyForUser("lineItems", guest), []));
    setOrders(readJson(storageKeyForUser("orders", guest), []));
    setAuthSheetOpen(false);
    setActiveView("profile");
  }

  function handleSignOut() {
    const guest = signOut();
    setUser(guest);
    setLineItems(readJson(storageKeyForUser("lineItems", guest), []));
    setOrders(readJson(storageKeyForUser("orders", guest), []));
    removeItem(storageKeyForUser("orders", user));
    setActiveView("profile");
  }

  function openTracking() {
    setOrder((current) => current ?? fallbackOrder);
  }

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="FitNow 앱 프로토타입">
        <TopBar />
        <CatalogStatus status={catalogStatus} />
        {activeView === "home" && (
          <HomeView
            products={catalog.products}
            isLoading={catalogStatus.isLoading}
            onAdd={addProduct}
            onOpenDetail={setDetailProduct}
            onOpenTracking={openTracking}
            onOpenAI={() => setActiveView("stylist")}
          />
        )}
        {activeView === "showrooms" && <ShowroomView showrooms={catalog.showrooms} isLoading={catalogStatus.isLoading} />}
        {activeView === "stylist" && <StylistView onAddSet={addRecommendedSet} />}
        {activeView === "orders" && <OrdersView orders={orders} onOpenTracking={setOrder} onOpenDetail={setDetailOrder} />}
        {activeView === "profile" && (
          <ProfileView user={user} catalogSource={catalogStatus.source} onOpenAuth={() => setAuthSheetOpen(true)} onSignOut={handleSignOut} />
        )}
        <CartBar count={cartCount} total={total} onCheckout={() => setIsCheckoutOpen(true)} />
        <BottomTabs activeView={activeView} onChangeView={setActiveView} onOpenTracking={openTracking} />
      </section>

      {detailProduct && <DetailSheet product={detailProduct} onClose={() => setDetailProduct(null)} onAdd={addProduct} />}
      {detailOrder && (
        <OrderDetailSheet
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onOpenTracking={(nextOrder) => {
            setDetailOrder(null);
            setOrder(nextOrder);
          }}
        />
      )}
      {completedOrder && (
        <OrderCompleteSheet
          order={completedOrder}
          onClose={() => setCompletedOrder(null)}
          onOpenOrders={() => {
            setCompletedOrder(null);
            setActiveView("orders");
          }}
          onOpenTracking={(nextOrder) => {
            setCompletedOrder(null);
            setOrder(nextOrder);
          }}
        />
      )}
      {isCheckoutOpen && (
        <CheckoutSheet
          lineItems={lineItems}
          cartCount={cartCount}
          total={total}
          isSaving={orderSaveStatus.isSaving}
          error={orderSaveStatus.error}
          onClose={() => setIsCheckoutOpen(false)}
          onConfirm={createOrder}
          onIncrement={(itemId) => updateLineItemQuantity(itemId, 1)}
          onDecrement={(itemId) => updateLineItemQuantity(itemId, -1)}
          onRemove={removeLineItem}
        />
      )}
      {order && <TrackingView order={order} onClose={() => setOrder(null)} />}
      {authSheetOpen && (
        <AuthSheet
          isSubmitting={authStatus.isSubmitting}
          error={authStatus.error}
          onClose={() => setAuthSheetOpen(false)}
          onGuest={handleGuestContinue}
          onSubmit={handleEmailSignIn}
        />
      )}
    </main>
  );
}

function mergeLineItems(baseItems, incomingItems) {
  const merged = [...baseItems];

  incomingItems.forEach((incomingItem) => {
    const existing = merged.find((item) => item.product.key === incomingItem.product.key && item.size === incomingItem.size);
    if (existing) {
      existing.quantity += incomingItem.quantity;
      existing.selectedAt = incomingItem.selectedAt;
      return;
    }
    merged.push(incomingItem);
  });

  return merged;
}
