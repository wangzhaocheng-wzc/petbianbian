import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface TouchButtonProps {
  children?: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export default function TouchButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  type = 'button'
}: TouchButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  // Touch-friendly sizing
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px] touch:min-h-[44px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px] touch:min-h-[48px]',
    lg: 'px-6 py-3 text-base min-h-[48px] touch:min-h-[52px]'
  }
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 active:bg-gray-800',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-primary-500 active:bg-gray-100',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800'
  }
  
  const widthClass = fullWidth ? 'w-full' : ''
  
  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          加载中...
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className={`w-4 h-4 ${children ? 'mr-2' : ''}`} />
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            <Icon className={`w-4 h-4 ${children ? 'ml-2' : ''}`} />
          )}
        </>
      )}
    </button>
  )
}