'use client';

import { supabase } from "./supabase";

export type RoomSearchResult = {
  id: string;
  name: string;
  capacity: number;
  price_per_hour: number;
  studio_name: string;
  studio_city: string;
  studio_address: string;
};

export type Rental = {
  id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
  room?: { name: string; studio?: { name: string } };
};

export async function searchRooms(params: {
  city?: string;
  min_capacity?: number;
  max_price?: number;
  start_time?: string;
  end_time?: string;
}) {
  // 1. Base query for rooms with studio details
  let query = supabase
    .from('rooms')
    .select(`
      id, name, capacity, price_per_hour,
      studio:studios(name, city, address)
    `)
    .not('price_per_hour', 'is', null); // Only rent-able rooms

  // 2. Client-side filtering for studio fields (PostgREST limitations on nested filtering are tricky)
  // Ideally, we'd use a View or RPC for complex spatial/temporal search.
  // For now, we fetch candidate rooms and filter availability.

  const { data, error } = await query;
  if (error) throw error;

  let results = data.map((r: any) => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    price_per_hour: r.price_per_hour,
    studio_name: r.studio?.name,
    studio_city: r.studio?.city,
    studio_address: r.studio?.address,
  })) as RoomSearchResult[];

  if (params.city) {
    results = results.filter(r => r.studio_city?.toLowerCase().includes(params.city!.toLowerCase()));
  }
  if (params.min_capacity) {
    results = results.filter(r => r.capacity >= params.min_capacity!);
  }
  if (params.max_price) {
    results = results.filter(r => r.price_per_hour <= params.max_price!);
  }

  // 3. Check Availability (RPC call)
  if (params.start_time && params.end_time) {
    const availableRooms: RoomSearchResult[] = [];
    for (const room of results) {
      const { data: isAvailable } = await supabase.rpc('check_room_availability', {
        target_room_id: room.id,
        check_start: params.start_time,
        check_end: params.end_time
      });
      if (isAvailable) {
        availableRooms.push(room);
      }
    }
    results = availableRooms;
  }

  return results;
}

export async function createRental(roomId: string, startTime: string, endTime: string, totalPrice: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from('room_rentals')
    .insert({
      room_id: roomId,
      renter_id: user.id,
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      status: 'pending' // pending payment
    })
    .select()
    .single();

  if (error) throw error;
  return data as Rental;
}

export async function listMyRentals() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from('room_rentals')
    .select(`
      *,
      room:rooms(name, studio:studios(name))
    `)
    .eq('renter_id', user.id)
    .order('start_time', { ascending: false });

  if (error) throw error;
  return data as Rental[];
}
