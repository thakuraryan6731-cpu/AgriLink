import {
  UserProfile,
  CropListing,
  BuyerRequirement,
  CropForecastSummary,
  DoCAMacroMetrics
} from '../types';

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'usr-farmer-01',
    fullName: 'Rameshwar Patil',
    phone: '+91 98224 10923',
    role: 'farmer',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 20.0059,
    longitude: 73.7898,
    fpoName: 'Sahyadri Farmers Producer Co.',
    rating: 4.9,
    verified: true
  },
  {
    id: 'usr-farmer-02',
    fullName: 'Sunita Tukaram Shinde',
    phone: '+91 94231 88472',
    role: 'farmer',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 20.0384,
    longitude: 73.8142,
    fpoName: 'Sahyadri Farmers Producer Co.',
    rating: 4.8,
    verified: true
  },
  {
    id: 'usr-farmer-03',
    fullName: 'Dattatray G. Deshmukh',
    phone: '+91 97632 40192',
    role: 'farmer',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 19.9672,
    longitude: 73.7481,
    fpoName: 'Dindori Agro FPO',
    rating: 4.7,
    verified: true
  },
  {
    id: 'usr-buyer-01',
    fullName: 'Reliance Retail Fresh Ltd',
    phone: '+91 22 4590 1200',
    role: 'bulk_buyer',
    district: 'Thane',
    state: 'Maharashtra',
    latitude: 19.2183,
    longitude: 72.9781,
    rating: 4.9,
    verified: true
  },
  {
    id: 'usr-buyer-02',
    fullName: 'BigBasket Fresh Hub Pune',
    phone: '+91 20 6712 3000',
    role: 'bulk_buyer',
    district: 'Pune',
    state: 'Maharashtra',
    latitude: 18.5204,
    longitude: 73.8567,
    rating: 4.8,
    verified: true
  },
  {
    id: 'usr-buyer-03',
    fullName: 'Bawarchi Gourmet Foods & Hotels',
    phone: '+91 22 2847 9000',
    role: 'bulk_buyer',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    latitude: 19.076,
    longitude: 72.8777,
    rating: 4.6,
    verified: true
  },
  {
    id: 'usr-consumer-hub-01',
    fullName: 'Kalyani Nagar Resident Group Hub',
    phone: '+91 98901 33452',
    role: 'consumer_group',
    district: 'Pune',
    state: 'Maharashtra',
    latitude: 18.5492,
    longitude: 73.9024,
    rating: 4.9,
    verified: true
  },
  {
    id: 'usr-transporter-01',
    fullName: 'MahaKisan Logistics Express',
    phone: '+91 91580 44219',
    role: 'transporter',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 20.0012,
    longitude: 73.7915,
    rating: 4.95,
    verified: true
  },
  {
    id: 'usr-doca-01',
    fullName: 'Dr. Vivek Saraf (Joint Director)',
    phone: '+91 11 2338 4120',
    role: 'doca_admin',
    district: 'New Delhi',
    state: 'Delhi',
    latitude: 28.6139,
    longitude: 77.209,
    rating: 5.0,
    verified: true
  }
];

export const MOCK_CROP_LISTINGS: CropListing[] = [
  {
    id: 'LIST-TM-01',
    farmerId: 'usr-farmer-01',
    farmerName: 'Rameshwar Patil',
    phone: '+91 98224 10923',
    cropName: 'Tomato',
    variety: 'Vaishali Hybrid',
    quantityKg: 650,
    askingPricePerKg: 24.5,
    mandiBenchmarkPrice: 19.0,
    qualityGrade: 'Grade A',
    harvestDate: '2026-09-14',
    locationName: 'Pimpalgaon Baswant, Nashik',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 20.1704,
    longitude: 73.9859,
    status: 'available',
    createdAt: '2026-09-13T08:30:00Z'
  },
  {
    id: 'LIST-TM-02',
    farmerId: 'usr-farmer-02',
    farmerName: 'Sunita Tukaram Shinde',
    phone: '+91 94231 88472',
    cropName: 'Tomato',
    variety: 'Abhinav Firm Red',
    quantityKg: 450,
    askingPricePerKg: 24.0,
    mandiBenchmarkPrice: 19.0,
    qualityGrade: 'Grade A',
    harvestDate: '2026-09-14',
    locationName: 'Dindori Valley, Nashik',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 20.201,
    longitude: 73.834,
    status: 'available',
    createdAt: '2026-09-13T09:15:00Z'
  },
  {
    id: 'LIST-TM-03',
    farmerId: 'usr-farmer-03',
    farmerName: 'Dattatray G. Deshmukh',
    phone: '+91 97632 40192',
    cropName: 'Tomato',
    variety: 'Vaishali Hybrid',
    quantityKg: 400,
    askingPricePerKg: 23.5,
    mandiBenchmarkPrice: 19.0,
    qualityGrade: 'Grade B',
    harvestDate: '2026-09-15',
    locationName: 'Girnare, Nashik',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 19.982,
    longitude: 73.684,
    status: 'available',
    createdAt: '2026-09-13T10:00:00Z'
  },
  {
    id: 'LIST-ON-01',
    farmerId: 'usr-farmer-01',
    farmerName: 'Rameshwar Patil',
    phone: '+91 98224 10923',
    cropName: 'Onion',
    variety: 'Nashik Red Garwa',
    quantityKg: 2200,
    askingPricePerKg: 28.0,
    mandiBenchmarkPrice: 22.5,
    qualityGrade: 'Grade A',
    harvestDate: '2026-09-12',
    locationName: 'Lasalgaon Cluster, Nashik',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 20.1472,
    longitude: 74.2285,
    status: 'available',
    createdAt: '2026-09-12T14:20:00Z'
  },
  {
    id: 'LIST-PT-01',
    farmerId: 'usr-farmer-03',
    farmerName: 'Dattatray G. Deshmukh',
    phone: '+91 97632 40192',
    cropName: 'Potato',
    variety: 'Kufri Jyoti Chipsona',
    quantityKg: 1800,
    askingPricePerKg: 21.0,
    mandiBenchmarkPrice: 16.8,
    qualityGrade: 'Grade A',
    harvestDate: '2026-09-11',
    locationName: 'Manchar Belt, Pune',
    district: 'Pune',
    state: 'Maharashtra',
    latitude: 19.0069,
    longitude: 73.9452,
    status: 'available',
    createdAt: '2026-09-11T11:00:00Z'
  },
  {
    id: 'LIST-PL-01',
    farmerId: 'usr-farmer-02',
    farmerName: 'Sunita Tukaram Shinde',
    phone: '+91 94231 88472',
    cropName: 'Desi Chana (Bengal Gram)',
    variety: 'Digvijay Bold',
    quantityKg: 1200,
    askingPricePerKg: 64.0,
    mandiBenchmarkPrice: 56.5,
    qualityGrade: 'Grade A',
    harvestDate: '2026-09-08',
    locationName: 'Sinnar Agro Hub, Nashik',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 19.845,
    longitude: 73.998,
    status: 'available',
    createdAt: '2026-09-10T16:00:00Z'
  }
];

export const MOCK_BUYER_REQUIREMENTS: BuyerRequirement[] = [
  {
    id: 'REQ-REL-01',
    buyerId: 'usr-buyer-01',
    buyerName: 'Reliance Retail Fresh (Bhiwandi Hub)',
    buyerType: 'Modern Retailer',
    cropName: 'Tomato',
    variety: 'Vaishali / Firm Red',
    requiredQuantityKg: 1500,
    maxPricePerKg: 29.5,
    preferredQualityGrade: 'Grade A',
    deliveryDeadline: '2026-09-16T18:00:00Z',
    destinationName: 'Reliance Fresh Distribution Center, Bhiwandi',
    destinationLat: 19.2968,
    destinationLng: 73.0631,
    status: 'open',
    createdAt: '2026-09-13T07:00:00Z'
  },
  {
    id: 'REQ-BB-01',
    buyerId: 'usr-buyer-02',
    buyerName: 'BigBasket Fulfillment Hub Chakan',
    buyerType: 'Modern Retailer',
    cropName: 'Tomato',
    variety: 'Hybrid Salad Grade',
    requiredQuantityKg: 1200,
    maxPricePerKg: 28.0,
    preferredQualityGrade: 'Grade A',
    deliveryDeadline: '2026-09-17T12:00:00Z',
    destinationName: 'BigBasket Central DC, Chakan Pune',
    destinationLat: 18.7597,
    destinationLng: 73.8587,
    status: 'open',
    createdAt: '2026-09-13T09:30:00Z'
  },
  {
    id: 'REQ-BAW-01',
    buyerId: 'usr-buyer-03',
    buyerName: 'Bawarchi Gourmet Foods Group',
    buyerType: 'Hotel/Restaurant',
    cropName: 'Tomato',
    variety: 'Any Standard Red',
    requiredQuantityKg: 500,
    maxPricePerKg: 26.5,
    preferredQualityGrade: 'Grade B',
    deliveryDeadline: '2026-09-15T15:00:00Z',
    destinationName: 'Central Commissary, Andheri East Mumbai',
    destinationLat: 19.1136,
    destinationLng: 72.8697,
    status: 'open',
    createdAt: '2026-09-13T10:15:00Z'
  },
  {
    id: 'REQ-CG-01',
    buyerId: 'usr-consumer-hub-01',
    buyerName: 'Kalyani Nagar Resident Direct Hub (140 Families)',
    buyerType: 'Consumer Group Hub',
    cropName: 'Tomato',
    variety: 'Farm Fresh Red',
    requiredQuantityKg: 350,
    maxPricePerKg: 27.5,
    preferredQualityGrade: 'Grade A',
    deliveryDeadline: '2026-09-15T09:00:00Z',
    destinationName: 'Society Community Hall, Pune',
    destinationLat: 18.5492,
    destinationLng: 73.9024,
    status: 'open',
    createdAt: '2026-09-13T11:00:00Z'
  },
  {
    id: 'REQ-ON-01',
    buyerId: 'usr-buyer-01',
    buyerName: 'Reliance Retail Fresh (Bhiwandi Hub)',
    buyerType: 'Modern Retailer',
    cropName: 'Onion',
    variety: 'Nashik Red',
    requiredQuantityKg: 4000,
    maxPricePerKg: 33.0,
    preferredQualityGrade: 'Grade A',
    deliveryDeadline: '2026-09-18T18:00:00Z',
    destinationName: 'Reliance Fresh Distribution Center, Bhiwandi',
    destinationLat: 19.2968,
    destinationLng: 73.0631,
    status: 'open',
    createdAt: '2026-09-12T18:00:00Z'
  }
];

export const MOCK_DEMAND_FORECASTS: Record<string, CropForecastSummary> = {
  Tomato: {
    cropName: 'Tomato',
    currentAvgMandiPrice: 19.0,
    projected7DayChangePercent: +18.4,
    projected14DayChangePercent: +26.0,
    threatLevel: 'HIGH',
    recommendedAction: 'Hold for direct B2B pooling or route to Mumbai-Bhiwandi corridor to capture 42% net realization premium over local APMC.',
    suggestedMandiDestination: 'Bhiwandi & Pune Megacity Hubs',
    forecastPoints: [
      { date: '13 Sep', dayLabel: 'Sun', historicalArrivalTonnes: 420, projectedDemandTonnes: 530, predictedMandiPriceInr: 19.0, priceUpperBand: 20.5, priceLowerBand: 17.5, demandIndex: 68 },
      { date: '14 Sep', dayLabel: 'Mon', historicalArrivalTonnes: 390, projectedDemandTonnes: 560, predictedMandiPriceInr: 20.8, priceUpperBand: 22.4, priceLowerBand: 19.2, demandIndex: 75 },
      { date: '15 Sep', dayLabel: 'Tue', historicalArrivalTonnes: 360, projectedDemandTonnes: 590, predictedMandiPriceInr: 22.5, priceUpperBand: 24.2, priceLowerBand: 20.8, demandIndex: 84 },
      { date: '16 Sep', dayLabel: 'Wed', historicalArrivalTonnes: 340, projectedDemandTonnes: 610, predictedMandiPriceInr: 23.8, priceUpperBand: 25.8, priceLowerBand: 21.8, demandIndex: 89 },
      { date: '17 Sep', dayLabel: 'Thu', historicalArrivalTonnes: 310, projectedDemandTonnes: 640, predictedMandiPriceInr: 25.2, priceUpperBand: 27.5, priceLowerBand: 23.0, demandIndex: 94 },
      { date: '18 Sep', dayLabel: 'Fri', historicalArrivalTonnes: 290, projectedDemandTonnes: 670, predictedMandiPriceInr: 26.5, priceUpperBand: 29.0, priceLowerBand: 24.0, demandIndex: 97 },
      { date: '19 Sep', dayLabel: 'Sat', historicalArrivalTonnes: 320, projectedDemandTonnes: 690, predictedMandiPriceInr: 27.2, priceUpperBand: 30.0, priceLowerBand: 24.5, demandIndex: 92 }
    ]
  },
  Onion: {
    cropName: 'Onion',
    currentAvgMandiPrice: 22.5,
    projected7DayChangePercent: +9.2,
    projected14DayChangePercent: +14.5,
    threatLevel: 'MEDIUM',
    recommendedAction: 'Steady demand across northern corridors. Direct aggregation lots recommended for 10-tonne truck pooling.',
    suggestedMandiDestination: 'Azadpur Delhi & Vashi Navi Mumbai',
    forecastPoints: [
      { date: '13 Sep', dayLabel: 'Sun', historicalArrivalTonnes: 1200, projectedDemandTonnes: 1280, predictedMandiPriceInr: 22.5, priceUpperBand: 24.0, priceLowerBand: 21.0, demandIndex: 62 },
      { date: '14 Sep', dayLabel: 'Mon', historicalArrivalTonnes: 1180, projectedDemandTonnes: 1310, predictedMandiPriceInr: 23.2, priceUpperBand: 24.8, priceLowerBand: 21.6, demandIndex: 67 },
      { date: '15 Sep', dayLabel: 'Tue', historicalArrivalTonnes: 1150, projectedDemandTonnes: 1340, predictedMandiPriceInr: 24.0, priceUpperBand: 25.5, priceLowerBand: 22.5, demandIndex: 71 },
      { date: '16 Sep', dayLabel: 'Wed', historicalArrivalTonnes: 1120, projectedDemandTonnes: 1360, predictedMandiPriceInr: 24.8, priceUpperBand: 26.5, priceLowerBand: 23.1, demandIndex: 76 },
      { date: '17 Sep', dayLabel: 'Thu', historicalArrivalTonnes: 1100, projectedDemandTonnes: 1390, predictedMandiPriceInr: 25.4, priceUpperBand: 27.2, priceLowerBand: 23.6, demandIndex: 81 },
      { date: '18 Sep', dayLabel: 'Fri', historicalArrivalTonnes: 1080, projectedDemandTonnes: 1410, predictedMandiPriceInr: 26.1, priceUpperBand: 28.0, priceLowerBand: 24.2, demandIndex: 85 },
      { date: '19 Sep', dayLabel: 'Sat', historicalArrivalTonnes: 1110, projectedDemandTonnes: 1420, predictedMandiPriceInr: 26.8, priceUpperBand: 28.8, priceLowerBand: 24.8, demandIndex: 83 }
    ]
  },
  Potato: {
    cropName: 'Potato',
    currentAvgMandiPrice: 16.8,
    projected7DayChangePercent: -2.4,
    projected14DayChangePercent: +1.2,
    threatLevel: 'LOW',
    recommendedAction: 'Stable cold-storage arrivals. Contract directly with processing units for fixed buy-back pricing.',
    suggestedMandiDestination: 'Agra-Hathras Processing Cluster',
    forecastPoints: [
      { date: '13 Sep', dayLabel: 'Sun', historicalArrivalTonnes: 1800, projectedDemandTonnes: 1780, predictedMandiPriceInr: 16.8, priceUpperBand: 18.0, priceLowerBand: 15.5, demandIndex: 50 },
      { date: '14 Sep', dayLabel: 'Mon', historicalArrivalTonnes: 1820, projectedDemandTonnes: 1790, predictedMandiPriceInr: 16.7, priceUpperBand: 17.8, priceLowerBand: 15.4, demandIndex: 49 },
      { date: '15 Sep', dayLabel: 'Tue', historicalArrivalTonnes: 1850, projectedDemandTonnes: 1800, predictedMandiPriceInr: 16.5, priceUpperBand: 17.6, priceLowerBand: 15.2, demandIndex: 48 },
      { date: '16 Sep', dayLabel: 'Wed', historicalArrivalTonnes: 1860, projectedDemandTonnes: 1810, predictedMandiPriceInr: 16.4, priceUpperBand: 17.5, priceLowerBand: 15.1, demandIndex: 47 },
      { date: '17 Sep', dayLabel: 'Thu', historicalArrivalTonnes: 1870, projectedDemandTonnes: 1820, predictedMandiPriceInr: 16.4, priceUpperBand: 17.4, priceLowerBand: 15.0, demandIndex: 48 },
      { date: '18 Sep', dayLabel: 'Fri', historicalArrivalTonnes: 1840, projectedDemandTonnes: 1830, predictedMandiPriceInr: 16.6, priceUpperBand: 17.7, priceLowerBand: 15.2, demandIndex: 51 },
      { date: '19 Sep', dayLabel: 'Sat', historicalArrivalTonnes: 1810, projectedDemandTonnes: 1840, predictedMandiPriceInr: 16.8, priceUpperBand: 18.0, priceLowerBand: 15.5, demandIndex: 52 }
    ]
  }
};

export const MOCK_DOCA_METRICS: DoCAMacroMetrics = {
  totalFarmersEmpowered: 4820,
  totalProduceTradedTonnes: 14250,
  totalFarmerIncomeGainedInr: 42860000, // ₹4.28 Crore extra net earnings
  avgFarmerGainPercentage: 38.6, // +38.6% vs Mandi baseline
  totalLogisticsFuelSavedInr: 8940000, // ₹89.4 Lakhs saved via CVRP
  totalIntermediariesBypassed: 3, // avg 3 middlemen layers eliminated
  avgPostHarvestLossReductionPercent: 68.4, // -68.4% spoilage reduction
  essentialCommodityRiskAlerts: [
    {
      id: 'ALT-DOCA-01',
      commodity: 'Tomato',
      district: 'Nashik & Kolar Hubs',
      riskType: 'Deficit Risk',
      severity: 'critical',
      summary: 'Projected 28% supply drop in next 7 days due to unseasonal rainfall. Early wholesale price inflation likely in Mumbai & Delhi consumer markets.',
      recommendation: 'Trigger Micro-Cluster Supply Aggregation in Sinnar & Pimpalgaon to direct-channel 400 Tonnes straight to urban consumer hubs at stabilized rates.'
    },
    {
      id: 'ALT-DOCA-02',
      commodity: 'Onion',
      district: 'Lasalgaon Mandi',
      riskType: 'Price Spike Risk',
      severity: 'moderate',
      summary: 'Trader cartel holding buffer stocks; farmgate price stagnant at ₹22/kg while retail in metro reaches ₹48/kg (118% middleman spread).',
      recommendation: 'Enable direct B2B matching with BigBasket and Mother Dairy to bypass APMC commission agents and stabilize retail prices at ₹32/kg.'
    },
    {
      id: 'ALT-DOCA-03',
      commodity: 'Potato',
      district: 'Agra & Western UP',
      riskType: 'Glut Warning',
      severity: 'low',
      summary: 'Cold storage release surge exceeding local regional demand by 18%. Price suppression risk for farmers.',
      recommendation: 'Activate cross-state logistics pooling to route excess yields to Southern processing hubs.'
    }
  ]
};

export const SAMPLE_VOICE_PROMPTS = [
  {
    language: 'Hindi',
    label: 'हिंदी (टमाटर - 650 किलो)',
    transcript: 'नमस्ते, मेरे पास पिंपलगांव में 650 किलो वैशाली टमाटर है, कटाई कल सुबह होगी, ग्रेड ए क्वालिटी है, मुझे 24 रुपये प्रति किलो चाहिए।',
    parsed: {
      cropName: 'Tomato',
      variety: 'Vaishali Hybrid',
      quantityKg: 650,
      askingPricePerKg: 24.0,
      qualityGrade: 'Grade A',
      harvestDate: '2026-09-14',
      locationName: 'Pimpalgaon Baswant, Nashik',
      confidence: 0.96,
      detectedLanguage: 'Hindi'
    }
  },
  {
    language: 'Marathi',
    label: 'मराठी (कांदा - 2000 किलो)',
    transcript: 'माझ्याकडे लासलगाव जवळ 2000 किलो लाल कांदा तयार आहे, चांगला ग्रेड ए माल आहे, मला 28 रुपये भाव पाहिजे, 14 तारखेला गाडी भरता येईल.',
    parsed: {
      cropName: 'Onion',
      variety: 'Nashik Red Garwa',
      quantityKg: 2000,
      askingPricePerKg: 28.0,
      qualityGrade: 'Grade A',
      harvestDate: '2026-09-14',
      locationName: 'Lasalgaon, Nashik',
      confidence: 0.94,
      detectedLanguage: 'Marathi'
    }
  },
  {
    language: 'Telugu',
    label: 'తెలుగు (టమాటా - 500 కిలోలు)',
    transcript: 'నా దగ్గర మదనపల్లెలో 500 కిలోల తాజా టమాటాలు ఉన్నాయి, రేపు కోత ఉంది, గ్రేడ్ A నాణ్యత, కేజీ 25 రూపాయలు కావాలి.',
    parsed: {
      cropName: 'Tomato',
      variety: 'Madanapalle Red',
      quantityKg: 500,
      askingPricePerKg: 25.0,
      qualityGrade: 'Grade A',
      harvestDate: '2026-09-14',
      locationName: 'Madanapalle, Andhra Pradesh',
      confidence: 0.92,
      detectedLanguage: 'Telugu'
    }
  },
  {
    language: 'English',
    label: 'English (Potato - 1500 kg)',
    transcript: 'Hello, I have 1500 kg of fresh Kufri Jyoti potatoes ready in Manchar Pune, Grade A chip quality, asking rate 21 rupees per kg.',
    parsed: {
      cropName: 'Potato',
      variety: 'Kufri Jyoti',
      quantityKg: 1500,
      askingPricePerKg: 21.0,
      qualityGrade: 'Grade A',
      harvestDate: '2026-09-14',
      locationName: 'Manchar, Pune',
      confidence: 0.98,
      detectedLanguage: 'English'
    }
  }
];
