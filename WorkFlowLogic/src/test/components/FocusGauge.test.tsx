import { describe, it, expect } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import FocusGauge from '~/components/FocusGauge'

describe('FocusGauge Component', () => {
  it('should render without crashing', () => {
    render(() => <FocusGauge value={50} />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should display the value correctly', () => {
    render(() => <FocusGauge value={75} />)
    const valueText = screen.getByText('75')
    expect(valueText).toBeInTheDocument()
  })

  it('should handle minimum value (0)', () => {
    render(() => <FocusGauge value={0} />)
    const valueText = screen.getByText('0')
    expect(valueText).toBeInTheDocument()
  })

  it('should handle maximum value (100)', () => {
    render(() => <FocusGauge value={100} />)
    const valueText = screen.getByText('100')
    expect(valueText).toBeInTheDocument()
  })

  it('should have correct SVG structure', () => {
    render(() => <FocusGauge value={60} />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox')
    expect(svg?.querySelectorAll('circle').length).toBeGreaterThan(0)
  })

  it('should have correct default size', () => {
    render(() => <FocusGauge value={50} />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '220')
    expect(svg).toHaveAttribute('height', '220')
  })

  it('should display focus label', () => {
    render(() => <FocusGauge value={75} />)
    expect(screen.getByText(/专注指数/)).toBeInTheDocument()
  })

  it('should clamp values between 0 and 100', () => {
    render(() => <FocusGauge value={150} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('should clamp negative values to 0', () => {
    render(() => <FocusGauge value={-50} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should display rounded integer values', () => {
    render(() => <FocusGauge value={75.6} />)
    expect(screen.getByText('76')).toBeInTheDocument()
  })
})
