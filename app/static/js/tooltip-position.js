/**
 * Smart Tooltip Positioning
 * Positions tooltips near the trigger icon, but adjusts if they would go off-screen
 */

document.addEventListener('DOMContentLoaded', () => {
    const tooltips = document.querySelectorAll('.tooltip');
    
    tooltips.forEach(tooltip => {
        const img = tooltip.querySelector('img');
        if (!img) return;
        
        tooltip.addEventListener('mouseenter', () => {
            positionTooltip(tooltip, img);
        });
        
        // Reposition on window resize
        window.addEventListener('resize', () => {
            if (img.style.display === 'block') {
                positionTooltip(tooltip, img);
            }
        });
    });
});

function positionTooltip(tooltip, img) {
    // Get tooltip icon position relative to viewport
    const rect = tooltip.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate max dimensions based on CSS: min(350px, 40vw/vh)
    const maxWidthPx = Math.min(350, viewportWidth * 0.4);
    const maxHeightPx = Math.min(350, viewportHeight * 0.4);
    
    // Calculate actual dimensions based on natural aspect ratio
    let imgWidth = maxWidthPx;
    let imgHeight = maxHeightPx;
    
    if (img.naturalWidth && img.naturalHeight) {
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        
        // Fit image within max dimensions while preserving aspect ratio
        if (aspectRatio > 1) {
            // Vertical image - limit by height
            imgHeight = maxHeightPx;
            imgWidth = imgHeight / aspectRatio;
            if (imgWidth > maxWidthPx) {
                imgWidth = maxWidthPx;
                imgHeight = imgWidth * aspectRatio;
            }
        } else {
            // Horizontal image - limit by width
            imgWidth = maxWidthPx;
            imgHeight = imgWidth * aspectRatio;
            if (imgHeight > maxHeightPx) {
                imgHeight = maxHeightPx;
                imgWidth = imgHeight / aspectRatio;
            }
        }
    }
    
    // Base position: right of the icon, vertically centered on icon
    let left = rect.right + 10; // 10px gap from icon
    let top = rect.top + (rect.height / 2); // Center vertically on icon
    
    // Check if tooltip would go off right edge
    if (left + imgWidth > viewportWidth - 20) {
        // Position on the left side instead
        left = rect.left - imgWidth - 10;
        
        // If still off-screen on left, center it horizontally
        if (left < 20) {
            left = Math.max(20, (viewportWidth - imgWidth) / 2);
        }
    }
    
    // Check if tooltip would go off bottom edge
    if (top + imgHeight > viewportHeight - 20) {
        // Move up so bottom aligns with viewport bottom (with 20px margin)
        top = viewportHeight - imgHeight - 20;
    }
    
    // Check if tooltip would go off top edge
    if (top < 20) {
        top = 20;
    }
    
    // Apply position (fixed positioning relative to viewport)
    img.style.left = `${left - rect.x}px`;
    img.style.top = `${top - rect.y}px`;
    img.style.transform = 'none'; // Remove any centering transform
}