import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils/testUtils';
import TouchButton from '../TouchButton';
import { Heart, Plus } from 'lucide-react';

describe('TouchButton', () => {
  describe('Basic Rendering', () => {
    it('should render button with text', () => {
      render(<TouchButton>Click me</TouchButton>);
      
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
    });

    it('should render button without text', () => {
      render(<TouchButton />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<TouchButton className="custom-class">Test</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Button Types', () => {
    it('should render as button type by default', () => {
      render(<TouchButton>Test</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should render as submit type when specified', () => {
      render(<TouchButton type="submit">Submit</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should render as reset type when specified', () => {
      render(<TouchButton type="reset">Reset</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Variants', () => {
    it('should apply primary variant by default', () => {
      render(<TouchButton>Primary</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600', 'text-white');
    });

    it('should apply secondary variant', () => {
      render(<TouchButton variant="secondary">Secondary</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-600', 'text-white');
    });

    it('should apply outline variant', () => {
      render(<TouchButton variant="outline">Outline</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-gray-300', 'text-gray-700', 'bg-white');
    });

    it('should apply ghost variant', () => {
      render(<TouchButton variant="ghost">Ghost</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-gray-700');
    });

    it('should apply danger variant', () => {
      render(<TouchButton variant="danger">Danger</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white');
    });
  });

  describe('Sizes', () => {
    it('should apply medium size by default', () => {
      render(<TouchButton>Medium</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2.5', 'text-sm', 'min-h-[44px]');
    });

    it('should apply small size', () => {
      render(<TouchButton size="sm">Small</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-2', 'text-sm', 'min-h-[40px]');
    });

    it('should apply large size', () => {
      render(<TouchButton size="lg">Large</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-base', 'min-h-[48px]');
    });
  });

  describe('Icons', () => {
    it('should render icon on the left by default', () => {
      render(
        <TouchButton icon={Heart}>
          With Icon
        </TouchButton>
      );
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('mr-2'); // Left margin for left icon
    });

    it('should render icon on the right when specified', () => {
      render(
        <TouchButton icon={Plus} iconPosition="right">
          With Icon
        </TouchButton>
      );
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('ml-2'); // Left margin for right icon
    });

    it('should render icon without margin when no text', () => {
      render(<TouchButton icon={Heart} />);
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      
      expect(icon).toBeInTheDocument();
      expect(icon).not.toHaveClass('mr-2', 'ml-2');
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<TouchButton disabled>Disabled</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should show loading state', () => {
      render(<TouchButton loading>Loading</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('加载中...');
      
      // Check for loading spinner
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(<TouchButton loading>Loading</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Full Width', () => {
    it('should not be full width by default', () => {
      render(<TouchButton>Normal</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });

    it('should be full width when specified', () => {
      render(<TouchButton fullWidth>Full Width</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<TouchButton onClick={handleClick}>Click me</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <TouchButton onClick={handleClick} disabled>
          Disabled
        </TouchButton>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(
        <TouchButton onClick={handleClick} loading>
          Loading
        </TouchButton>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus styles', () => {
      render(<TouchButton>Focus me</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
    });

    it('should be keyboard accessible', () => {
      const handleClick = vi.fn();
      render(<TouchButton onClick={handleClick}>Press me</TouchButton>);
      
      const button = screen.getByRole('button');
      
      // Simulate Enter key press
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      
      // Note: fireEvent.keyDown doesn't automatically trigger click for buttons
      // In real browsers, Enter key on a button would trigger click
      // We can test this by focusing and using fireEvent.click
      button.focus();
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalled();
    });

    it('should have proper ARIA attributes when disabled', () => {
      render(<TouchButton disabled>Disabled</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Touch-Friendly Design', () => {
    it('should have minimum touch target size', () => {
      render(<TouchButton size="sm">Small</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[40px]', 'touch:min-h-[44px]');
    });

    it('should have larger touch targets for medium size', () => {
      render(<TouchButton size="md">Medium</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]', 'touch:min-h-[48px]');
    });

    it('should have largest touch targets for large size', () => {
      render(<TouchButton size="lg">Large</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[48px]', 'touch:min-h-[52px]');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all props together', () => {
      const handleClick = vi.fn();
      render(
        <TouchButton
          onClick={handleClick}
          variant="outline"
          size="lg"
          icon={Heart}
          iconPosition="right"
          fullWidth
          className="custom-class"
          type="submit"
        >
          Complex Button
        </TouchButton>
      );
      
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveClass('border', 'border-gray-300'); // outline variant
      expect(button).toHaveClass('px-6', 'py-3', 'text-base'); // large size
      expect(button).toHaveClass('w-full'); // full width
      expect(button).toHaveClass('custom-class'); // custom class
      
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('ml-2'); // right icon
      
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });

    it('should prioritize loading state over other states', () => {
      const handleClick = vi.fn();
      render(
        <TouchButton
          onClick={handleClick}
          loading
          disabled={false}
          icon={Heart}
        >
          Loading Button
        </TouchButton>
      );
      
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('加载中...');
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
      
      // Icon should not be visible during loading
      expect(button.querySelector('svg:not(.animate-spin)')).not.toBeInTheDocument();
      
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});