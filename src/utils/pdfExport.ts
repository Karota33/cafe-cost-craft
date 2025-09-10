// PDF Export utilities
// This is a basic implementation - in production you'd use libraries like jsPDF or puppeteer

export interface RecipePDFData {
  name: string;
  type: 'PREP' | 'PLATE';
  target_batch_qty: number;
  target_batch_unit: string;
  servings?: number;
  prep_time_minutes?: number;
  cooking_time_minutes?: number;
  instructions: string;
  chef_notes?: string;
  allergen_info: string[];
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    cost: number;
    loss_pct: number;
  }>;
  costs: {
    ingredient_cost: number;
    labor_cost: number;
    overhead_cost: number;
    total_cost: number;
    cost_per_serving?: number;
  };
  food_cost_percentage?: number;
  target_price?: number;
}

export const generateRecipePDF = async (recipe: RecipePDFData): Promise<string> => {
  // This is a simplified implementation
  // In production, you'd use a proper PDF library
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ficha Técnica - ${recipe.name}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          line-height: 1.4;
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #007bff; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header h1 { 
          color: #007bff; 
          margin: 0;
          font-size: 24px;
        }
        .header .type { 
          background: #007bff; 
          color: white; 
          padding: 4px 12px; 
          border-radius: 4px; 
          display: inline-block;
          margin-top: 10px;
          font-size: 12px;
        }
        .section { 
          margin-bottom: 25px; 
        }
        .section h2 { 
          color: #007bff; 
          border-bottom: 1px solid #ddd; 
          padding-bottom: 5px;
          font-size: 16px;
          margin-bottom: 15px;
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin-bottom: 20px;
        }
        .info-item { 
          display: flex; 
          justify-content: space-between;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .ingredients-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 20px;
        }
        .ingredients-table th, 
        .ingredients-table td { 
          border: 1px solid #ddd; 
          padding: 8px; 
          text-align: left;
        }
        .ingredients-table th { 
          background: #f8f9fa; 
          font-weight: bold;
        }
        .costs-summary {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }
        .cost-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .total-cost {
          font-weight: bold;
          font-size: 18px;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        .allergens {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .allergen {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .instructions {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          white-space: pre-line;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        @media print {
          body { margin: 20px; }
          .header { page-break-after: avoid; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${recipe.name}</h1>
        <div class="type">${recipe.type === 'PREP' ? 'PREPARACIÓN BASE' : 'PLATO TERMINADO'}</div>
      </div>

      <div class="section">
        <h2>Información General</h2>
        <div class="info-grid">
          <div class="info-item">
            <span>Cantidad objetivo:</span>
            <strong>${recipe.target_batch_qty} ${recipe.target_batch_unit}</strong>
          </div>
          ${recipe.servings ? `
          <div class="info-item">
            <span>Porciones:</span>
            <strong>${recipe.servings}</strong>
          </div>` : ''}
          ${recipe.prep_time_minutes ? `
          <div class="info-item">
            <span>Tiempo preparación:</span>
            <strong>${recipe.prep_time_minutes} min</strong>
          </div>` : ''}
          ${recipe.cooking_time_minutes ? `
          <div class="info-item">
            <span>Tiempo cocción:</span>
            <strong>${recipe.cooking_time_minutes} min</strong>
          </div>` : ''}
        </div>
      </div>

      <div class="section">
        <h2>Ingredientes</h2>
        <table class="ingredients-table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Merma %</th>
              <th>Coste €</th>
            </tr>
          </thead>
          <tbody>
            ${recipe.ingredients.map(ing => `
              <tr>
                <td>${ing.name}</td>
                <td>${ing.quantity}</td>
                <td>${ing.unit}</td>
                <td>${ing.loss_pct}%</td>
                <td>€${ing.cost.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${recipe.allergen_info.length > 0 ? `
      <div class="section">
        <h2>Alérgenos</h2>
        <div class="allergens">
          ${recipe.allergen_info.map(allergen => `<div class="allergen">${allergen}</div>`).join('')}
        </div>
      </div>` : ''}

      <div class="section">
        <h2>Análisis de Costes</h2>
        <div class="costs-summary">
          <div class="cost-item">
            <span>Coste ingredientes:</span>
            <span>€${recipe.costs.ingredient_cost.toFixed(2)}</span>
          </div>
          <div class="cost-item">
            <span>Coste laboral (15%):</span>
            <span>€${recipe.costs.labor_cost.toFixed(2)}</span>
          </div>
          <div class="cost-item">
            <span>Gastos generales (5%):</span>
            <span>€${recipe.costs.overhead_cost.toFixed(2)}</span>
          </div>
          <div class="cost-item total-cost">
            <span>Coste total:</span>
            <span>€${recipe.costs.total_cost.toFixed(2)}</span>
          </div>
          ${recipe.costs.cost_per_serving ? `
          <div class="cost-item">
            <span>Coste por porción:</span>
            <span>€${recipe.costs.cost_per_serving.toFixed(2)}</span>
          </div>` : ''}
          ${recipe.food_cost_percentage ? `
          <div class="cost-item">
            <span>Food Cost:</span>
            <span style="color: ${recipe.food_cost_percentage <= 25 ? '#28a745' : recipe.food_cost_percentage <= 35 ? '#ffc107' : '#dc3545'}">${recipe.food_cost_percentage.toFixed(1)}%</span>
          </div>` : ''}
        </div>
      </div>

      <div class="section">
        <h2>Instrucciones de Elaboración</h2>
        <div class="instructions">${recipe.instructions}</div>
      </div>

      ${recipe.chef_notes ? `
      <div class="section">
        <h2>Notas del Chef</h2>
        <div class="instructions">${recipe.chef_notes}</div>
      </div>` : ''}

      <div class="footer">
        <p>Ficha técnica generada el ${new Date().toLocaleDateString('es-ES')} | Sistema de Gestión Gastronómica</p>
      </div>
    </body>
    </html>
  `;

  // Convert HTML to PDF blob URL
  const blob = new Blob([htmlContent], { type: 'text/html' });
  return URL.createObjectURL(blob);
};

export const downloadRecipePDF = async (recipe: RecipePDFData) => {
  try {
    const htmlUrl = await generateRecipePDF(recipe);
    
    // Open in new window for printing/saving
    const printWindow = window.open(htmlUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    // Clean up blob URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(htmlUrl);
    }, 10000);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('No se pudo generar el PDF');
  }
};

export const exportCatalogCSV = (ingredients: any[]) => {
  const headers = ['Nombre', 'Categoría', 'Precio promedio', 'Unidad', 'Área', 'Proveedores', 'Última actualización'];
  
  const csvContent = [
    headers.join(','),
    ...ingredients.map(ing => [
      `"${ing.name}"`,
      `"${ing.category}"`,
      ing.currentPrice?.toFixed(2) || '0.00',
      `"${ing.unit}"`,
      `"${ing.area}"`,
      `"${ing.suppliers?.join('; ') || ''}"`,
      `"${new Date(ing.lastUpdated).toLocaleDateString('es-ES')}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `catalogo_ingredientes_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  URL.revokeObjectURL(link.href);
};

export const exportComparisonCSV = (prices: any[]) => {
  const headers = ['Ingrediente', 'Proveedor', 'Formato', 'Precio/Unidad', 'Precio Pack', 'Descuento %', 'IGIC %', 'Es mejor precio'];
  
  const csvContent = [
    headers.join(','),
    ...prices.map(price => [
      `"${price.ingredientName}"`,
      `"${price.supplierName}"`,
      `"${price.packDescription}"`,
      price.finalPrice.toFixed(2),
      price.packPrice.toFixed(2),
      price.discount.toFixed(1),
      price.igic.toFixed(1),
      price.isBest ? 'Sí' : 'No'
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `comparacion_precios_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  URL.revokeObjectURL(link.href);
};