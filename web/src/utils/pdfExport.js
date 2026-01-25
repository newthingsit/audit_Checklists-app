/**
 * High-Fidelity PDF Export Utility
 * Uses html2pdf.js to capture exact screen rendering
 */

import html2pdf from 'html2pdf.js';

/**
 * Wait for all images in an element to load
 */
const waitForImages = (element) => {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // Continue even if image fails
      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });
  });
  return Promise.all(promises);
};

/**
 * Export element to PDF with high fidelity
 * @param {HTMLElement} element - The DOM element to convert to PDF
 * @param {string} filename - The filename for the PDF
 * @param {object} options - Additional options
 */
export const exportToPdf = async (element, filename, options = {}) => {
  if (!element) {
    throw new Error('Element not provided for PDF export');
  }

  // Wait for images to load
  await waitForImages(element);

  // Small delay to ensure rendering is complete
  await new Promise(resolve => setTimeout(resolve, 300));

  const defaultOptions = {
    margin: [10, 10, 15, 10], // top, left, bottom, right in mm
    filename: filename || 'report.pdf',
    image: { 
      type: 'jpeg', 
      quality: 0.98 
    },
    html2canvas: { 
      scale: 2, // Higher scale for better quality
      useCORS: true, // Enable cross-origin images
      logging: false,
      letterRendering: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 800, // Fixed width for consistency
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait',
      compress: true
    },
    pagebreak: { 
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after',
      avoid: ['tr', 'td', '.avoid-break']
    }
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    await html2pdf()
      .set(mergedOptions)
      .from(element)
      .save();
    
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    throw error;
  }
};

/**
 * Export element to PDF Blob (for preview or upload)
 */
export const exportToPdfBlob = async (element, options = {}) => {
  if (!element) {
    throw new Error('Element not provided for PDF export');
  }

  await waitForImages(element);
  await new Promise(resolve => setTimeout(resolve, 300));

  const defaultOptions = {
    margin: [10, 10, 15, 10],
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 800,
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait',
      compress: true
    },
    pagebreak: { 
      mode: ['avoid-all', 'css', 'legacy'],
      avoid: ['tr', 'td', '.avoid-break']
    }
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    const blob = await html2pdf()
      .set(mergedOptions)
      .from(element)
      .outputPdf('blob');
    
    return blob;
  } catch (error) {
    console.error('PDF Export Error:', error);
    throw error;
  }
};

/**
 * Open PDF in new tab for preview
 */
export const previewPdf = async (element, options = {}) => {
  const blob = await exportToPdfBlob(element, options);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Clean up after some time
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

export default exportToPdf;
