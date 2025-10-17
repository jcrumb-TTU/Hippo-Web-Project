// dashboard.js - Professional dashboard with category management and search
(function() {
  'use strict';

  // API Configuration
  const API = {
    me: '/api/me',
    profile: '/api/user/profile',
    items: '/api/items',
    userItems: '/api/user/items',
    lendings: '/api/user/lendings',
    logout: '/api/logout'
  };

  // Category definitions with Font Awesome icons
  const CATEGORIES = [
    { id: 'electronics', name: 'Electronics', icon: 'fa-laptop', color: '#4a90e2' },
    { id: 'tools', name: 'Tools', icon: 'fa-screwdriver-wrench', color: '#f39c12' },
    { id: 'sports', name: 'Sports', icon: 'fa-basketball', color: '#e74c3c' },
    { id: 'books', name: 'Books', icon: 'fa-book', color: '#9b59b6' },
    { id: 'clothing', name: 'Clothing', icon: 'fa-shirt', color: '#3498db' },
    { id: 'furniture', name: 'Furniture', icon: 'fa-couch', color: '#e67e22' },
    { id: 'appliances', name: 'Appliances', icon: 'fa-blender', color: '#1abc9c' },
    { id: 'camping', name: 'Camping', icon: 'fa-campground', color: '#27ae60' },
    { id: 'music', name: 'Music', icon: 'fa-music', color: '#e91e63' },
    { id: 'games', name: 'Games', icon: 'fa-gamepad', color: '#8e44ad' },
    { id: 'automotive', name: 'Automotive', icon: 'fa-car', color: '#34495e' },
    { id: 'gardening', name: 'Gardening', icon: 'fa-seedling', color: '#2ecc71' },
    { id: 'photography', name: 'Photography', icon: 'fa-camera', color: '#e74c3c' },
    { id: 'kitchen', name: 'Kitchen', icon: 'fa-utensils', color: '#f39c12' },
    { id: 'toys', name: 'Toys', icon: 'fa-puzzle-piece', color: '#ff6b6b' },
    { id: 'other', name: 'Other', icon: 'fa-box', color: '#95a5a6' }
  ];

  // State Management
  let userBalance = 0;
  let allItems = [];
  let lendingItems = [];
  let currentUser = null;

  // DOM Elements
  const elements = {
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    balanceAmount: document.getElementById('balanceAmount'),
    logoutLink: document.getElementById('logoutLink'),
    alertContainer: document.getElementById('alertContainer'),
    itemsGrid: document.getElementById('itemsGrid'),
    emptyItemsState: document.getElementById('emptyItemsState'),
    lendingItemsGrid: document.getElementById('lendingItemsGrid'),
    emptyLendingItemsState: document.getElementById('emptyLendingItemsState')
  };

  /* ==================== AUTHENTICATION ==================== */

  // Run session guard FIRST
  (async function sessionGuard(){
    const r = await fetch(API.me, { credentials: 'include' });
    if(!r.ok){
      window.location.href = '../login.html';
    }
  })();

  /**
   * Handle logout
   */
  async function handleLogout(e) {
    e.preventDefault();
    try {
      await fetch(API.logout, { method: 'POST', credentials: 'include' });
    } catch {}
    window.location.href = '../login.html';
  }

  /* ==================== DATA FETCHING ==================== */

  /**
   * Load user profile data
   */
  async function loadProfile() {
    try {
      const r = await fetch(API.profile, { credentials: 'include' });
      if (!r.ok) return;
      const data = await r.json();

      // Update balance if available
      if (data && typeof data.balance !== 'undefined') {
        userBalance = data.balance;
        updateBalanceDisplay();
      }
    } catch (err) {
      console.debug('Profile load failed:', err);
    }
  }

  /**
   * Fetch items from API
   */
  async function fetchItems() {
    try {
      const res = await fetch(API.items, { credentials: 'include' });
      if (!res.ok) {
        // Try user items endpoint as fallback
        const userRes = await fetch(API.userItems, { credentials: 'include' });
        if (!userRes.ok) {
          throw new Error('Failed to fetch items');
        }
        return await userRes.json();
      }
      return await res.json();
    } catch (error) {
      console.error('Error fetching items:', error);
      // Return empty array on error to allow UI to render
      return [];
    }
  }

  /**
   * Fetch lending items from API
   */
  async function fetchLendingItems() {
    try {
      const res = await fetch(API.lendings, { credentials: 'include' });
      if (!res.ok) {
        console.debug('Lendings endpoint not available');
        return [];
      }
      return await res.json();
    } catch (error) {
      console.debug('Error fetching lendings:', error);
      // Return empty array on error to allow UI to render
      return [];
    }
  }

  /* ==================== UI RENDERING ==================== */

  /**
   * Create item card element
   */
  function createItemCard(item, isLending = false) {
    const card = document.createElement('div');
    card.className = 'item-card';

    // Get category info
    const categoryId = (item.category || 'other').toLowerCase();
    const category = CATEGORIES.find(cat => cat.id === categoryId) || CATEGORIES.find(cat => cat.id === 'other');

    // Get first image or use placeholder
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

    // Determine status based on lending or available
    const statusIcon = isLending ? 'fa-handshake' : 'fa-circle-check';
    const statusText = isLending ? 'Lending' : 'Available';
    const statusColor = isLending ? '#f39c12' : 'var(--accent)';

    card.innerHTML = `
      <div class="item-image">
        ${imageUrl ? `<img src="${imageUrl}" alt="${item.itemName || 'Item'}" />` : `<i class="fa-solid ${category.icon}"></i>`}
      </div>
      <div class="item-content">
        <div class="item-title">${item.itemName || 'Unnamed Item'}</div>
        <div class="item-description">${item.description || 'No description available'}</div>
        <div class="item-meta">
          <span class="item-category">
            <i class="fa-solid ${category.icon}"></i>
            ${category.name}
          </span>
          <span class="item-status" style="color: ${statusColor};">
            <i class="fa-solid ${statusIcon}"></i>
            ${statusText}
          </span>
        </div>
      </div>
    `;

    // Click handler
    card.addEventListener('click', () => handleItemClick(item));

    return card;
  }

  /**
   * Render all items
   */
  function renderItems(filteredItems = null) {
    if (!elements.itemsGrid || !elements.emptyItemsState) return;

    elements.itemsGrid.innerHTML = '';

    const itemsToRender = filteredItems !== null ? filteredItems : allItems;

    if (itemsToRender.length === 0) {
      elements.emptyItemsState.classList.add('show');
      elements.itemsGrid.style.display = 'none';
      return;
    }

    elements.emptyItemsState.classList.remove('show');
    elements.itemsGrid.style.display = 'grid';

    // Show only first 6 items
    const itemsToShow = itemsToRender.slice(0, 6);

    itemsToShow.forEach(item => {
      const card = createItemCard(item, false);
      elements.itemsGrid.appendChild(card);
    });
  }

  /**
   * Render lending items
   */
  function renderLendingItems(filteredItems = null) {
    if (!elements.lendingItemsGrid || !elements.emptyLendingItemsState) return;

    elements.lendingItemsGrid.innerHTML = '';

    const itemsToRender = filteredItems !== null ? filteredItems : lendingItems;

    if (itemsToRender.length === 0) {
      elements.emptyLendingItemsState.classList.add('show');
      elements.lendingItemsGrid.style.display = 'none';
      return;
    }

    elements.emptyLendingItemsState.classList.remove('show');
    elements.lendingItemsGrid.style.display = 'grid';

    // Show only first 6 lending items
    const itemsToShow = itemsToRender.slice(0, 6);

    itemsToShow.forEach(item => {
      const card = createItemCard(item, true);
      elements.lendingItemsGrid.appendChild(card);
    });
  }

  /**
   * Handle item click
   */
  function handleItemClick(item) {
    console.log('Item clicked:', item);
    showAlert(`${item.itemName || 'Item'} - Click to view details`, 'info');
    // TODO: Navigate to item detail page
    // window.location.href = `item.html?id=${item.id}`;
  }

  /**
   * Update balance display
   */
  function updateBalanceDisplay() {
    if (elements.balanceAmount) {
      elements.balanceAmount.textContent = `HB ${userBalance.toFixed(2)}`;
    }
  }

  /**
   * Show alert message
   */
  function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = 'custom-alert alert-dismissible';

    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };

    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };

    alert.innerHTML = `
      <i class="fa-solid ${icons[type]}" style="color: ${colors[type]}; font-size: 1.5rem;"></i>
      <div style="flex: 1;">${message}</div>
      <button type="button" class="btn-close" aria-label="Close"></button>
    `;

    elements.alertContainer.appendChild(alert);

    // Auto dismiss after 5 seconds
    const timeout = setTimeout(() => {
      alert.remove();
    }, 5000);

    // Manual dismiss
    const closeBtn = alert.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => {
      clearTimeout(timeout);
      alert.remove();
    });
  }

  /* ==================== EVENT HANDLERS ==================== */

  /**
   * Handle search input
   */
  function handleSearch() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();

    // Show/hide clear button
    if (searchTerm) {
      elements.clearSearch.classList.add('show');
    } else {
      elements.clearSearch.classList.remove('show');
    }

    // Filter items if search term exists
    if (!searchTerm) {
      renderItems();
      renderLendingItems();
      return;
    }

    // Filter available items
    const filteredAvailableItems = allItems.filter(item => {
      const itemName = (item.itemName || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const category = (item.category || '').toLowerCase();

      return itemName.includes(searchTerm) ||
             description.includes(searchTerm) ||
             category.includes(searchTerm);
    });

    // Filter lending items
    const filteredLendingItems = lendingItems.filter(item => {
      const itemName = (item.itemName || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const category = (item.category || '').toLowerCase();

      return itemName.includes(searchTerm) ||
             description.includes(searchTerm) ||
             category.includes(searchTerm);
    });

    renderItems(filteredAvailableItems);
    renderLendingItems(filteredLendingItems);
  }

  /**
   * Clear search
   */
  function clearSearch() {
    elements.searchInput.value = '';
    elements.clearSearch.classList.remove('show');
    renderItems();
    renderLendingItems();
    elements.searchInput.focus();
  }

  /* ==================== INITIALIZATION ==================== */

  /**
   * Initialize dashboard
   */
  async function initDashboard() {
    try {
      // Show loading spinner
      elements.loadingSpinner.classList.add('show');

      // Load profile, items, and lendings in parallel
      await Promise.all([
        loadProfile(),
        fetchItems().then(items => {
          allItems = items;
        }),
        fetchLendingItems().then(items => {
          lendingItems = items;
        })
      ]);

      // Render UI
      renderItems();
      renderLendingItems();

      // Hide loading spinner
      elements.loadingSpinner.classList.remove('show');

      console.log('Dashboard initialized successfully');
      console.log('Total items:', allItems.length);
      console.log('Lending items:', lendingItems.length);

    } catch (error) {
      console.error('Dashboard initialization error:', error);
      elements.loadingSpinner.classList.remove('show');
      showAlert('Failed to load dashboard data', 'error');
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Search functionality
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', handleSearch);

      // Enter key to search
      elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSearch();
        }
      });
    }

    // Clear search button
    if (elements.clearSearch) {
      elements.clearSearch.addEventListener('click', clearSearch);
    }

    // Logout
    if (elements.logoutLink) {
      elements.logoutLink.addEventListener('click', handleLogout);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        elements.searchInput.focus();
      }

      // Escape to clear search
      if (e.key === 'Escape' && elements.searchInput === document.activeElement) {
        clearSearch();
      }
    });
  }

  /* ==================== ENTRY POINT ==================== */

  /**
   * Initialize when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
      initDashboard();
    });
  } else {
    setupEventListeners();
    initDashboard();
  }

})();
