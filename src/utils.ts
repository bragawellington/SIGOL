// Utils for SIGOL Formatting & Exporting

// Currency Formatter (BRL)
export function formatCurrency(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

// Decimal Formatter (1.234,56)
export function formatDecimal(value: number | undefined, fractionDigits = 2): string {
  if (value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

// Date Formatter (YYYY-MM-DD -> DD/MM/YYYY)
export function formatDateBR(dateString: string | undefined): string {
  if (!dateString) return "";
  const parts = dateString.split("T")[0].split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Time Formatter from ISO string (HH:MM)
export function formatTime(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Full Date-Time Formatter (DD/MM/YYYY HH:MM:SS)
export function formatDateTimeBR(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return isoString;
  }
}

// CSV/Excel Export helper
export function exportToCSV(filename: string, headers: string[], rows: any[][]) {
  // UTF-8 BOM for Microsoft Excel compatibility (correct special char accents)
  const BOM = "\uFEFF";
  let csvContent = BOM;
  
  // Headers row
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(";") + "\r\n";
  
  // Data rows
  rows.forEach(row => {
    const rowStr = row.map(value => {
      let cell = value === null || value === undefined ? "" : String(value);
      // Clean up string values
      cell = cell.replace(/"/g, '""');
      return `"${cell}"`;
    }).join(";");
    csvContent += rowStr + "\r\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Dynamic Custom PDF/Print helper
export function triggerPrint() {
  window.print();
}
