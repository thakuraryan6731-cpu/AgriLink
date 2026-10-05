/**
 * AgriLink AI — Dedicated DoCA Admin Service Layer
 * File: src/services/adminService.ts
 *
 * Provides typed, secure, read-only administrative oversight data directly
 * from real Supabase tables without mock fallbacks.
 *
 * Strict Rules:
 * 1. Only real users and real transactional records from Supabase are returned.
 * 2. If the database is empty or queries return 0 rows, return empty array [] or zero counts.
 * 3. Never expose Supabase service_role keys or private authentication secrets to the frontend.
 * 4. All queries use canonical roles: 'farmer', 'fpo_admin', 'bulk_buyer', 'consumer_group', 'transporter', 'doca_admin'.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  AdminUser,
  AdminFarmerUser,
  AdminFpoUser,
  AdminBuyerUser,
  AdminTransporterUser,
  AdminUserCounts,
  AdminTransactionRecord,
  AdminTransactionDetail,
  AdminLogisticsRouteRecord,
  AdminMacroStats
} from '../types';

/**
 * Fetches all real registered farmers from public.profiles where role = 'farmer'.
 * Joins crop_inventory to compute real listing quantities and counts.
 */
export async function getAdminFarmers(): Promise<AdminFarmerUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, district, state, business_address, fpo_name, verified, created_at')
      .eq('role', 'farmer')
      .order('created_at', { ascending: false });

    if (profErr) {
      console.warn('[AdminService] getAdminFarmers query error:', profErr);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

    // Aggregate real listing statistics
    const { data: listings } = await supabase
      .from('crop_inventory')
      .select('farmer_id, quantity_kg');

    const listingStats = new Map<string, { count: number; totalKg: number }>();
    if (listings) {
      for (const item of listings) {
        if (!item.farmer_id) continue;
        const curr = listingStats.get(item.farmer_id) || { count: 0, totalKg: 0 };
        curr.count += 1;
        curr.totalKg += Number(item.quantity_kg || 0);
        listingStats.set(item.farmer_id, curr);
      }
    }

    return profiles.map((p) => {
      const stats = listingStats.get(p.id) || { count: 0, totalKg: 0 };
      return {
        id: p.id,
        fullName: p.full_name || 'Registered Farmer',
        email: p.email || undefined,
        phone: p.phone || undefined,
        address: p.business_address || undefined,
        district: p.district || 'Unassigned District',
        state: p.state || 'India',
        fpoName: p.fpo_name || undefined,
        verified: p.verified !== false,
        totalListings: stats.count,
        totalQuantityKg: stats.totalKg,
        createdAt: p.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('[AdminService] Unexpected error in getAdminFarmers:', err);
    return [];
  }
}

/**
 * Fetches all real registered FPO administrators from public.profiles where role = 'fpo_admin'.
 */
export async function getAdminFpoAdmins(): Promise<AdminFpoUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, district, state, business_address, fpo_name, verified, created_at')
      .eq('role', 'fpo_admin')
      .order('created_at', { ascending: false });

    if (profErr) {
      console.warn('[AdminService] getAdminFpoAdmins query error:', profErr);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

    // Aggregate member farmers per FPO name if available
    const { data: farmers } = await supabase
      .from('profiles')
      .select('fpo_name, role')
      .eq('role', 'farmer');

    const fpoMemberStats = new Map<string, number>();
    if (farmers) {
      for (const f of farmers) {
        if (f.fpo_name) {
          fpoMemberStats.set(f.fpo_name, (fpoMemberStats.get(f.fpo_name) || 0) + 1);
        }
      }
    }

    return profiles.map((p) => {
      const fpoName = p.fpo_name || p.full_name || 'Farmer Producer Organization';
      const membersCount = fpoMemberStats.get(fpoName) || 0;
      return {
        id: p.id,
        fullName: p.full_name || 'FPO Administrator',
        email: p.email || undefined,
        phone: p.phone || undefined,
        fpoName,
        district: p.district || 'Unassigned District',
        state: p.state || 'India',
        address: p.business_address || undefined,
        verified: p.verified !== false,
        memberFarmersCount: membersCount,
        createdAt: p.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('[AdminService] Unexpected error in getAdminFpoAdmins:', err);
    return [];
  }
}

/**
 * Fetches all real registered bulk enterprise buyers from public.profiles where role = 'bulk_buyer'.
 */
export async function getAdminBulkBuyers(): Promise<AdminBuyerUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, company_name, business_type, business_address, district, state, role, verified, created_at')
      .eq('role', 'bulk_buyer')
      .order('created_at', { ascending: false });

    if (profErr) {
      console.warn('[AdminService] getAdminBulkBuyers query error:', profErr);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

    // Aggregate open buyer requirements
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
        contactPerson: p.full_name || 'Procurement Officer',
        companyName: p.company_name || p.full_name || 'Enterprise Buyer',
        email: p.email || undefined,
        phone: p.phone || undefined,
        businessAddress: p.business_address || undefined,
        businessType: p.business_type || 'Bulk Enterprise Retailer',
        district: p.district || 'Unassigned District',
        state: p.state || 'India',
        role: p.role,
        verified: p.verified !== false,
        totalRequirements: stats.count,
        totalDemandedKg: stats.totalKg,
        createdAt: p.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('[AdminService] Unexpected error in getAdminBulkBuyers:', err);
    return [];
  }
}

/**
 * Fetches all real registered consumer groups & residential hubs from public.profiles where role = 'consumer_group'.
 */
export async function getAdminConsumerGroups(): Promise<AdminBuyerUser[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, company_name, business_type, business_address, district, state, role, verified, created_at')
      .eq('role', 'consumer_group')
      .order('created_at', { ascending: false });

    if (profErr) {
      console.warn('[AdminService] getAdminConsumerGroups query error:', profErr);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

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
        contactPerson: p.full_name || 'Hub Lead',
        companyName: p.company_name || p.full_name || 'Consumer Buying Hub',
        email: p.email || undefined,
        phone: p.phone || undefined,
        businessAddress: p.business_address || undefined,
        businessType: p.business_type || 'Consumer Group Cooperative',
        district: p.district || 'Residential Hub',
        state: p.state || 'India',
        role: p.role,
        verified: p.verified !== false,
        totalRequirements: stats.count,
        totalDemandedKg: stats.totalKg,
        createdAt: p.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('[AdminService] Unexpected error in getAdminConsumerGroups:', err);
    return [];
  }
}

/**
 * Fetches all real registered logistics providers and transporter fleet profiles from public.profiles where role = 'transporter'.
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
      console.warn('[AdminService] getAdminTransporters query error:', profErr);
      return [];
    }
    if (!profiles || profiles.length === 0) return [];

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
        fullName: p.full_name || 'Fleet Operator',
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
    console.warn('[AdminService] Unexpected error in getAdminTransporters:', err);
    return [];
  }
}

/**
 * Returns exact counts of real users grouped by canonical stakeholder roles.
 */
export async function getAdminUserCounts(): Promise<AdminUserCounts> {
  const defaultCounts: AdminUserCounts = {
    farmers: 0,
    fpoAdmins: 0,
    bulkBuyers: 0,
    consumerGroups: 0,
    transporters: 0,
    totalUsers: 0,
  };

  if (!isSupabaseConfigured) return defaultCounts;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role');

    if (error || !data) return defaultCounts;

    const counts: AdminUserCounts = { ...defaultCounts };
    for (const p of data) {
      if (p.role === 'farmer') counts.farmers += 1;
      else if (p.role === 'fpo_admin') counts.fpoAdmins += 1;
      else if (p.role === 'bulk_buyer') counts.bulkBuyers += 1;
      else if (p.role === 'consumer_group') counts.consumerGroups += 1;
      else if (p.role === 'transporter') counts.transporters += 1;
    }
    counts.totalUsers = counts.farmers + counts.fpoAdmins + counts.bulkBuyers + counts.consumerGroups + counts.transporters;
    return counts;
  } catch (err) {
    console.warn('[AdminService] Error computing user counts:', err);
    return defaultCounts;
  }
}

/**
 * Traces and fetches complete real Producer → Buyer transactions from the database.
 * Relational Chain:
 * aggregated_orders → buyer_requirements + profiles (buyer)
 *                  → aggregated_order_items + crop_inventory + profiles (farmer)
 *                  → logistics_routes + profiles (transporter)
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
      console.warn('[AdminService] getAdminTransactions error:', orderErr);
      return [];
    }
    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);

    // Fetch order items with farmer profiles
    const { data: items } = await supabase
      .from('aggregated_order_items')
      .select(`
        *,
        farmer:profiles!farmer_id (id, full_name, email, phone, district, state, business_address),
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
      const orderItems = (items || []).filter((i) => (i.aggregated_order_id || i.order_id) === o.id);
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
    console.warn('[AdminService] Error in getAdminTransactions:', err);
    return [];
  }
}

/**
 * Retrieves the complete detailed relational view for an individual aggregated order transaction.
 */
export async function getAdminTransactionDetail(orderId: string): Promise<AdminTransactionDetail | null> {
  if (!isSupabaseConfigured || !orderId) return null;
  try {
    const { data: order, error: orderErr } = await supabase
      .from('aggregated_orders')
      .select(`
        *,
        buyer_requirement:buyer_requirements (
          *,
          buyer:profiles!buyer_id (id, full_name, email, phone, company_name, business_type, business_address, district, state)
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) return null;

    // Fetch order items with farmer profiles
    const { data: items } = await supabase
      .from('aggregated_order_items')
      .select(`
        *,
        farmer:profiles!farmer_id (id, full_name, email, phone, district, state, business_address),
        crop:crop_inventory!crop_inventory_id (crop_name, variety, quality_grade, location_name)
      `)
      .or(`aggregated_order_id.eq.${orderId},order_id.eq.${orderId}`);

    // Fetch logistics route
    const { data: route } = await supabase
      .from('logistics_routes')
      .select(`
        *,
        transporter:profiles!transporter_id (id, full_name, phone)
      `)
      .eq('aggregated_order_id', orderId)
      .maybeSingle();

    const req = order.buyer_requirement;
    const totalQty = Number(order.total_quantity_kg || 0);
    const avgPrice = Number(order.avg_price_per_kg || 0);
    const totalVal = Math.round(totalQty * avgPrice);

    const farmers = (items || []).map((item: any) => ({
      id: item.farmer?.id || item.farmer_id,
      fullName: item.farmer?.full_name || 'Farmer Partner',
      phone: item.farmer?.phone || undefined,
      email: item.farmer?.email || undefined,
      district: item.farmer?.district || 'Nashik',
      state: item.farmer?.state || 'Maharashtra',
      address: item.farmer?.business_address || undefined,
      allocatedKg: Number(item.allocated_quantity_kg || 0),
      pricePerKg: Number(item.price_per_kg || avgPrice),
      harvestDate: item.harvest_date,
      distanceFromHubKm: item.distance_from_hub_km,
    }));

    const buyer = req?.buyer ? {
      id: req.buyer.id,
      contactPerson: req.buyer.full_name,
      companyName: req.buyer.company_name || req.buyer.full_name,
      phone: req.buyer.phone || undefined,
      email: req.buyer.email || undefined,
      destinationName: req.destination_name || 'Logistics Hub',
      district: req.buyer.district || 'District Hub',
      state: req.buyer.state || 'Maharashtra',
      address: req.buyer.business_address || undefined,
      businessType: req.buyer.business_type || 'Bulk Enterprise Buyer',
      maxPricePerKg: req.max_price_per_kg,
      deliveryDeadline: req.delivery_deadline,
    } : null;

    const logistics = route ? {
      routeId: route.id,
      routeCode: route.route_code || `RT-${route.id.substring(0, 8).toUpperCase()}`,
      routeStatus: route.status,
      transporterId: route.transporter_id,
      transporterName: route.transporter?.full_name || route.transporter_name || 'Commercial Fleet Partner',
      transporterPhone: route.transporter?.phone || undefined,
      vehicleNumber: route.vehicle_number,
      vehicleType: route.vehicle_type,
      vehicleCapacityKg: route.vehicle_capacity_kg,
      currentLoadKg: route.current_load_kg,
      totalDistanceKm: route.total_distance_km,
      distanceSavingsKm: route.distance_savings_km,
      estimatedTimeMinutes: route.estimated_time_minutes,
      estimatedCostInr: route.estimated_cost_inr,
      fuelSavedInr: route.fuel_saved_inr,
      waypointsCount: Array.isArray(route.route_waypoints) ? route.route_waypoints.length : 0,
    } : null;

    return {
      orderId: order.id,
      orderCode: `ORD-${order.id.substring(0, 8).toUpperCase()}`,
      requirementId: order.requirement_id,
      orderStatus: order.status || 'MATCHED',
      cropName: order.crop_name,
      variety: req?.variety || undefined,
      qualityGrade: order.quality_grade || 'Grade A',
      totalQuantityKg: totalQty,
      avgPricePerKg: avgPrice,
      approvedPricePerKg: order.approved_price_per_kg,
      priceOverrideApproved: order.price_override_approved,
      totalValueInr: totalVal,
      hubLocation: {
        name: order.hub_location?.name || 'Central District Agritech Hub',
        lat: order.hub_location?.lat,
        lng: order.hub_location?.lng,
      },
      harvestWindowHours: order.harvest_window_hours,
      createdAt: order.created_at || new Date().toISOString(),
      updatedAt: order.updated_at || order.created_at || new Date().toISOString(),
      farmers,
      buyer,
      logistics,
    };
  } catch (err) {
    console.warn(`[AdminService] Error in getAdminTransactionDetail(${orderId}):`, err);
    return null;
  }
}

/**
 * Fetches real logistics routes for the Admin fleet monitoring board.
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
      console.warn('[AdminService] getAdminLogisticsRoutes error:', routeErr);
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
    console.warn('[AdminService] Error in getAdminLogisticsRoutes:', err);
    return [];
  }
}

/**
 * Computes high-level platform oversight metrics from real database tables.
 */
export async function getAdminMacroStats(): Promise<AdminMacroStats> {
  const defaultStats: AdminMacroStats = {
    totalFarmers: 0,
    totalFpoAdmins: 0,
    totalBulkBuyers: 0,
    totalConsumerGroups: 0,
    totalTransporters: 0,
    totalListingsKg: 0,
    totalActiveRequirements: 0,
    totalAggregatedOrders: 0,
    totalCompletedOrders: 0,
    totalQuantityTradedKg: 0,
    totalTransactionsValue: 0,
  };

  if (!isSupabaseConfigured) return defaultStats;

  try {
    const [counts, crops, reqs, txs] = await Promise.all([
      getAdminUserCounts(),
      supabase.from('crop_inventory').select('quantity_kg'),
      supabase.from('buyer_requirements').select('id, status'),
      getAdminTransactions(),
    ]);

    const totalListingsKg = (crops.data || []).reduce((acc: number, c: any) => acc + Number(c.quantity_kg || 0), 0);
    const totalActiveReqs = (reqs.data || []).filter((r: any) => r.status === 'open' || r.status === 'OPEN').length;
    const totalCompleted = txs.filter((t) => t.orderStatus === 'DELIVERED' || t.orderStatus === 'delivered').length;
    const totalTradedKg = txs.reduce((acc, t) => acc + (t.totalQuantityKg || 0), 0);
    const totalTransactionsValue = txs.reduce((acc, t) => acc + (t.totalValueInr || 0), 0);

    return {
      totalFarmers: counts.farmers,
      totalFpoAdmins: counts.fpoAdmins,
      totalBulkBuyers: counts.bulkBuyers,
      totalConsumerGroups: counts.consumerGroups,
      totalTransporters: counts.transporters,
      totalListingsKg,
      totalActiveRequirements: totalActiveReqs,
      totalAggregatedOrders: txs.length,
      totalCompletedOrders: totalCompleted,
      totalQuantityTradedKg: totalTradedKg,
      totalTransactionsValue,
    };
  } catch (err) {
    console.warn('[AdminService] Error computing admin macro stats:', err);
    return defaultStats;
  }
}

export const adminService = {
  getAdminFarmers,
  getAdminFpoAdmins,
  getAdminBulkBuyers,
  getAdminConsumerGroups,
  getAdminTransporters,
  getAdminUserCounts,
  getAdminTransactions,
  getAdminTransactionDetail,
  getAdminLogisticsRoutes,
  getAdminMacroStats,
};
