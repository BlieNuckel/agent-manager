import { describe, it, expect } from 'vitest';

// Define tab order in one place for easy maintenance
const TAB_ORDER = ['inbox', 'artifacts', 'history', 'library'] as const;
type TabType = typeof TAB_ORDER[number];

// Helper functions for tab navigation
const getNextTab = (current: TabType): TabType => {
  const currentIndex = TAB_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % TAB_ORDER.length;
  return TAB_ORDER[nextIndex];
};

const getPreviousTab = (current: TabType): TabType => {
  const currentIndex = TAB_ORDER.indexOf(current);
  const previousIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
  return TAB_ORDER[previousIndex];
};

describe('Tab Navigation', () => {
  describe('getNextTab', () => {
    it('should navigate forward through tabs in correct order', () => {
      expect(getNextTab('inbox')).toBe('artifacts');
      expect(getNextTab('artifacts')).toBe('history');
      expect(getNextTab('history')).toBe('library');
      expect(getNextTab('library')).toBe('inbox'); // wraps around
    });
  });

  describe('getPreviousTab', () => {
    it('should navigate backward through tabs in correct order', () => {
      expect(getPreviousTab('inbox')).toBe('library'); // wraps around
      expect(getPreviousTab('artifacts')).toBe('inbox');
      expect(getPreviousTab('history')).toBe('artifacts');
      expect(getPreviousTab('library')).toBe('history');
    });
  });

  describe('TAB_ORDER', () => {
    it('should maintain the correct tab order', () => {
      expect(TAB_ORDER).toEqual(['inbox', 'artifacts', 'history', 'library']);
    });

    it('should correctly map number keys to tabs', () => {
      expect(TAB_ORDER[0]).toBe('inbox');    // key '1'
      expect(TAB_ORDER[1]).toBe('artifacts'); // key '2'
      expect(TAB_ORDER[2]).toBe('history');   // key '3'
      expect(TAB_ORDER[3]).toBe('library');   // key '4'
    });
  });
});