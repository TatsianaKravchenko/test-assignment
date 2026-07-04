export interface Product {
  id: string;
  title: string;
  brand: string;
  imageUrl: string | null;
  firstPublishYear?: number;
  subjects?: string[];
  price?: number;
  description?: string;
  category?: string;
  rating?: number;
  discountPercentage?: number;
  stock?: number;
  availabilityStatus?: string;
  tags?: string[];
}

export interface ProductDto {
  id: number;
  title: string;
  brand?: string;
  images: string[];
  category: string;
  rating: number;
  price: number;
  description: string;
  discountPercentage: number;
  stock: number;
  availabilityStatus: string;
  tags: string[];
}
