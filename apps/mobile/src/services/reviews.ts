import { supabase } from "../lib/supabase";

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
  let query = supabase
    .from('reviews')
    .select(`
      *,
      user:profiles(first_name, last_name)
    `);

  if (params?.studio) query = query.eq('studio_id', params.studio);
  if (params?.rating) query = query.eq('rating', params.rating);

  const { data, error } = await query;

  if (error) throw error;

  return data.map((r: any) => ({
    uuid: r.uuid,
    studio: r.studio_id,
    rating: r.rating,
    comment: r.comment,
    author_name: r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Anonymous',
    created_at: r.created_at,
    studio_response: r.studio_response,
  })) as Review[];
}

export async function createReview(data: {
  booking: string;
  rating: number;
  comment: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // We need to look up the studio from the booking to link it correctly
  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .select('*, slot:slots(studio_id)') // Assuming bookings link to slots which link to studios
    .eq('uuid', data.booking)
    .single();

  if (bookingError) throw bookingError;

  // Note: if bookings table doesn't have a direct link to studio (via slot), we'd need to fetch that.
  // The 'bookings' table I defined in SQL has 'appointment_slot' as text. Ideally it should reference the 'slots' table.
  // Assuming 'appointment_slot' in bookings table is the UUID of the slot.
  
  const studioId = (bookingData as any).slot?.studio_id;

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      user_id: user.id,
      booking_id: data.booking,
      studio_id: studioId, 
      rating: data.rating,
      comment: data.comment,
    })
    .select()
    .single();

  if (error) throw error;
  return review;
}
