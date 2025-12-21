import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Code, 
  BookOpen, 
  Mic, 
  Lightbulb,
  ChevronDown,
  Check
} from 'lucide-react'
import { getAvailableContextModes, setContextMode, getContextMode } from '../lib/faceAnalysis'

const MODE_ICONS = {
  coding: Code,
  reading: BookOpen,
  meeting: Mic,
  brainstorm: Lightbulb,
}

export function ContextModeSelector({ onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMode, setCurrentMode] = useState(getContextMode())
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const modes = getAvailableContextModes()
  
  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.right - 224, // 224 = dropdown width (w-56 = 14rem = 224px)
      })
    }
  }, [isOpen])

  // Close on scroll
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => setIsOpen(false)
      window.addEventListener('scroll', handleScroll, true)
      return () => window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])
  
  const handleSelect = (modeId) => {
    setContextMode(modeId)
    const newMode = getContextMode()
    setCurrentMode(newMode)
    setIsOpen(false)
    if (onChange) onChange(newMode)
  }
  
  const Icon = MODE_ICONS[currentMode.mode] || Code

  // Dropdown content rendered via portal
  const dropdownContent = isOpen ? createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0"
        style={{ zIndex: 999998 }}
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed w-56 bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl shadow-2xl overflow-hidden"
        style={{ 
          zIndex: 999999,
          top: dropdownPos.top,
          left: Math.max(8, dropdownPos.left), // Prevent going off-screen
        }}
      >
        <div className="p-2">
          <p className="text-xs text-gray-500 px-2 py-1 uppercase tracking-wider">
            Activity Context
          </p>
          {modes.map((mode) => {
            const ModeIcon = MODE_ICONS[mode.id] || Code
            const isSelected = mode.id === currentMode.mode
            
            return (
              <button
                key={mode.id}
                onClick={() => handleSelect(mode.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isSelected 
                    ? 'bg-[#00d4aa]/20 text-[#00d4aa]' 
                    : 'hover:bg-[#12121a] text-gray-200'
                  }
                `}
              >
                <ModeIcon className="w-4 h-4" />
                <span className="flex-1 text-left text-sm font-medium">
                  {mode.emoji} {mode.label}
                </span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            )
          })}
        </div>
        
        <div className="px-4 py-3 bg-[#12121a] border-t border-[#2a2a3e]">
          <p className="text-xs text-gray-500">
            Context affects scoring. 
            <span className="text-[#00d4aa]"> Meeting</span> = stricter, 
            <span className="text-[#00d4aa]"> Brainstorm</span> = relaxed.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null
  
  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-mirror-bg/50 border border-mirror-border rounded-lg hover:bg-mirror-border/50 transition-colors"
      >
        <Icon className="w-4 h-4 text-mirror-accent" />
        <span className="text-sm font-medium text-mirror-text">
          {currentMode.emoji} {currentMode.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-mirror-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {dropdownContent}
    </>
  )
}

// Compact inline display
export function ContextModeDisplay({ contextMode }) {
  if (!contextMode) return null
  
  const Icon = MODE_ICONS[contextMode.mode] || Code
  
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-mirror-bg/30 rounded text-xs">
      <Icon className="w-3 h-3 text-mirror-accent" />
      <span className="text-mirror-muted">
        {contextMode.emoji} {contextMode.label}
      </span>
    </div>
  )
}
