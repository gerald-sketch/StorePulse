import type { CheckoutInput, Customer } from "@/features/pos/use-pos";
import type { Product } from "@/features/products/use-products";

const DATABASE_NAME = "smallbiz-offline";
const DATABASE_VERSION = 1;
const CATALOG_STORE = "catalog";
const SALES_STORE = "sales";

export interface OfflineScope {
  userId: string;
  businessId: string;
  branchId: string;
}

export interface PendingSale {
  id: string;
  userId: string;
  businessId: string;
  branchId: string;
  payload: CheckoutInput;
  createdAt: string;
  status: "pending" | "needs-attention";
  error?: string;
}

interface CatalogSnapshot<T> {
  key: string;
  items: T[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CATALOG_STORE)) {
        database.createObjectStore(CATALOG_STORE, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(SALES_STORE)) {
        database.createObjectStore(SALES_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline storage is unavailable"));
    request.onblocked = () => reject(new Error("Offline storage upgrade is blocked"));
  });
}

function scopeKey(scope: OfflineScope, kind: "products" | "customers"): string {
  return `${scope.businessId}:${scope.userId}:${scope.branchId}:${kind}`;
}

export async function saveCatalog<T extends { id: string }>(
  scope: OfflineScope,
  kind: "products" | "customers",
  items: T[],
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(CATALOG_STORE, "readwrite");
      const store = transaction.objectStore(CATALOG_STORE);
      const key = scopeKey(scope, kind);
      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        const cached = getRequest.result as CatalogSnapshot<T> | undefined;
        const merged = new Map((cached?.items ?? []).map((item) => [item.id, item]));
        for (const item of items) merged.set(item.id, item);
        store.put({ key, items: [...merged.values()] } satisfies CatalogSnapshot<T>);
      };
      getRequest.onerror = () => reject(getRequest.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline storage transaction aborted"));
    });
  } finally {
    database.close();
  }
}

export async function readCatalog<T>(
  scope: OfflineScope,
  kind: "products" | "customers",
): Promise<T[]> {
  const database = await openDatabase();
  try {
    return await new Promise<T[]>((resolve, reject) => {
      const request = database
        .transaction(CATALOG_STORE, "readonly")
        .objectStore(CATALOG_STORE)
        .get(scopeKey(scope, kind));
      request.onsuccess = () => {
        const snapshot = request.result as CatalogSnapshot<T> | undefined;
        resolve(snapshot?.items ?? []);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function queueSale(
  sale: PendingSale,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SALES_STORE, "readwrite");
      transaction.objectStore(SALES_STORE).put(sale);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline sale could not be saved"));
    });
  } finally {
    database.close();
  }
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const database = await openDatabase();
  try {
    return await new Promise<PendingSale[]>((resolve, reject) => {
      const request = database
        .transaction(SALES_STORE, "readonly")
        .objectStore(SALES_STORE)
        .getAll();
      request.onsuccess = () => resolve(request.result as PendingSale[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function updatePendingSale(sale: PendingSale): Promise<void> {
  await queueSale(sale);
}

export async function removePendingSale(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SALES_STORE, "readwrite");
      transaction.objectStore(SALES_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline sale could not be removed"));
    });
  } finally {
    database.close();
  }
}

export function filterOfflineProducts(
  items: Product[],
  search: string,
  categoryId?: string,
): Product[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return items.filter(
    (product) =>
      product.status === "ACTIVE" &&
      !product.deletedAt &&
      (!categoryId || product.categoryId === categoryId) &&
      (!normalizedSearch ||
        product.name.toLocaleLowerCase().includes(normalizedSearch) ||
        product.sku.toLocaleLowerCase().includes(normalizedSearch)),
  );
}

export function filterOfflineCustomers(items: Customer[], search: string): Customer[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return items.filter(
    (customer) =>
      !customer.deletedAt &&
      (!normalizedSearch ||
        customer.name.toLocaleLowerCase().includes(normalizedSearch)),
  );
}
