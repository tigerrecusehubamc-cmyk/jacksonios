import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  raiseTicket,
  getUserTickets,
  getTicketDetails,
  getTicketStats,
  deleteTicket,
  getUserGamesList,
} from "@/lib/api";

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Create a new support ticket
 */
export const createTicket = createAsyncThunk(
  "tickets/createTicket",
  async ({ ticketData, token, profile }, { rejectWithValue }) => {
    try {
      // Map category values to API format
      const categoryMap = {
        bug: "Technical",
        payment: "Payment",
        task_not_credited: "Technical",
        game_issue: "Technical",
        account: "Account",
        other: "Other"
      };

      // Generate subject from category
      const subjectMap = {
        bug: "Bug Report",
        payment: "Payment Issue",
        task_not_credited: "Task Not Credited",
        game_issue: "Game Issue",
        account: "Account Issue",
        other: "Support Request"
      };

      // Format category
      const category = categoryMap[ticketData.category] || "Other";
      
      // Generate subject
      const subject = ticketData.subject || subjectMap[ticketData.category] || "Support Request";
      
      // Get priority (default to High for technical issues, Medium otherwise)
      const priority = ticketData.priority || (category === "Technical" ? "High" : "Medium");

      // Get user contact information
      const contact = {
        name: profile?.firstName && profile?.lastName 
          ? `${profile.firstName} ${profile.lastName}`.trim()
          : profile?.firstName || profile?.name || "User",
        email: profile?.email || "",
        phone: profile?.mobile || profile?.phone || ""
      };

      // Generate tags from category and description
      const tags = ticketData.tags || [];
      if (ticketData.category) {
        tags.push(ticketData.category);
      }
      if (category === "Technical") {
        tags.push("technical", "bug");
      }

      // Process images - convert to base64 for upload
      const images = [];
      if (ticketData.images && ticketData.images.length > 0) {
        // Convert File objects to base64 strings
        const imagePromises = ticketData.images.map((file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
              resolve({
                url: `/uploads/tickets/${file.name}`,
                filename: file.name,
                data: base64 // Include base64 data for upload
              });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
        });
        
        const imageResults = await Promise.all(imagePromises);
        images.push(...imageResults.filter(img => img !== null));
      }

      // Get device info
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
      const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';
      
      // Detect platform
      let detectedPlatform = 'web';
      if (/Android/i.test(userAgent)) {
        detectedPlatform = 'android';
      } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        detectedPlatform = 'ios';
      }

      // Format metadata
      const metadata = {
        deviceInfo: {
          platform: detectedPlatform,
          os: userAgent,
          appVersion: ticketData.deviceInfo?.appVersion || '1.0.0'
        },
        userLocation: {
          ip: "unknown",
          country: "Unknown",
          city: "Unknown"
        }
      };

      // Format final ticket data - send images with url and filename (backend will handle base64)
      const formattedTicketData = {
        subject: subject,
        description: ticketData.description || "",
        priority: priority,
        category: category,
        game: ticketData.gameId || ticketData.game || "",
        contact: contact,
        tags: tags,
        images: images.map(img => ({ url: img.url, filename: img.filename })),
        metadata: metadata
      };

      const response = await raiseTicket(formattedTicketData, token);
      
      // Handle response - check for ticketId or id in response
      if (response?.success) {
        const ticketId = response.data?.ticketId || response.data?.id || response.data?._id;
        if (ticketId) {
          return { ticketId, ...response.data };
        }
      }
      
      throw new Error(response?.message || "Failed to create ticket");
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create ticket");
    }
  }
);

/**
 * Fetch user's tickets with optional filters
 */
export const fetchUserTickets = createAsyncThunk(
  "tickets/fetchUserTickets",
  async ({ filters = {}, token }, { rejectWithValue }) => {
    try {
      const response = await getUserTickets(filters, token);
      if (response?.success && response.data) {
        return {
          tickets: response.data.tickets || [],
          pagination: response.data.pagination || null,
        };
      } else {
        throw new Error(response?.message || "Failed to fetch tickets");
      }
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch tickets");
    }
  }
);

/**
 * Fetch ticket statistics
 */
export const fetchTicketStats = createAsyncThunk(
  "tickets/fetchTicketStats",
  async ({ token }, { rejectWithValue }) => {
    try {
      const response = await getTicketStats(token);
      if (response?.success && response.data) {
        return response.data;
      } else {
        throw new Error(response?.message || "Failed to fetch ticket stats");
      }
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch ticket stats");
    }
  }
);

/**
 * Fetch user's games list for ticket form
 */
export const fetchUserGames = createAsyncThunk(
  "tickets/fetchUserGames",
  async ({ token }, { rejectWithValue }) => {
    try {
      const response = await getUserGamesList(token);
      if (response?.success && response.data) {
        return response.data.games || [];
      } else {
        throw new Error(response?.message || "Failed to fetch user games");
      }
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch user games");
    }
  }
);

/**
 * Delete a ticket
 */
export const removeTicket = createAsyncThunk(
  "tickets/removeTicket",
  async ({ ticketId, token }, { rejectWithValue }) => {
    try {
      const response = await deleteTicket(ticketId, token);
      if (response?.success) {
        return ticketId;
      } else {
        throw new Error(response?.message || "Failed to delete ticket");
      }
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete ticket");
    }
  }
);

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  // Ticket data
  tickets: [],
  userGames: [],
  stats: null,

  // Loading states
  loading: {
    tickets: false,
    stats: false,
    games: false,
    creating: false,
    deleting: false,
  },

  // Error states
  errors: {
    tickets: null,
    stats: null,
    games: null,
    creating: null,
    deleting: null,
  },

  // UI state
  filters: {
    status: "all",
    category: null,
    page: 1,
    limit: 20,
  },

  pagination: null,

  // Success states
  lastCreatedTicket: null,
  lastDeletedTicket: null,
};

// ============================================================================
// SLICE
// ============================================================================

const ticketSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {
    // Clear errors
    clearErrors: (state) => {
      state.errors = {
        tickets: null,
        stats: null,
        games: null,
        creating: null,
        deleting: null,
      };
    },

    // Clear success states
    clearSuccessStates: (state) => {
      state.lastCreatedTicket = null;
      state.lastDeletedTicket = null;
    },

    // Update filters (client-side only, no API call)
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Clear any existing filter errors when updating filters
      state.errors.tickets = null;
    },

    // Reset filters
    resetFilters: (state) => {
      state.filters = {
        status: "all",
        category: null,
        page: 1,
        limit: 20,
      };
    },

    // Clear tickets data
    clearTickets: (state) => {
      state.tickets = [];
      state.pagination = null;
      state.errors.tickets = null;
    },

    // Set loading state
    setLoading: (state, action) => {
      const { key, value } = action.payload;
      state.loading[key] = value;
    },
  },
  extraReducers: (builder) => {
    // ============================================================================
    // CREATE TICKET
    // ============================================================================
    builder
      .addCase(createTicket.pending, (state) => {
        state.loading.creating = true;
        state.errors.creating = null;
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.loading.creating = false;
        state.lastCreatedTicket = action.payload;
        state.errors.creating = null;
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.loading.creating = false;
        state.errors.creating = action.payload;
      });

    // ============================================================================
    // FETCH USER TICKETS
    // ============================================================================
    builder
      .addCase(fetchUserTickets.pending, (state) => {
        state.loading.tickets = true;
        state.errors.tickets = null;
      })
      .addCase(fetchUserTickets.fulfilled, (state, action) => {
        state.loading.tickets = false;
        state.tickets = action.payload.tickets;
        state.pagination = action.payload.pagination;
        state.errors.tickets = null;
      })
      .addCase(fetchUserTickets.rejected, (state, action) => {
        state.loading.tickets = false;
        state.errors.tickets = action.payload;
      });

    // ============================================================================
    // FETCH TICKET STATS
    // ============================================================================
    builder
      .addCase(fetchTicketStats.pending, (state) => {
        state.loading.stats = true;
        state.errors.stats = null;
      })
      .addCase(fetchTicketStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
        state.errors.stats = null;
      })
      .addCase(fetchTicketStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.errors.stats = action.payload;
      });

    // ============================================================================
    // FETCH USER GAMES
    // ============================================================================
    builder
      .addCase(fetchUserGames.pending, (state) => {
        state.loading.games = true;
        state.errors.games = null;
      })
      .addCase(fetchUserGames.fulfilled, (state, action) => {
        state.loading.games = false;
        state.userGames = action.payload;
        state.errors.games = null;
      })
      .addCase(fetchUserGames.rejected, (state, action) => {
        state.loading.games = false;
        state.errors.games = action.payload;
      });

    // ============================================================================
    // DELETE TICKET
    // ============================================================================
    builder
      .addCase(removeTicket.pending, (state) => {
        state.loading.deleting = true;
        state.errors.deleting = null;
      })
      .addCase(removeTicket.fulfilled, (state, action) => {
        state.loading.deleting = false;
        state.tickets = state.tickets.filter(
          (ticket) => ticket.id !== action.payload
        );
        state.lastDeletedTicket = action.payload;
        state.errors.deleting = null;
      })
      .addCase(removeTicket.rejected, (state, action) => {
        state.loading.deleting = false;
        state.errors.deleting = action.payload;
      });
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  clearErrors,
  clearSuccessStates,
  updateFilters,
  resetFilters,
  clearTickets,
  setLoading,
} = ticketSlice.actions;

export default ticketSlice.reducer;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectTickets = (state) => state.tickets.tickets;
export const selectUserGames = (state) => state.tickets.userGames;
export const selectTicketStats = (state) => state.tickets.stats;
export const selectTicketFilters = (state) => state.tickets.filters;
export const selectTicketPagination = (state) => state.tickets.pagination;

export const selectTicketLoading = (state) => state.tickets.loading;
export const selectTicketErrors = (state) => state.tickets.errors;

export const selectLastCreatedTicket = (state) =>
  state.tickets.lastCreatedTicket;
export const selectLastDeletedTicket = (state) =>
  state.tickets.lastDeletedTicket;

// Computed selectors
export const selectFilteredTickets = (state) => {
  const tickets = selectTickets(state);
  const filters = selectTicketFilters(state);

  if (filters.status === "all") return tickets;

  // Client-side filtering for better performance
  return tickets.filter((ticket) => ticket.status === filters.status);
};

// Selector for paginated tickets (client-side pagination)
export const selectPaginatedTickets = (state) => {
  const filteredTickets = selectFilteredTickets(state);
  const filters = selectTicketFilters(state);
  const limit = filters.limit || 20;
  const page = filters.page || 1;

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    tickets: filteredTickets.slice(startIndex, endIndex),
    totalCount: filteredTickets.length,
    hasMore: endIndex < filteredTickets.length,
    currentPage: page,
    totalPages: Math.ceil(filteredTickets.length / limit),
  };
};

export const selectTicketLoadingState = (state) => {
  const loading = selectTicketLoading(state);
  return {
    isLoading: loading.tickets || loading.stats || loading.games,
    isCreating: loading.creating,
    isDeleting: loading.deleting,
    isFiltering: false, // No more filtering loading since we use client-side filtering
  };
};
