export interface Product {
  id: string;
  title: string;
  author: string;
  imageUrl: string | null;
  firstPublishYear?: number;
  subjects?: string[];
}

export interface DummyProduct {
  id: number;
  title: string;
  brand?: string;
  images: string[];
  category: string;
  rating: number;
  price: number;
}

export interface DummyJSONResponse {
  products: DummyProduct[];
  total: number;
  skip: number;
  limit: number;
}
