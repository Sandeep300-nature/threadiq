import React, { useState, useEffect, useMemo } from 'react';
import { ProductCard } from '../components/inventory/ProductCard';
import { InventoryToolbar } from '../components/inventory/InventoryToolbar';
import { Pagination } from '../components/inventory/Pagination';
import { StockScannerModal } from '../components/inventory/StockScannerModal';
import { InventoryApprovalDialog } from '../components/inventory/InventoryApprovalDialog';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { SIZE_WEIGHTS, STATUS_WEIGHTS, getStockStatusInfo } from '../utils/stockUtils';
import { Search, RefreshCw, Barcode } from 'lucide-react';
import { backendInventoryProvider } from '../../employee-dashboard/integration/backendInventoryProvider.js';

import { useSearchParams } from 'react-router-dom';

export const Inventory = () => {
  const { searchQuery, setSearchQuery, addToast, handleApproveRecommendation, handleRejectRecommendation } = useApp();
  const [searchParams] = useSearchParams();
  const initialStore = searchParams.get('store') || 'All Stores';
  const initialApproval = searchParams.get('approvalStatus') || 'All';

  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Approval decision confirmation modal state
  const [approvalDialogState, setApprovalDialogState] = useState({
    isOpen: false,
    product: null,
    decisionType: 'approve'
  });

  // Filter state
  const [filters, setFilters] = useState({
    store: initialStore,
    size: 'All Sizes',
    category: 'All Categories',
    status: 'All Statuses',
    approvalStatus: initialApproval
  });

  // Sorting state
  const [sortBy, setSortBy] = useState('name-asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedItems, fetchedStores] = await Promise.all([
        api.fetchInventory({ ...filters, search: searchQuery }),
        api.fetchStores()
      ]);
      setItems(fetchedItems || []);
      setStores(fetchedStores || []);
    } catch (err) {
      console.error('Error fetching inventory', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when filters or search change
  useEffect(() => {
    loadData();
    const unsubscribe = backendInventoryProvider.subscribeToUpdates(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [filters, searchQuery]);

  // Reset to page 1 whenever filters, search, or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, sortBy, itemsPerPage]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      store: 'All Stores',
      size: 'All Sizes',
      category: 'All Categories',
      status: 'All Statuses',
      approvalStatus: 'All'
    });
    setSortBy('name-asc');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Handle opening approval confirmation dialog from card
  const handleOpenApproveDialog = (product) => {
    setApprovalDialogState({
      isOpen: true,
      product,
      decisionType: 'approve'
    });
  };

  // Handle opening rejection confirmation dialog from card
  const handleOpenRejectDialog = (product) => {
    setApprovalDialogState({
      isOpen: true,
      product,
      decisionType: 'reject'
    });
  };

  // Confirm decision and commit mutation
  const handleConfirmDecision = async (productId, notes, proposalId, decisionPayload = null) => {
    const isApprove = approvalDialogState.decisionType === 'approve';
    try {
      if (isApprove) {
        await api.approveInventoryItem(productId, notes, decisionPayload);
        setItems(prev =>
          prev.map(item =>
            item.id === productId ? {
              ...item,
              approvalStatus: 'Approved',
              approvalNotes: notes,
              ...(decisionPayload ? { decisionPayload } : {})
            } : item
          )
        );
        if (proposalId) {
          handleApproveRecommendation(proposalId, notes);
        }
        const actionLabel = decisionPayload?.strategy === 'transfer'
          ? `Approved transfer of ${decisionPayload.transferQty} units from ${decisionPayload.sourceStore?.storeName || 'source store'}`
          : 'Approved supplier purchase reorder';
        addToast(`${actionLabel} for ${approvalDialogState.product?.name}`, 'success');
      } else {
        await api.rejectInventoryItem(productId, notes);
        setItems(prev =>
          prev.map(item =>
            item.id === productId ? { ...item, approvalStatus: 'Rejected', rejectionReason: notes } : item
          )
        );
        if (proposalId) {
          handleRejectRecommendation(proposalId, notes);
        }
        addToast(`Rejected proposal for ${approvalDialogState.product?.name}`, 'danger');
      }
    } catch (err) {
      console.error('Approval operation failed', err);
      addToast('Failed to commit approval decision', 'danger');
    }
  };

  // Handle stock update from camera/barcode scanner modal
  const handleUpdateStockFromScan = (itemId, newQty, opType) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === itemId) {
          const statusObj = getStockStatusInfo(newQty, it.minThreshold, it.maxThreshold);
          return { ...it, availableQty: newQty, stockStatus: statusObj.status };
        }
        return it;
      })
    );
    addToast(`Physical scan committed (${opType}): Stock updated to ${newQty} units`, 'success');
  };

  // Sort items according to active sort option
  const sortedItems = useMemo(() => {
    const list = [...items];
    switch (sortBy) {
      case 'name-asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'qty-asc':
        return list.sort((a, b) => (a.availableQty || 0) - (b.availableQty || 0));
      case 'qty-desc':
        return list.sort((a, b) => (b.availableQty || 0) - (a.availableQty || 0));
      case 'size':
        return list.sort((a, b) => (SIZE_WEIGHTS[a.size] || 99) - (SIZE_WEIGHTS[b.size] || 99));
      case 'status': {
        return list.sort((a, b) => {
          const aStat = getStockStatusInfo(a.availableQty, a.minThreshold, a.maxThreshold).type;
          const bStat = getStockStatusInfo(b.availableQty, b.minThreshold, b.maxThreshold).type;
          return (STATUS_WEIGHTS[aStat] || 99) - (STATUS_WEIGHTS[bStat] || 99);
        });
      }
      default:
        return list;
    }
  }, [items, sortBy]);

  // Paginate sorted items
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return sortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedItems, safeCurrentPage, itemsPerPage]);

  return (
    <div className="inventory-page-container">
      {/* 1. Header Section */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="technical-index">[ PRODUCT INVENTORY // EXTENDED CATALOGUE ]</span>
            <span className="demo-tag">Live Catalogue</span>
          </div>
          <h1 className="page-title">
            Product Inventory
          </h1>
          <p className="page-subtitle">
            Visual inventory catalogue across store network nodes. Monitor real-time quantities and threshold imbalances.
          </p>
        </div>

        <div className="header-actions">
          {/* Scan Barcode / Camera Audit Action */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-primary"
            title="Open Camera / Barcode Stock Scanner"
            aria-label="Scan barcode or audit stock"
          >
            <Barcode size={15} />
            <span>Scan Barcode / Audit</span>
          </button>

          {/* Sync / Refresh Data */}
          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            title="Refresh inventory records"
            aria-label="Sync inventory"
          >
            <RefreshCw size={13} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Filters & Sorting Toolbar with Legend */}
      <InventoryToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onReset={handleResetFilters}
        storeOptions={stores}
      />

      {/* 3. Main Product Grid & Content Area */}
      {loading ? (
        <LoadingState message="Loading product inventory..." />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No products found"
          description={
            searchQuery
              ? `No inventory items found matching "${searchQuery}". Try adjusting your search or resetting filters.`
              : 'No items currently match the selected store, size, category, or status criteria.'
          }
          actionLabel="Reset All Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <>
          {/* Responsive Card Grid */}
          <div className="inventory-product-grid" role="region" aria-label="Product inventory cards">
            {paginatedItems.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onApprove={handleOpenApproveDialog}
                onReject={handleOpenRejectDialog}
              />
            ))}
          </div>

          {/* 4. Pagination at Bottom-Right */}
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(perPage) => setItemsPerPage(perPage)}
          />
        </>
      )}

      {/* Confirmation Dialog for Card Approvals and Rejections */}
      <InventoryApprovalDialog
        isOpen={approvalDialogState.isOpen}
        onClose={() => setApprovalDialogState(prev => ({ ...prev, isOpen: false }))}
        product={approvalDialogState.product}
        decisionType={approvalDialogState.decisionType}
        onConfirm={handleConfirmDecision}
        allInventory={items}
        storesList={stores}
      />

      {/* Camera / Barcode Stock Scanner Modal (Preserved) */}
      <StockScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        inventory={items}
        onUpdateStock={handleUpdateStockFromScan}
      />
    </div>
  );
};
