import { useEffect, useRef } from 'react';

interface UseMobileScrollOptions {
  /**
   * Additional offset to add when scrolling (in pixels)
   * Useful to account for fixed headers or virtual keyboards
   */
  offset?: number;
  /**
   * Delay before scrolling (in milliseconds)
   * Helps ensure virtual keyboard is fully shown before scrolling
   */
  delay?: number;
}

/**
 * Hook to automatically scroll focused inputs into view on mobile devices
 * Solves the common issue where virtual keyboards hide input fields
 */
export function useMobileScroll(options: UseMobileScrollOptions = {}) {
  const { offset = 20, delay = 300 } = options;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      
      // Only handle input-like elements
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Clear any existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Scroll after a delay to ensure virtual keyboard is shown
      scrollTimeout = setTimeout(() => {
        try {
          const rect = target.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // Calculate scroll position relative to container
          const relativeTop = rect.top - containerRect.top;
          const scrollTarget = container.scrollTop + relativeTop - offset;
          
          // Smooth scroll to target position
          container.scrollTo({
            top: Math.max(0, scrollTarget),
            behavior: 'smooth'
          });
        } catch (error) {
          console.warn('Failed to scroll to focused element:', error);
        }
      }, delay);
    };

    // Add focus event listener to container
    container.addEventListener('focusin', handleFocus, true);

    // Cleanup
    return () => {
      container.removeEventListener('focusin', handleFocus, true);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [offset, delay]);

  return containerRef;
}

/**
 * Utility function to scroll an element into view with mobile-friendly behavior
 * Can be called manually when needed
 */
export function scrollIntoViewMobile(element: HTMLElement, options: UseMobileScrollOptions = {}) {
  const { offset = 20, delay = 100 } = options;
  
  setTimeout(() => {
    try {
      const rect = element.getBoundingClientRect();
      const scrollContainer = findScrollContainer(element);
      
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        const scrollTarget = scrollContainer.scrollTop + relativeTop - offset;
        
        scrollContainer.scrollTo({
          top: Math.max(0, scrollTarget),
          behavior: 'smooth'
        });
      } else {
        // Fallback to native scrollIntoView
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    } catch (error) {
      console.warn('Failed to scroll element into view:', error);
    }
  }, delay);
}

/**
 * Find the nearest scrollable container for an element
 */
function findScrollContainer(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflow = style.overflow + style.overflowY + style.overflowX;
    
    if (overflow.includes('auto') || overflow.includes('scroll')) {
      return parent;
    }
    
    parent = parent.parentElement;
  }
  
  return document.documentElement;
}