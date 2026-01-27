
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';

interface Props {
  products: Product[];
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export const AutocompleteSearch: React.FC<Props> = ({ products, onSelect, placeholder }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length > 1) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.sku.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || "Escribe el nombre del producto..."}
          className="w-full px-5 py-3 pl-12 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-fade-in">
          {suggestions.map((product) => (
            <li
              key={product.id}
              onClick={() => {
                onSelect(product);
                setQuery(product.name);
                setIsOpen(false);
              }}
              className="px-5 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors"
            >
              <div>
                <p className="font-medium text-slate-800">{product.name}</p>
                <p className="text-xs text-slate-400">{product.sku} • {product.category}</p>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                Stock: {product.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
