/**
 * Engagement Pillar - Wishlist Type Definitions
 * Complete type system for user wishlists and favorites
 */

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type WishlistItemType = 'tour' | 'destination' | 'operator' | 'experience'

export type WishlistStatus = 'active' | 'archived' | 'booked' | 'shared'

// ============================================================================
// WISHLIST INTERFACE
// ============================================================================

export interface Wishlist {
  // Identity
  id: string
  userId: string
  name: string
  description?: string
  isPublic: boolean
  isDefault: boolean

  // Content
  items: WishlistItem[]
  itemCount: number

  // Metadata
  theme?: 'adventure' | 'nature' | 'culture' | 'relaxation' | 'luxury' | 'budget'
  tags?: string[]
  coverImage?: string

  // Sharing
  shareToken?: string
  sharedWith?: Array<{ userId: string; sharedAt: Date }>
  shareSettings?: {
    allowComments: boolean
    allowLikes: boolean
    allowSharing: boolean
  }

  // Statistics
  viewCount: number
  likeCount: number
  shareCount: number
  commentCount: number

  // Timing
  createdAt: Date
  updatedAt: Date
  lastAddedItemAt?: Date
}

// ============================================================================
// WISHLIST ITEM
// ============================================================================

export interface WishlistItem {
  id: string
  wishlistId: string
  itemId: string // tour ID, destination ID, operator ID, etc.
  itemType: WishlistItemType

  // Item details (cached for quick display)
  itemTitle: string
  itemDescription?: string
  itemImage?: string
  itemPrice?: number
  itemRating?: number

  // Status
  status: WishlistStatus
  priority?: number // for ordering
  notes?: string
  visitDate?: Date
  estimatedBudget?: number

  // Engagement
  likeCount: number
  commentCount: number
  bookmarked: boolean

  // Notifications
  notifyOnPriceChange: boolean
  notifyOnAvailability: boolean
  priceWatchThreshold?: number // notify if price drops below

  createdAt: Date
  updatedAt: Date
  bookedAt?: Date
}

// ============================================================================
// WISHLIST COMMENT
// ============================================================================

export interface WishlistComment {
  id: string
  wishlistId: string
  itemId?: string
  userId: string
  userName: string
  userAvatar?: string

  // Content
  comment: string
  rating?: number

  // Engagement
  likes: number
  replies: WishlistComment[]

  // Moderation
  isVisible: boolean
  flaggedAsInappropriate: boolean

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PRICE WATCH
// ============================================================================

export interface PriceWatch {
  id: string
  wishlistItemId: string
  tourId: string
  originalPrice: number
  currentPrice: number
  lowestPriceRecorded: number
  highestPriceRecorded: number

  // Thresholds
  priceDropThreshold: number
  notificationSent: boolean
  notificationSentAt?: Date

  // History
  priceHistory: Array<{ price: number; recordedAt: Date }>

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// WISHLIST COMPARISON
// ============================================================================

export interface WishlistComparison {
  id: string
  userId: string
  name: string
  description?: string

  // Items being compared
  items: Array<{
    wishlistItemId: string
    tourId: string
    title: string
    price: number
    rating: number
    duration: number
    difficulty: string
  }>

  // Comparison criteria
  criteria: string[]

  // Results
  bestValue?: string // item ID
  bestRating?: string
  mostAffordable?: string
  bestDuration?: string

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// RECOMMENDATION
// ============================================================================

export interface WishlistRecommendation {
  id: string
  userId: string
  baseWishlistId?: string
  baseTourId?: string

  // Recommendation
  recommendedTourId: string
  recommendedTourTitle: string
  recommendedTourImage?: string
  recommendedTourPrice?: number
  recommendedTourRating?: number

  // Why it's recommended
  reason: string
  matchingFactors: string[]
  relevanceScore: number // 0-100

  // Engagement
  clicked: boolean
  clickedAt?: Date
  saved: boolean
  savedAt?: Date

  createdAt: Date
}

// ============================================================================
// DTOs
// ============================================================================

export interface WishlistCreate {
  name: string
  description?: string
  isPublic?: boolean
  isDefault?: boolean
  theme?: 'adventure' | 'nature' | 'culture' | 'relaxation' | 'luxury' | 'budget'
  tags?: string[]
  coverImage?: string
}

export interface WishlistUpdate {
  name?: string
  description?: string
  isPublic?: boolean
  theme?: string
  tags?: string[]
  coverImage?: string
}

export interface WishlistItemCreate {
  itemId: string
  itemType: WishlistItemType
  notes?: string
  visitDate?: Date
  estimatedBudget?: number
  notifyOnPriceChange?: boolean
  notifyOnAvailability?: boolean
  priceWatchThreshold?: number
}

export interface WishlistItemUpdate {
  priority?: number
  notes?: string
  visitDate?: Date
  estimatedBudget?: number
  status?: WishlistStatus
  notifyOnPriceChange?: boolean
  notifyOnAvailability?: boolean
  priceWatchThreshold?: number
}

// ============================================================================
// FILTERS & SEARCH
// ============================================================================

export interface WishlistFilters {
  userId?: string
  isPublic?: boolean
  isDefault?: boolean
  status?: WishlistStatus
  theme?: string
  tags?: string[]
  searchQuery?: string
  sortBy?: 'date' | 'name' | 'item_count' | 'view_count'
  sortOrder?: 'asc' | 'desc'
}

export interface WishlistItemFilters {
  wishlistId?: string
  itemType?: WishlistItemType
  status?: WishlistStatus
  priority?: number
  hasPrice?: boolean
  minPrice?: number
  maxPrice?: number
  hasVisitDate?: boolean
  sortBy?: 'date' | 'priority' | 'price' | 'rating'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface WishlistAnalytics {
  userId: string

  // Wishlists
  totalWishlists: number
  publicWishlists: number
  privateWishlists: number
  archivedWishlists: number

  // Items
  totalItems: number
  itemsByType: Record<WishlistItemType, number>
  averageItemsPerWishlist: number

  // Engagement
  totalViews: number
  totalComments: number
  totalLikes: number
  mostLikedWishlist?: string

  // Sharing
  totalShares: number
  totalSharedWith: number
  averageViewsPerSharedWishlist: number

  // Booking
  itemsBooked: number
  bookingRate: number // percentage of items booked

  // Price watching
  itemsWithPriceWatch: number
  priceDropsDetected: number
  averagePriceDrop: number

  // Recommendations
  recommendationsReceived: number
  recommendationsClicked: number
  recommendationClickRate: number

  lastUpdated: Date
}

export interface PopularWishlistItems {
  tourId: string
  tourTitle: string
  tourImage?: string
  tourPrice?: number
  tourRating?: number
  addedToWishlistCount: number
  bookedFromWishlistCount: number
  averageBookingRate: number
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class WishlistNotFoundError extends Error {
  constructor(wishlistId: string) {
    super(`Wishlist not found: ${wishlistId}`)
    this.name = 'WishlistNotFoundError'
  }
}

export class WishlistItemNotFoundError extends Error {
  constructor(itemId: string) {
    super(`Wishlist item not found: ${itemId}`)
    this.name = 'WishlistItemNotFoundError'
  }
}

export class DuplicateWishlistItemError extends Error {
  constructor(tourId: string) {
    super(`Item already in wishlist: ${tourId}`)
    this.name = 'DuplicateWishlistItemError'
  }
}

export class InvalidWishlistAccessError extends Error {
  constructor(wishlistId: string) {
    super(`Invalid access to wishlist: ${wishlistId}`)
    this.name = 'InvalidWishlistAccessError'
  }
}

export class WishlistLimitExceededError extends Error {
  constructor(limit: number) {
    super(`Wishlist item limit exceeded: ${limit}`)
    this.name = 'WishlistLimitExceededError'
  }
}

export class InvalidShareTokenError extends Error {
  constructor() {
    super('Invalid or expired share token')
    this.name = 'InvalidShareTokenError'
  }
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Wishlist,
  WishlistItem,
  WishlistComment,
  PriceWatch,
  WishlistComparison,
  WishlistRecommendation,
  WishlistCreate,
  WishlistUpdate,
  WishlistItemCreate,
  WishlistItemUpdate,
  WishlistFilters,
  WishlistItemFilters,
  WishlistAnalytics,
  PopularWishlistItems
}
