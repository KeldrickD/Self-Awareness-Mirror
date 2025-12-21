import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export function RealtimeChart({ readings, maxPoints = 60 }) {
  const chartRef = useRef(null)

  // Take last N readings
  const displayReadings = readings.slice(-maxPoints)

  const labels = displayReadings.map((_, i) => {
    const secondsAgo = (displayReadings.length - i - 1)
    return secondsAgo === 0 ? 'Now' : `-${secondsAgo}s`
  })

  const data = {
    labels,
    datasets: [
      {
        label: 'Confidence',
        data: displayReadings.map(r => r.confidence),
        borderColor: '#00d4aa',
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Focus',
        data: displayReadings.map(r => r.focus),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Energy',
        data: displayReadings.map(r => r.energy),
        borderColor: '#ffb84d',
        backgroundColor: 'rgba(255, 184, 77, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animation for real-time updates
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#6b7280',
          font: {
            family: 'Outfit',
            size: 11,
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: '#12121a',
        titleColor: '#e5e5e5',
        bodyColor: '#6b7280',
        borderColor: '#1e1e2e',
        borderWidth: 1,
        padding: 12,
        titleFont: {
          family: 'Outfit',
          size: 12,
          weight: '600',
        },
        bodyFont: {
          family: 'JetBrains Mono',
          size: 11,
        },
        callbacks: {
          label: (context) => `${context.dataset.label}: ${Math.round(context.raw)}%`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            family: 'JetBrains Mono',
            size: 10,
          },
          maxTicksLimit: 6,
        },
      },
      y: {
        display: true,
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            family: 'JetBrains Mono',
            size: 10,
          },
          callback: (value) => `${value}%`,
        },
      },
    },
  }

  return (
    <div className="bg-mirror-card rounded-xl border border-mirror-border p-5">
      <h3 className="text-sm font-medium text-mirror-muted uppercase tracking-wider mb-4">
        Real-time Metrics
      </h3>
      <div className="h-64">
        <Line ref={chartRef} data={data} options={options} />
      </div>
    </div>
  )
}

