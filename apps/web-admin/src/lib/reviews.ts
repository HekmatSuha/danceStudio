'use client';

import { api } from "./api";

export type Review = {
  uuid: string;
  studio: string;
  rating: number;
  comment: string;
  author_name: string;
  created_at: string;
  studio_response?: string;
};

export async function listReviews(params?: {
  studio?: string;
  rating?: number;
  min_rating?: number;
  max_rating?: number;
  is_verified_booking?: boolean;
  has_response?: boolean;
}) {
  const res = await api.get("/studios/reviews/", { params });
  if (Array.isArray(res.data)) {
    return res.data as Review[];
  } else if (res.data && Array.isArray((res.data as any).results)) {
    return (res.data as any).results as Review[];
  }
  return [];
}

export async function createReview(data: {
  booking: string;
  rating: number;
  comment: string;
}) {
  const res = await api.post("/studios/reviews/", data);
  return res.data;
}

export async function respondToReview(reviewId: string, response: string) {
  const res = await api.post(`/studios/reviews/${reviewId}/respond/`, {
    response,
  });
  return res.data;
}
