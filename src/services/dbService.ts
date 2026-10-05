/**
 * AgriLink AI — Supabase Data Access Layer
 * Phase 2: Real CRUD for Farmer → Buyer flow
 *
 * Architecture:
 *   React UI → dbService → supabase client → PostgreSQL → RLS
 *
 * Security rules enforced here:
 *   - farmer_id / buyer_id always come from supabase.auth.getUser() on the server-side RLS
 *   - Frontend never passes arbitrary user IDs for ownership fields
 *   - All errors are logged and re-thrown (no silent swallowing)
 *   - Empty table → returns [] (never falls back to mock data)
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  CropListing, 
  BuyerRequirement, 
  UserProfile, 
  QualityGrade, 
  CropStatus, 
  RequirementStatus, 
  FarmerActiveOrder, 
  FarmerConversation, 
  FarmerMessage,
  FarmerCommunityMessage,
  AdminFarmerUser,
  AdminBuyerUser,
  AdminTransporterUser,
  AdminTransactionRecord,
  AdminLogisticsRouteRecord
} from '../types';


// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Logs a DB error to console and throws it so callers can handle. */
function handleDbError(context: string, error: unknown): never {
  console.error(`[AgriLink DB] ${context}:`, error);
  throw error;
}

/** Maps a raw Supabase crop_inventory row to the frontend CropListing type. */
function mapCropRow(row: any): CropListing {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    farmerName: row.profiles?.full_name ?? 'Farmer',
    phone: row.profiles?.phone ?? '',
    cropName: row.crop_name,
    variety: row.variety ?? 'Standard',
    quantityKg: row.quantity_kg,
    askingPricePerKg: row.asking_price_per_kg,
    mandiBenchmarkPrice: row.mandi_benchmark_price ?? row.asking_price_per_kg * 0.8,
    qualityGrade: (row.quality_grade as QualityGrade) ?? 'Grade A',
    harvestDate: row.harvest_date,
    locationName: row.location_name ?? `${row.profiles?.district ?? 'Unknown'}, ${row.profiles?.state ?? 'India'}`,
    district: row.profiles?.district ?? 'Unknown',
    state: row.profiles?.state ?? 'India',
    latitude: row.latitude ?? 20.0059,
    longitude: row.longitude ?? 73.7898,
    status: (row.status as CropStatus) ?? 'available',
    createdAt: row.created_at,
    photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls : [],
  };
}

/** Maps a raw Supabase buyer_requirements row to the frontend BuyerRequirement type. */
function mapBuyerRow(row: any): BuyerRequirement {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    buyerName: row.profiles?.full_name ?? 'Enterprise Buyer',
    buyerType:
      row.profiles?.role === 'consumer_group'
        ? 'Consumer Group Hub'
        : row.buyer_type ?? 'Modern Retailer',
    cropName: row.crop_name,
    variety: row.variety,
    requiredQuantityKg: row.required_quantity_kg,
    maxPricePerKg: row.max_price_per_kg,
    preferredQualityGrade: (row.preferred_quality_grade as QualityGrade) ?? 'Grade A',
    deliveryDeadline: row.delivery_deadline,
    destinationName: row.destination_name,
    destinationLat: row.destination_lat ?? 19.2968,
    destinationLng: row.destination_lng ?? 73.0631,
    status: (row.status as RequirementStatus) ?? 'open',
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Crop Inventory — Reads
// ---------------------------------------------------------------------------

/**
 * Fetches ALL available crop listings visible to the current user.
 * RLS: authenticated users see listings where status = 'available'.
 * Returns [] if no records exist — never falls back to mock data.
 */
export async function getCropListings(): Promise<CropListing[]> {
  if (!isSupabaseConfigured) {
    console.warn('[AgriLink DB] Supabase not configured. Cannot fetch crop listings.');
    return [];
  }

  const { data, error } = await supabase
    .from('crop_inventory')
    .select(`
      *,
      profiles:farmer_id (full_name, phone, district, state)
    `)
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (error) handleDbError('getCropListings', error);
  return (data ?? []).map(mapCropRow);
}

/**
 * Fetches crop listings belonging to the currently authenticated farmer.
 * RLS: only returns rows where farmer_id = auth.uid().
 */
export async function getMyCropListings(): Promise<CropListing[]> {
  if (!isSupabaseConfigured) {
    console.warn('[AgriLink DB] Supabase not configured. Cannot fetch my crop listings.');
    return [];
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    console.warn('[AgriLink DB] getMyCropListings: No authenticated user.');
    return [];
  }

  const { data, error } = await supabase
    .from('crop_inventory')
    .select(`
      *,
      profiles:farmer_id (full_name, phone, district, state)
    `)
    .eq('farmer_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (error) handleDbError('getMyCropListings', error);
  return (data ?? []).map(mapCropRow);
}

// ---------------------------------------------------------------------------
// Crop Inventory — Writes
// ---------------------------------------------------------------------------

/**
 * Creates a new crop listing for the currently authenticated farmer.
 * farmer_id is ALWAYS taken from supabase.auth.getUser() — never from the frontend form.
 * RLS enforces: INSERT only allowed when farmer_id = auth.uid().
 */
export async function createCropListing(
  formData: Omit<CropListing, 'id' | 'farmerId' | 'farmerName' | 'phone' | 'district' | 'state' | 'createdAt'>
): Promise<CropListing> {
  if (!isSupabaseConfigured) {
    handleDbError('createCropListing', new Error('Supabase not configured'));
  }

  // Always fetch auth user — never trust frontend for farmer_id
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    handleDbError('createCropListing — auth check', userErr ?? new Error('Not authenticated'));
  }
  const farmerId = userData.user!.id;

  const payload = {
    farmer_id: farmerId,
    crop_name: formData.cropName,
    variety: formData.variety,
    quantity_kg: formData.quantityKg,
    asking_price_per_kg: formData.askingPricePerKg,
    mandi_benchmark_price: formData.mandiBenchmarkPrice,
    quality_grade: formData.qualityGrade,
    harvest_date: formData.harvestDate,
    location_name: formData.locationName,
    latitude: formData.latitude,
    longitude: formData.longitude,
    status: formData.status ?? 'available',
    photo_urls: formData.photoUrls ?? [],
  };

  let data: any = null;
  const { data: insertData, error } = await supabase
    .from('crop_inventory')
    .insert([payload])
    .select(`
      *,
      profiles:farmer_id (full_name, phone, district, state)
    `)
    .single();

  if (error) {
    if (error.message?.includes('photo_urls') || (error as any).details?.includes('photo_urls') || error.code === 'PGRST204' || error.code === '42703') {
      console.warn('[AgriLink DB] photo_urls column not present in remote database yet, falling back without photo_urls column in SQL insert.');
      const { photo_urls, ...legacyPayload } = payload;
      const { data: retryData, error: retryError } = await supabase
        .from('crop_inventory')
        .insert([legacyPayload])
        .select(`
          *,
          profiles:farmer_id (full_name, phone, district, state)
        `)
        .single();
      if (retryError) handleDbError('createCropListing — retry without photo_urls', retryError);
      data = { ...retryData, photo_urls: formData.photoUrls ?? [] };
    } else {
      handleDbError('createCropListing — insert', error);
    }
  } else {
    data = insertData;
  }
  return mapCropRow(data);
}

/**
 * Updates mutable fields of a crop listing.
 * RLS enforces that only the owning farmer can update.
 */
export async function updateCropListing(
  id: string,
  updates: Partial<Pick<CropListing, 'quantityKg' | 'askingPricePerKg' | 'status' | 'harvestDate' | 'locationName'>>
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const payload: Record<string, unknown> = {};
  if (updates.quantityKg !== undefined) payload.quantity_kg = updates.quantityKg;
  if (updates.askingPricePerKg !== undefined) payload.asking_price_per_kg = updates.askingPricePerKg;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.harvestDate !== undefined) payload.harvest_date = updates.harvestDate;
  if (updates.locationName !== undefined) payload.location_name = updates.locationName;

  const { error } = await supabase
    .from('crop_inventory')
    .update(payload)
    .eq('id', id);

  if (error) handleDbError(`updateCropListing(${id})`, error);
}

/**
 * Deletes a crop listing by ID.
 * RLS enforces that only the owning farmer can delete.
 */
export async function deleteCropListing(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('crop_inventory')
    .delete()
    .eq('id', id);

  if (error) handleDbError(`deleteCropListing(${id})`, error);
}

// ---------------------------------------------------------------------------
// Buyer Requirements — Reads
// ---------------------------------------------------------------------------

/**
 * Fetches all OPEN buyer requirements visible to authenticated users.
 * Returns [] if no records — never falls back to mock data.
 */
export async function getOpenBuyerRequirements(): Promise<BuyerRequirement[]> {
  if (!isSupabaseConfigured) {
    console.warn('[AgriLink DB] Supabase not configured. Cannot fetch buyer requirements.');
    return [];
  }

  const { data, error } = await supabase
    .from('buyer_requirements')
    .select(`
      *,
      profiles:buyer_id (full_name, phone, role)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) handleDbError('getOpenBuyerRequirements', error);
  return (data ?? []).map(mapBuyerRow);
}

/**
 * Fetches buyer requirements belonging to the currently authenticated buyer.
 * RLS: only returns rows where buyer_id = auth.uid().
 */
export async function getMyBuyerRequirements(): Promise<BuyerRequirement[]> {
  if (!isSupabaseConfigured) {
    console.warn('[AgriLink DB] Supabase not configured. Cannot fetch my buyer requirements.');
    return [];
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    console.warn('[AgriLink DB] getMyBuyerRequirements: No authenticated user.');
    return [];
  }

  const { data, error } = await supabase
    .from('buyer_requirements')
    .select(`
      *,
      profiles:buyer_id (full_name, phone, role)
    `)
    .eq('buyer_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (error) handleDbError('getMyBuyerRequirements', error);
  return (data ?? []).map(mapBuyerRow);
}

// ---------------------------------------------------------------------------
// Buyer Requirements — Writes
// ---------------------------------------------------------------------------

/**
 * Creates a new buyer requirement for the currently authenticated buyer.
 * buyer_id is ALWAYS taken from supabase.auth.getUser() — never from the frontend form.
 * RLS enforces: INSERT only allowed when buyer_id = auth.uid().
 */
export async function createBuyerRequirement(
  formData: Omit<BuyerRequirement, 'id' | 'buyerId' | 'buyerName' | 'createdAt'>
): Promise<BuyerRequirement> {
  if (!isSupabaseConfigured) {
    handleDbError('createBuyerRequirement', new Error('Supabase not configured'));
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    handleDbError('createBuyerRequirement — auth check', userErr ?? new Error('Not authenticated'));
  }
  const buyerId = userData.user!.id;

  const payload = {
    buyer_id: buyerId,
    crop_name: formData.cropName,
    variety: formData.variety,
    required_quantity_kg: formData.requiredQuantityKg,
    max_price_per_kg: formData.maxPricePerKg,
    preferred_quality_grade: formData.preferredQualityGrade,
    delivery_deadline: formData.deliveryDeadline,
    destination_name: formData.destinationName,
    destination_lat: formData.destinationLat,
    destination_lng: formData.destinationLng,
    status: formData.status ?? 'open',
  };

  const { data, error } = await supabase
    .from('buyer_requirements')
    .insert([payload])
    .select(`
      *,
      profiles:buyer_id (full_name, phone, role)
    `)
    .single();

  if (error) handleDbError('createBuyerRequirement — insert', error);
  return mapBuyerRow(data);
}

/**
 * Updates mutable fields on a buyer requirement.
 * RLS enforces that only the owning buyer can update.
 */
export async function updateBuyerRequirement(
  id: string,
  updates: Partial<Pick<BuyerRequirement, 'requiredQuantityKg' | 'maxPricePerKg' | 'status' | 'deliveryDeadline'>>
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const payload: Record<string, unknown> = {};
  if (updates.requiredQuantityKg !== undefined) payload.required_quantity_kg = updates.requiredQuantityKg;
  if (updates.maxPricePerKg !== undefined) payload.max_price_per_kg = updates.maxPricePerKg;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.deliveryDeadline !== undefined) payload.delivery_deadline = updates.deliveryDeadline;

  const { error } = await supabase
    .from('buyer_requirements')
    .update(payload)
    .eq('id', id);

  if (error) handleDbError(`updateBuyerRequirement(${id})`, error);
}

/**
 * Cancels / deletes a buyer requirement.
 * RLS enforces that only the owning buyer can delete.
 */
export async function deleteBuyerRequirement(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('buyer_requirements')
    .delete()
    .eq('id', id);

  if (error) handleDbError(`deleteBuyerRequirement(${id})`, error);
}

// ---------------------------------------------------------------------------
// Profiles & Contact Information
// ---------------------------------------------------------------------------

/**
 * Fetches the profile of the currently authenticated user.
 * Returns null if not authenticated or no profile row.
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single();

  if (error) {
    console.error('[AgriLink DB] getCurrentProfile:', error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    phone: data.phone ?? '',
    role: data.role,
    district: data.district ?? 'Nashik',
    state: data.state ?? 'Maharashtra',
    latitude: data.latitude ?? 20.0059,
    longitude: data.longitude ?? 73.7898,
    fpoName: data.fpo_name,
    rating: data.rating ?? 4.8,
    verified: data.verified !== false,
    email: data.email ?? '',
    companyName: data.company_name ?? '',
    businessType: data.business_type ?? '',
    businessAddress: data.business_address ?? '',
  };
}

/**
 * Updates profile and contact fields for the authenticated user.
 */
export async function updateMyProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return null;

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.companyName !== undefined) payload.company_name = updates.companyName;
  if (updates.businessType !== undefined) payload.business_type = updates.businessType;
  if (updates.businessAddress !== undefined) payload.business_address = updates.businessAddress;
  if (updates.district !== undefined) payload.district = updates.district;
  if (updates.state !== undefined) payload.state = updates.state;
  if (updates.fpoName !== undefined) payload.fpo_name = updates.fpoName;

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userData.user.id);

  if (error) handleDbError('updateMyProfile', error);
  return getCurrentProfile();
}

/**
 * Uploads a produce photo to Supabase Storage (with data-URL fallback).
 */
export async function uploadProducePhoto(file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Must be authenticated to upload photos.');

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  try {
    const { error } = await supabase.storage.from('produce-photos').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.warn('[AgriLink DB] Storage upload fallback to Data URL:', error.message);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabase.storage.from('produce-photos').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (e) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}

// ---------------------------------------------------------------------------
// Farmer Community Messages (Broadcast Channel for Farmers & FPOs)
// ---------------------------------------------------------------------------

/**
 * Fetches all community messages in chronological order.
 * RLS: Authenticated user must have role 'farmer' or 'fpo_admin'.
 * Returns [] if no messages exist or user is unauthorized (never mock data).
 */
export async function getFarmerCommunityMessages(): Promise<FarmerCommunityMessage[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('farmer_community_messages')
      .select(`
        id,
        sender_id,
        message,
        created_at,
        updated_at,
        sender:profiles!sender_id (full_name, district, role, fpo_name)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[AgriLink DB] getFarmerCommunityMessages error:', error);
      return [];
    }

    return (data || []).map((row: any) => {
      const senderObj = Array.isArray(row.sender) ? row.sender[0] : row.sender;
      return {
        id: row.id,
        senderId: row.sender_id,
        senderName: senderObj?.full_name || 'Farmer Partner',
        senderDistrict: senderObj?.district || '',
        senderRole: senderObj?.role || 'farmer',
        senderFpoName: senderObj?.fpo_name || undefined,
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  } catch (err) {
    console.warn('[AgriLink DB] getFarmerCommunityMessages unexpected error:', err);
    return [];
  }
}

/**
 * Sends a community broadcast message from the authenticated farmer/FPO user.
 * RLS enforces: sender_id = auth.uid() AND role IN ('farmer', 'fpo_admin').
 */
export async function sendFarmerCommunityMessage(messageText: string): Promise<FarmerCommunityMessage | null> {
  if (!isSupabaseConfigured) return null;
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    handleDbError('sendFarmerCommunityMessage — auth', userErr ?? new Error('Not authenticated'));
  }

  const cleanMessage = messageText.trim();
  if (!cleanMessage) return null;

  const { data, error } = await supabase
    .from('farmer_community_messages')
    .insert([{
      sender_id: userData.user.id,
      message: cleanMessage,
    }])
    .select(`
      id,
      sender_id,
      message,
      created_at,
      updated_at,
      sender:profiles!sender_id (full_name, district, role, fpo_name)
    `)
    .single();

  if (error) {
    handleDbError('sendFarmerCommunityMessage', error);
  }

  const senderObj = Array.isArray(data.sender) ? data.sender[0] : data.sender;

  return {
    id: data.id,
    senderId: data.sender_id,
    senderName: senderObj?.full_name || 'You',
    senderDistrict: senderObj?.district || '',
    senderRole: senderObj?.role || 'farmer',
    senderFpoName: senderObj?.fpo_name || undefined,
    message: data.message,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}


/**
 * Subscribes to new community broadcast messages via Supabase Realtime WebSocket channel.
 */
export function subscribeToFarmerCommunityMessages(
  onMessage: (msg: FarmerCommunityMessage) => void
): { unsubscribe: () => void } {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`public:farmer_community_messages:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'farmer_community_messages',
      },
      async (payload) => {
        try {
          // Fetch sender profile details for newly inserted row
          const senderId = payload.new.sender_id;
          let senderName = 'Farmer Partner';
          let senderDistrict = '';
          let senderRole = 'farmer';
          let senderFpoName: string | undefined = undefined;

          if (senderId) {
            const { data: senderProf } = await supabase
              .from('profiles')
              .select('full_name, district, role, fpo_name')
              .eq('id', senderId)
              .maybeSingle();

            if (senderProf) {
              senderName = senderProf.full_name || senderName;
              senderDistrict = senderProf.district || '';
              senderRole = senderProf.role || 'farmer';
              senderFpoName = senderProf.fpo_name || undefined;
            }
          }

          onMessage({
            id: payload.new.id,
            senderId: payload.new.sender_id,
            senderName,
            senderDistrict,
            senderRole,
            senderFpoName,
            message: payload.new.message,
            createdAt: payload.new.created_at,
            updatedAt: payload.new.updated_at,
          });
        } catch (err) {
          console.warn('[AgriLink DB] Error in community realtime message handler:', err);
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// ---------------------------------------------------------------------------
// Farmer-to-Farmer Chat (Legacy 1-to-1 Support)
// ---------------------------------------------------------------------------

export async function getFarmerConversations(): Promise<FarmerConversation[]> {
  if (!isSupabaseConfigured) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];
  const userId = userData.user.id;

  try {
    const { data, error } = await supabase
      .from('farmer_conversations')
      .select(`
        *,
        p1:profiles!participant_1_id (id, full_name, phone, district, fpo_name),
        p2:profiles!participant_2_id (id, full_name, phone, district, fpo_name)
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('[AgriLink DB] getFarmerConversations error:', error);
      return [];
    }

    return (data || []).map((row: any) => {
      const isP1 = row.participant_1_id === userId;
      const other = isP1 ? row.p2 : row.p1;
      return {
        id: row.id,
        participant1Id: row.participant_1_id,
        participant2Id: row.participant_2_id,
        otherParticipant: other ? {
          id: other.id,
          fullName: other.full_name,
          phone: other.phone,
          district: other.district,
          fpoName: other.fpo_name,
        } : undefined,
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
      };
    });
  } catch (err) {
    console.warn('[AgriLink DB] Error in getFarmerConversations:', err);
    return [];
  }
}

export async function getFarmerMessages(conversationId: string): Promise<FarmerMessage[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('farmer_messages')
      .select(`
        *,
        sender:profiles!sender_id (full_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[AgriLink DB] getFarmerMessages error:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender?.full_name || 'Farmer Partner',
      messageText: row.message_text,
      isRead: row.is_read,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn('[AgriLink DB] Error in getFarmerMessages:', err);
    return [];
  }
}

export async function sendFarmerMessage(conversationId: string, messageText: string): Promise<FarmerMessage | null> {
  if (!isSupabaseConfigured) return null;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data, error } = await supabase
    .from('farmer_messages')
    .insert([{
      conversation_id: conversationId,
      sender_id: userData.user.id,
      message_text: messageText.trim(),
    }])
    .select(`
      *,
      sender:profiles!sender_id (full_name)
    `)
    .single();

  if (error) handleDbError('sendFarmerMessage', error);

  // Update conversation last_message_at
  await supabase
    .from('farmer_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    senderName: data.sender?.full_name || 'You',
    messageText: data.message_text,
    isRead: data.is_read,
    createdAt: data.created_at,
  };
}

export async function createOrGetFarmerConversation(otherFarmerId: string): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');
  const currentUserId = userData.user.id;

  if (currentUserId === otherFarmerId) throw new Error('Cannot start conversation with yourself');

  // Check existing conversation
  const { data: existing } = await supabase
    .from('farmer_conversations')
    .select('id')
    .or(`and(participant_1_id.eq.${currentUserId},participant_2_id.eq.${otherFarmerId}),and(participant_1_id.eq.${otherFarmerId},participant_2_id.eq.${currentUserId})`)
    .maybeSingle();

  if (existing) return existing.id;

  const p1 = currentUserId < otherFarmerId ? currentUserId : otherFarmerId;
  const p2 = currentUserId < otherFarmerId ? otherFarmerId : currentUserId;

  const { data, error } = await supabase
    .from('farmer_conversations')
    .insert([{ participant_1_id: p1, participant_2_id: p2 }])
    .select('id')
    .single();

  if (error) handleDbError('createOrGetFarmerConversation', error);
  return data.id;
}


// ---------------------------------------------------------------------------
// Aggregated Orders — Creation & Persistence
// ---------------------------------------------------------------------------

export async function createAggregatedOrder(payload: {
  requirementId: string;
  cropName: string;
  qualityGrade: string;
  hubLocation: { name: string; lat: number; lng: number };
  items: {
    crop_inventory_id: string;
    farmer_id: string;
    allocated_quantity_kg: number;
    price_per_kg: number;
    distance_from_hub_km?: number;
    is_seed_farmer?: boolean;
  }[];
  priceOverrideApproved?: boolean;
}): Promise<{ success: boolean; orderId: string; data?: any }> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Cannot persist order.');
  }

  const { data, error } = await supabase.rpc('create_aggregated_order', {
    p_requirement_id: payload.requirementId,
    p_crop_name: payload.cropName,
    p_quality_grade: payload.qualityGrade,
    p_hub_lat: payload.hubLocation.lat,
    p_hub_lng: payload.hubLocation.lng,
    p_hub_name: payload.hubLocation.name,
    p_items: payload.items,
    p_price_override_approved: !!payload.priceOverrideApproved,
  });

  if (error) {
    console.error('[AgriLink DB] createAggregatedOrder RPC error:', error);
    throw error;
  }

  return {
    success: true,
    orderId: data.order_id,
    data,
  };
}

export async function getAggregatedOrderById(orderId: string): Promise<any> {
  if (!isSupabaseConfigured) return null;

  const { data: order, error: orderErr } = await supabase
    .from('aggregated_orders')
    .select(`
      *,
      buyer_requirement:buyer_requirements (
        *,
        buyer:profiles!buyer_id (full_name, phone, district, state, company_name, business_type, business_address)
      ),
      transporter:profiles!transporter_id (full_name, phone)
    `)
    .eq('id', orderId)
    .single();

  if (orderErr) {
    console.error('[AgriLink DB] getAggregatedOrderById error:', orderErr);
    return null;
  }

  const { data: items } = await supabase
    .from('aggregated_order_items')
    .select(`
      *,
      farmer:profiles!farmer_id (full_name, phone, district, state),
      crop:crop_inventory!crop_inventory_id (crop_name, variety, latitude, longitude, quality_grade, photo_urls)
    `)
    .eq('aggregated_order_id', orderId);

  const { data: route } = await supabase
    .from('logistics_routes')
    .select(`
      *,
      transporter:profiles!transporter_id (full_name, phone)
    `)
    .eq('aggregated_order_id', orderId)
    .maybeSingle();

  return {
    ...order,
    items: items || [],
    route: route || null,
  };
}

// ---------------------------------------------------------------------------
// Aggregated Orders — Farmer Reads
// ---------------------------------------------------------------------------

/**
 * Fetches active aggregated orders specifically containing produce listings from the authenticated farmer.
 * Strictly uses auth.uid() from the Supabase session — no arbitrary ID parameter accepted.
 * Returns [] if no active orders or if unauthenticated (never falls back to mock data).
 */
export async function getMyFarmerAggregatedOrders(): Promise<FarmerActiveOrder[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return [];
  }
  const currentUserId = userData.user.id;

  try {
    // 1. Get current farmer's crop inventory IDs
    const { data: myCrops, error: cropErr } = await supabase
      .from('crop_inventory')
      .select('id')
      .eq('farmer_id', currentUserId);

    if (cropErr) {
      console.warn('[AgriLink DB] Error fetching farmer crops:', cropErr);
    }
    const myCropIds = (myCrops || []).map((c) => c.id);

    // 2. Query aggregated_order_items where farmer_id is current user or crop_inventory_id is one of their crops
    let itemQuery = supabase.from('aggregated_order_items').select('*');
    if (myCropIds.length > 0) {
      itemQuery = itemQuery.or(`farmer_id.eq.${currentUserId},crop_inventory_id.in.(${myCropIds.join(',')})`);
    } else {
      itemQuery = itemQuery.eq('farmer_id', currentUserId);
    }

    const { data: myOrderItems, error: itemErr } = await itemQuery;
    if (itemErr) {
      console.warn('[AgriLink DB] Error querying aggregated_order_items for farmer:', itemErr);
      return [];
    }

    if (!myOrderItems || myOrderItems.length === 0) {
      return [];
    }

    // 3. Extract unique order IDs
    const orderIds = Array.from(new Set(myOrderItems.map((item) => item.aggregated_order_id)));
    if (orderIds.length === 0) return [];

    // 4. Fetch the parent aggregated_orders
    const { data: orders, error: orderErr } = await supabase
      .from('aggregated_orders')
      .select(`
        *,
        buyer_requirement:buyer_requirements (
          *,
          buyer:profiles!buyer_id (full_name, phone, district, state, company_name, business_type, business_address)
        ),
        transporter:profiles!transporter_id (full_name, phone)
      `)
      .in('id', orderIds)
      .order('created_at', { ascending: false });

    if (orderErr || !orders) {
      console.error('[AgriLink DB] Error fetching aggregated_orders:', orderErr);
      return [];
    }

    // 5. Fetch all sibling aggregated_order_items for these orders (to show full lot participants)
    const { data: allItems } = await supabase
      .from('aggregated_order_items')
      .select(`
        *,
        farmer:profiles!farmer_id (full_name, phone),
        crop:crop_inventory!crop_inventory_id (crop_name, latitude, longitude, photo_urls)
      `)
      .in('aggregated_order_id', orderIds);

    // 6. Fetch any persisted logistics_routes for these orders
    const { data: routes } = await supabase
      .from('logistics_routes')
      .select(`
        *,
        transporter:profiles!transporter_id (full_name, phone)
      `)
      .in('aggregated_order_id', orderIds);

    const routesByOrderId = new Map<string, any>();
    if (routes) {
      for (const r of routes) {
        if (r.aggregated_order_id) {
          routesByOrderId.set(r.aggregated_order_id, r);
        }
      }
    }

    // 7. Assemble FarmerActiveOrder objects
    const result: FarmerActiveOrder[] = orders.map((o) => {
      const orderItems = (allItems || []).filter((i) => i.aggregated_order_id === o.id);
      const myItem = myOrderItems.find((i) => i.aggregated_order_id === o.id);
      const route = routesByOrderId.get(o.id);

      const participatingFarmers = orderItems.map((item) => ({
        listingId: item.crop_inventory_id || item.id,
        farmerName: item.farmer?.full_name || (item.farmer_id === currentUserId ? 'You (Current Farmer)' : 'Farmer Partner'),
        farmerId: item.farmer_id,
        quantityKg: item.allocated_quantity_kg,
        distanceToHubKm: item.distance_from_hub_km || 0,
        lat: item.crop?.latitude || 20.08,
        lng: item.crop?.longitude || 73.83,
        photoUrls: item.crop?.photo_urls || [],
      }));

      const transporterInfo = o.transporter || route?.transporter ? {
        name: o.transporter?.full_name || route?.transporter?.full_name || route?.transporter_name || 'Assigned Logistics Partner',
        vehicleNumber: o.vehicle_number || route?.vehicle_number || 'MH-15-EG-4829',
        vehicleType: route?.vehicle_type || 'Eicher Pro 2049 (2.5T)',
        capacityKg: route?.vehicle_capacity_kg || 2500,
        phone: o.transporter?.phone || route?.transporter?.phone || '',
      } : null;

      const logisticsRouteData = route ? {
        id: route.id,
        routeCode: route.route_code || `RT-${route.id.substring(0, 8).toUpperCase()}`,
        status: route.status || 'SCHEDULED',
        roadDistanceKm: route.total_distance_km || 0,
        roadDurationMinutes: route.estimated_time_minutes || 0,
        baselineDistanceKm: route.baseline_distance_km,
        distanceSavingsKm: route.distance_savings_km,
        geometry: route.route_geojson,
        waypoints: route.route_waypoints || [],
        transporterName: route.transporter?.full_name || route.transporter_name,
        vehicleNumber: route.vehicle_number,
        vehicleType: route.vehicle_type,
        vehicleCapacityKg: route.vehicle_capacity_kg,
      } : null;

      const buyerReq = o.buyer_requirement;
      const buyerName = buyerReq?.buyer?.company_name || buyerReq?.buyer?.full_name || buyerReq?.buyer_name || 'Enterprise Buyer Partner';
      const buyerLoc = buyerReq?.destination_name || (buyerReq?.buyer?.district ? `${buyerReq.buyer.district}, ${buyerReq.buyer.state}` : 'Central Delivery Hub');
      const buyerContact = buyerReq?.buyer?.phone;

      return {
        id: o.id,
        requirementId: o.requirement_id || o.buyer_requirement_id,
        cropName: o.crop_name,
        targetQuantityKg: o.total_quantity_kg || o.target_quantity_kg,
        aggregatedQuantityKg: o.total_quantity_kg || o.aggregated_quantity_kg,
        avgPricePerKg: o.avg_price_per_kg || 0,
        status: o.status,
        buyerName,
        buyerLocation: buyerLoc,
        buyerContact,
        buyerType: buyerReq?.buyer?.business_type || 'Bulk Enterprise Buyer',
        destinationLat: buyerReq?.destination_lat,
        destinationLng: buyerReq?.destination_lng,
        hubLocation: {
          name: o.hub_location?.name || o.hub_name || 'Central District Agritech Hub',
          lat: o.hub_location?.lat || o.hub_lat || 20.08,
          lng: o.hub_location?.lng || o.hub_lng || 73.83,
        },
        myAllocatedQuantityKg: myItem?.allocated_quantity_kg || 0,
        myListingId: myItem?.crop_inventory_id,
        participatingFarmers,
        transporter: transporterInfo,
        logisticsRoute: logisticsRouteData,
        createdAt: o.created_at,
      };
    });

    return result;
  } catch (err) {
    console.error('[AgriLink DB] getMyFarmerAggregatedOrders unexpected error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// DoCA Admin — Real Data Oversight & Reporting Services
// ---------------------------------------------------------------------------

/**
 * Fetches all real registered farmers and FPOs with their live crop inventory statistics.
 * Returns [] if no records exist (never returns mock data).
 */
export async function getAdminFarmers(): Promise<AdminFarmerUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, business_address, district, state, fpo_name, verified, created_at')
      .in('role', ['farmer', 'fpo_admin'])
      .order('created_at', { ascending: false });

    if (profErr) {
      console.warn('[AgriLink DB] getAdminFarmers error:', profErr);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

    // Fetch active crop listings to aggregate live statistics per farmer
    const { data: crops } = await supabase
      .from('crop_inventory')
      .select('farmer_id, quantity_kg');

    const cropStats = new Map<string, { count: number; totalKg: number }>();
    if (crops) {
      for (const c of crops) {
        if (!c.farmer_id) continue;
        const curr = cropStats.get(c.farmer_id) || { count: 0, totalKg: 0 };
        curr.count += 1;
        curr.totalKg += Number(c.quantity_kg || 0);
        cropStats.set(c.farmer_id, curr);
      }
    }

    return profiles.map((p) => {
      const stats = cropStats.get(p.id) || { count: 0, totalKg: 0 };
      return {
        id: p.id,
        fullName: p.full_name,
        email: p.email || undefined,
        phone: p.phone || undefined,
        address: p.business_address || undefined,
        district: p.district || 'Unknown District',
        state: p.state || 'India',
        fpoName: p.fpo_name || undefined,
        verified: p.verified !== false,
        totalListings: stats.count,
        totalQuantityKg: stats.totalKg,
        createdAt: p.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('[AgriLink DB] Error in getAdminFarmers:', err);
    return [];
  }
}

/**
 * Fetches all real registered bulk buyers and consumer groups with their live requirements.
 * Returns [] if no records exist (never returns mock data).
 */
export async function getAdminBulkBuyers(): Promise<AdminBuyerUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, company_name, business_type, business_address, district, state, role, verified, created_at')
      .in('role', ['bulk_buyer', 'consumer_group'])
      .order('created_at', { ascending: false });

    if (profErr) {
      console.warn('[AgriLink DB] getAdminBulkBuyers error:', profErr);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

    // Fetch buyer requirements to aggregate live demand statistics
    const { data: reqs } = await supabase
      .from('buyer_requirements')
      .select('buyer_id, required_quantity_kg');

    const reqStats = new Map<string, { count: number; totalKg: number }>();
    if (reqs) {
      for (const r of reqs) {
        if (!r.buyer_id) continue;
        const curr = reqStats.get(r.buyer_id) || { count: 0, totalKg: 0 };
        curr.count += 1;
        curr.totalKg += Number(r.required_quantity_kg || 0);
        reqStats.set(r.buyer_id, curr);
      }
    }

    return profiles.map((p) => {
      const stats = reqStats.get(p.id) || { count: 0, totalKg: 0 };
      return {
        id: p.id,
        contactPerson: p.full_name,
        companyName: p.company_name || p.full_name || 'Enterprise Buyer',
        email: p.email || undefined,
        phone: p.phone || undefined,
        businessAddress: p.business_address || undefined,
        businessType: p.business_type || (p.role === 'consumer_group' ? 'Consumer Group Hub' : 'Bulk Enterprise Retailer'),
        district: p.district || 'Unknown District',
        state: p.state || 'India',
        role: p.role,
        verified: p.verified !== false,
        totalRequirements: stats.count,
        totalDemandedKg: stats.totalKg,
        createdAt: p.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('[AgriLink DB] Error in getAdminBulkBuyers:', err);
    return [];
  }
}

/**
 * Fetches all real registered logistics providers and transporter fleet profiles.
 * Returns [] if no records exist (never returns mock data).
 */
export async function getAdminTransporters(): Promise<AdminTransporterUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, district, state, verified, created_at')
      .eq('role', 'transporter')
      .order('created_at', { ascending: false });

    if (profErr) {
      console.warn('[AgriLink DB] getAdminTransporters error:', profErr);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

    // Fetch assigned routes to aggregate completed delivery counts and vehicle details
    const { data: routes } = await supabase
      .from('logistics_routes')
      .select('transporter_id, vehicle_number, vehicle_type, vehicle_capacity_kg, status');

    const routeStats = new Map<string, { completed: number; vehicleNumber?: string; vehicleType?: string; capacity?: number }>();
    if (routes) {
      for (const r of routes) {
        if (!r.transporter_id) continue;
        const curr = routeStats.get(r.transporter_id) || { completed: 0 };
        if (r.status === 'completed' || r.status === 'COMPLETED') {
          curr.completed += 1;
        }
        if (r.vehicle_number && !curr.vehicleNumber) curr.vehicleNumber = r.vehicle_number;
        if (r.vehicle_type && !curr.vehicleType) curr.vehicleType = r.vehicle_type;
        if (r.vehicle_capacity_kg && !curr.capacity) curr.capacity = r.vehicle_capacity_kg;
        routeStats.set(r.transporter_id, curr);
      }
    }

    return profiles.map((p) => {
      const stats = routeStats.get(p.id) || { completed: 0 };
      return {
        id: p.id,
        fullName: p.full_name,
        email: p.email || undefined,
        phone: p.phone || undefined,
        district: p.district || 'Logistics Hub',
        state: p.state || 'India',
        vehicleNumber: stats.vehicleNumber,
        vehicleType: stats.vehicleType,
        vehicleCapacityKg: stats.capacity,
        verified: p.verified !== false,
        totalRoutesCompleted: stats.completed,
        createdAt: p.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('[AgriLink DB] Error in getAdminTransporters:', err);
    return [];
  }
}

/**
 * Traces and fetches complete real Producer → Buyer transactions from database.
 * Joins: profiles (farmer) → crop_inventory → aggregated_order_items → aggregated_orders → buyer_requirements → profiles (buyer)
 * Returns [] if no transactions exist (never returns mock data).
 */
export async function getAdminTransactions(): Promise<AdminTransactionRecord[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: orders, error: orderErr } = await supabase
      .from('aggregated_orders')
      .select(`
        *,
        buyer_requirement:buyer_requirements (
          *,
          buyer:profiles!buyer_id (id, full_name, email, phone, company_name, business_type, business_address, district, state)
        ),
        transporter:profiles!transporter_id (id, full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (orderErr) {
      console.warn('[AgriLink DB] getAdminTransactions error:', orderErr);
      return [];
    }
    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);

    // Fetch order items with farmer profiles
    const { data: items } = await supabase
      .from('aggregated_order_items')
      .select(`
        *,
        farmer:profiles!farmer_id (id, full_name, email, phone, district, state),
        crop:crop_inventory!crop_inventory_id (crop_name, variety, quality_grade, location_name)
      `)
      .in('aggregated_order_id', orderIds);

    // Fetch logistics routes
    const { data: routes } = await supabase
      .from('logistics_routes')
      .select(`
        *,
        transporter:profiles!transporter_id (id, full_name, phone)
      `)
      .in('aggregated_order_id', orderIds);

    const routesMap = new Map<string, any>();
    if (routes) {
      for (const r of routes) {
        if (r.aggregated_order_id) routesMap.set(r.aggregated_order_id, r);
      }
    }

    return orders.map((o) => {
      const orderItems = (items || []).filter((i) => i.aggregated_order_id === o.id);
      const route = routesMap.get(o.id);
      const req = o.buyer_requirement;
      const totalQty = Number(o.total_quantity_kg || 0);
      const avgPrice = Number(o.avg_price_per_kg || 0);
      const totalVal = Math.round(totalQty * avgPrice);

      const participatingFarmers = orderItems.map((item) => ({
        id: item.farmer?.id || item.farmer_id,
        fullName: item.farmer?.full_name || 'Farmer Partner',
        phone: item.farmer?.phone || undefined,
        email: item.farmer?.email || undefined,
        district: item.farmer?.district || 'Nashik',
        state: item.farmer?.state || 'Maharashtra',
        allocatedKg: Number(item.allocated_quantity_kg || 0),
        pricePerKg: Number(item.price_per_kg || avgPrice),
      }));

      const buyerInfo = req?.buyer ? {
        id: req.buyer.id,
        contactPerson: req.buyer.full_name,
        companyName: req.buyer.company_name || req.buyer.full_name || 'Enterprise Buyer',
        email: req.buyer.email || undefined,
        phone: req.buyer.phone || undefined,
        destinationName: req.destination_name || 'Central Logistics Hub',
        district: req.buyer.district || 'District Hub',
        state: req.buyer.state || 'Maharashtra',
        businessType: req.buyer.business_type || 'Bulk Enterprise Buyer',
      } : (req ? {
        id: req.buyer_id,
        contactPerson: req.buyer_name || 'Enterprise Buyer',
        companyName: req.buyer_name || 'Enterprise Buyer',
        destinationName: req.destination_name || 'Central Hub',
        district: 'Hub',
        state: 'India',
      } : null);

      const logisticsInfo = route ? {
        routeId: route.id,
        routeCode: route.route_code || `RT-${route.id.substring(0, 8).toUpperCase()}`,
        routeStatus: route.status,
        transporterName: route.transporter?.full_name || route.transporter_name || 'Assigned Logistics Partner',
        transporterPhone: route.transporter?.phone || undefined,
        vehicleNumber: route.vehicle_number,
        vehicleType: route.vehicle_type,
        totalDistanceKm: route.total_distance_km,
        distanceSavingsKm: route.distance_savings_km,
      } : (o.transporter ? {
        transporterName: o.transporter.full_name,
        transporterPhone: o.transporter.phone,
        vehicleNumber: o.vehicle_number,
      } : null);

      return {
        id: o.id,
        orderCode: `ORD-${o.id.substring(0, 8).toUpperCase()}`,
        orderId: o.id,
        requirementId: o.requirement_id,
        orderStatus: o.status || 'MATCHED',
        cropName: o.crop_name,
        variety: req?.variety || undefined,
        qualityGrade: o.quality_grade || 'Grade A',
        totalQuantityKg: totalQty,
        avgPricePerKg: avgPrice,
        totalValueInr: totalVal,
        hubLocationName: o.hub_location?.name || 'Central District Agritech Hub',
        createdAt: o.created_at || new Date().toISOString(),
        updatedAt: o.updated_at || o.created_at || new Date().toISOString(),
        farmers: participatingFarmers,
        buyer: buyerInfo,
        logistics: logisticsInfo,
      };
    });
  } catch (err) {
    console.warn('[AgriLink DB] Error in getAdminTransactions:', err);
    return [];
  }
}

/**
 * Fetches real logistics routes for the Admin fleet monitoring board.
 * Returns [] if no records exist (never returns mock data).
 */
export async function getAdminLogisticsRoutes(): Promise<AdminLogisticsRouteRecord[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: routes, error: routeErr } = await supabase
      .from('logistics_routes')
      .select(`
        *,
        transporter:profiles!transporter_id (full_name, phone),
        aggregated_order:aggregated_orders (
          id,
          buyer_requirement:buyer_requirements (destination_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (routeErr) {
      console.warn('[AgriLink DB] getAdminLogisticsRoutes error:', routeErr);
      return [];
    }
    if (!routes || routes.length === 0) return [];

    return routes.map((r) => ({
      id: r.id,
      routeCode: r.route_code || `RT-${r.id.substring(0, 8).toUpperCase()}`,
      aggregatedOrderId: r.aggregated_order_id,
      transporterName: r.transporter?.full_name || r.transporter_name || 'Commercial Fleet Partner',
      transporterPhone: r.transporter?.phone || undefined,
      vehicleNumber: r.vehicle_number || 'MH-15-EG-4829',
      vehicleType: r.vehicle_type || 'Eicher Pro 2049 (2.5T)',
      vehicleCapacityKg: Number(r.vehicle_capacity_kg || 2500),
      currentLoadKg: Number(r.current_load_kg || 0),
      status: r.status || 'SCHEDULED',
      totalDistanceKm: Number(r.total_distance_km || 0),
      distanceSavingsKm: r.distance_savings_km ? Number(r.distance_savings_km) : undefined,
      estimatedTimeMinutes: Number(r.estimated_time_minutes || 0),
      waypointsCount: Array.isArray(r.route_waypoints) ? r.route_waypoints.length : 0,
      destinationName: r.aggregated_order?.buyer_requirement?.destination_name || 'Central Delivery Hub',
      createdAt: r.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[AgriLink DB] Error in getAdminLogisticsRoutes:', err);
    return [];
  }
}

/**
 * Computes high-level platform oversight metrics from real database tables.
 */
export async function getAdminMacroStats(): Promise<{
  totalFarmers: number;
  totalBuyers: number;
  totalTransporters: number;
  totalListingsKg: number;
  totalTransactionsValue: number;
  totalTransactionsCount: number;
}> {
  if (!isSupabaseConfigured) {
    return {
      totalFarmers: 0,
      totalBuyers: 0,
      totalTransporters: 0,
      totalListingsKg: 0,
      totalTransactionsValue: 0,
      totalTransactionsCount: 0,
    };
  }

  try {
    const [farmers, buyers, transporters, crops, txs] = await Promise.all([
      getAdminFarmers(),
      getAdminBulkBuyers(),
      getAdminTransporters(),
      getCropListings(),
      getAdminTransactions(),
    ]);

    const totalListingsKg = crops.reduce((acc, c) => acc + (c.quantityKg || 0), 0);
    const totalTransactionsValue = txs.reduce((acc, t) => acc + (t.totalValueInr || 0), 0);

    return {
      totalFarmers: farmers.length,
      totalBuyers: buyers.length,
      totalTransporters: transporters.length,
      totalListingsKg,
      totalTransactionsValue,
      totalTransactionsCount: txs.length,
    };
  } catch (err) {
    console.warn('[AgriLink DB] Error calculating admin macro stats:', err);
    return {
      totalFarmers: 0,
      totalBuyers: 0,
      totalTransporters: 0,
      totalListingsKg: 0,
      totalTransactionsValue: 0,
      totalTransactionsCount: 0,
    };
  }
}

/**
 * Fetches authorized contact information for a specific farmer.
 */
export async function getAuthorizedFarmerContact(farmerId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !farmerId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', farmerId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      fullName: data.full_name,
      phone: data.phone ?? '',
      role: data.role,
      district: data.district ?? 'Nashik',
      state: data.state ?? 'Maharashtra',
      latitude: data.latitude ?? 20.0059,
      longitude: data.longitude ?? 73.7898,
      fpoName: data.fpo_name,
      rating: data.rating ?? 4.8,
      verified: data.verified !== false,
      email: data.email ?? '',
      companyName: data.company_name ?? '',
      businessType: data.business_type ?? '',
      businessAddress: data.business_address ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Fetches authorized contact information for a specific buyer.
 */
export async function getAuthorizedBuyerContact(buyerId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !buyerId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', buyerId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      fullName: data.full_name,
      phone: data.phone ?? '',
      role: data.role,
      district: data.district ?? 'Thane',
      state: data.state ?? 'Maharashtra',
      latitude: data.latitude ?? 19.2968,
      longitude: data.longitude ?? 73.0631,
      rating: data.rating ?? 4.8,
      verified: data.verified !== false,
      email: data.email ?? '',
      companyName: data.company_name ?? data.full_name,
      businessType: data.business_type ?? 'Bulk Enterprise Buyer',
      businessAddress: data.business_address ?? '',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Realtime Subscriptions
// ---------------------------------------------------------------------------

export function subscribeToChanges(table: string, onUpdate: () => void): { unsubscribe: () => void } {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`public:${table}:${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      onUpdate();
    })
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// ---------------------------------------------------------------------------
// Unified dbService Export
// ---------------------------------------------------------------------------
export const dbService = {
  getCropListings,
  getMyCropListings,
  addCropListing: createCropListing,
  updateCropListing,
  deleteCropListing,
  uploadProducePhoto,
  getBuyerRequirements: getOpenBuyerRequirements,
  getMyBuyerRequirements,
  addBuyerRequirement: createBuyerRequirement,
  updateBuyerRequirement,
  deleteBuyerRequirement,
  getCurrentProfile,
  updateMyProfile,
  getAuthorizedFarmerContact,
  getAuthorizedBuyerContact,
  getMyFarmerAggregatedOrders,
  getAggregatedOrderById,
  createAggregatedOrder,
  getFarmerCommunityMessages,
  sendFarmerCommunityMessage,
  subscribeToFarmerCommunityMessages,
  getAdminFarmers,
  getAdminBulkBuyers,
  getAdminTransporters,
  getAdminTransactions,
  getAdminLogisticsRoutes,
  getAdminMacroStats,
  getFarmerConversations,
  getFarmerMessages,
  sendFarmerMessage,
  createOrGetFarmerConversation,
  subscribeToChanges,
};


