import React, { useState } from "react";
import { C } from "../constants/colors";
import { Card, SectionTitle } from "../components/ui/BasicComponents";












export function GlobalSearch({
  salesOrders,
  jobOrders,
  purchaseOrders,
  inward,
  fgStock,
  rawStock,
  dispatches,
  clientMaster,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const term_lower = term.toLowerCase();
    const results = [];

    
    (salesOrders || []).forEach((so) => {
      if (
        so.soNo?.toLowerCase().includes(term_lower) ||
        so.clientName?.toLowerCase().includes(term_lower)
      ) {
        results.push({
          type: "Sales Order",
          id: so.id,
          name: so.soNo,
          detail: so.clientName,
        });
      }
    });

    
    (jobOrders || []).forEach((jo) => {
      if (
        jo.joNo?.toLowerCase().includes(term_lower) ||
        jo.itemName?.toLowerCase().includes(term_lower)
      ) {
        results.push({
          type: "Job Order",
          id: jo.id,
          name: jo.joNo,
          detail: jo.itemName,
        });
      }
    });

    
    (purchaseOrders || []).forEach((po) => {
      if (
        po.poNo?.toLowerCase().includes(term_lower) ||
        po.vendorName?.toLowerCase().includes(term_lower)
      ) {
        results.push({
          type: "Purchase Order",
          id: po.id,
          name: po.poNo,
          detail: po.vendorName,
        });
      }
    });

    setSearchResults(results);
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="🔍"
        title="Global Search"
        sub="Find orders, jobs, and materials across the system"
      />

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by order no., customer, vendor, item name..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            maxWidth: 600,
            fontSize: 14,
            padding: "12px 16px",
          }}
        />
      </div>

      {searchResults.length > 0 ? (
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            Found {searchResults.length} result
            {searchResults.length !== 1 ? "s" : ""}
          </div>
          {searchResults.map((result, i) => (
            <div
              key={i}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = C.surface)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              style={{
                padding: "12px",
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom:
                  i < searchResults.length - 1
                    ? `1px solid ${C.border}22`
                    : "none",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: C.text }}>
                  {result.name}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {result.detail}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.accent,
                  background: C.accent + "22",
                  padding: "4px 10px",
                  borderRadius: 4,
                }}
              >
                {result.type}
              </span>
            </div>
          ))}
        </Card>
      ) : searchTerm ? (
        <Card style={{ padding: 40, textAlign: "center", color: C.muted }}>
          No results found for "{searchTerm}"
        </Card>
      ) : (
        <Card style={{ padding: 40, textAlign: "center", color: C.muted }}>
          Start typing to search...
        </Card>
      )}
    </div>
  );
}
