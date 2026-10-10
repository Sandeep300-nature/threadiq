import React from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export const SearchBar = () => {
  const { searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Navigate to inventory with active search
      navigate('/inventory');
    }
  };

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <Search size={17} className="search-icon" />
        <input
          type="text"
          id="global-search-input"
          placeholder="Search products, SKUs, sizes (XL-5XL), or stores..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="search-input"
          aria-label="Search inventory products"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="search-clear-btn"
            aria-label="Clear search input"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
