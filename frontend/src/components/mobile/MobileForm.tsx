import React, { ReactNode } from 'react'
import { useMobile } from '../../hooks/useMobile'

interface MobileFormProps {
  children: ReactNode
  onSubmit?: (e: React.FormEvent) => void
  className?: string
}

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ComponentType<{ className?: string }>
  helperText?: string
}

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  helperText?: string
  placeholder?: string
}

export function MobileForm({ children, onSubmit, className = '' }: MobileFormProps) {
  const { isMobile } = useMobile()
  
  return (
    <form 
      onSubmit={onSubmit}
      className={`space-y-4 ${isMobile ? 'touch-form' : ''} ${className}`}
      noValidate
    >
      {children}
    </form>
  )
}

export function MobileInput({ 
  label, 
  error, 
  icon: Icon, 
  helperText, 
  className = '', 
  ...props 
}: MobileInputProps) {
  const { isMobile } = useMobile()
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <input
          {...props}
          id={inputId}
          className={`
            block w-full rounded-md border-gray-300 shadow-sm
            focus:border-orange-500 focus:ring-orange-500
            ${Icon ? 'pl-10' : 'pl-3'} pr-3
            ${isMobile ? 'py-3 text-base' : 'py-2 text-sm'}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            ${props.disabled ? 'bg-gray-50 text-gray-500' : ''}
            ${className}
          `}
          // 移动端优化
          autoComplete={props.autoComplete || 'off'}
          autoCapitalize={props.type === 'email' ? 'none' : 'sentences'}
          autoCorrect={props.type === 'email' ? 'off' : 'on'}
          spellCheck={props.type === 'email' || props.type === 'password' ? false : true}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

export function MobileTextarea({ 
  label, 
  error, 
  helperText, 
  className = '', 
  ...props 
}: MobileTextareaProps) {
  const { isMobile } = useMobile()
  const textareaId = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        {...props}
        id={textareaId}
        className={`
          block w-full rounded-md border-gray-300 shadow-sm
          focus:border-orange-500 focus:ring-orange-500
          ${isMobile ? 'px-3 py-3 text-base' : 'px-3 py-2 text-sm'}
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          ${props.disabled ? 'bg-gray-50 text-gray-500' : ''}
          ${className}
        `}
        rows={props.rows || (isMobile ? 4 : 3)}
      />
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

export function MobileSelect({ 
  label, 
  error, 
  options, 
  helperText, 
  className = '', 
  ...props 
}: MobileSelectProps) {
  const { isMobile } = useMobile()
  const selectId = props.id || `select-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        {...props}
        id={selectId}
        className={`
          block w-full rounded-md border-gray-300 shadow-sm
          focus:border-orange-500 focus:ring-orange-500
          ${isMobile ? 'px-3 py-3 text-base' : 'px-3 py-2 text-sm'}
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          ${props.disabled ? 'bg-gray-50 text-gray-500' : ''}
          ${className}
        `}
      >
        {props.placeholder && (
          <option value="" disabled>
            {props.placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}