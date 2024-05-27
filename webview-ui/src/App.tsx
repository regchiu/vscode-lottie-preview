import { useEffect, useRef, useState } from 'react'

import {
  VSCodeCheckbox,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react'

type Option<L, V> = {
  label: L
  value: V
}

enum Direction {
  Forward = 1,
  Backward = -1,
}

const SPEED_OPTIONS: Option<string, string>[] = [
  {
    label: '1x',
    value: '1',
  },
  {
    label: '2x',
    value: '2',
  },
  {
    label: '3x',
    value: '3',
  },
]

const DIRECTION_OPTIONS: Option<string, string>[] = [
  {
    label: 'Forward',
    value: '1',
  },
  {
    label: 'Backward',
    value: '-1',
  },
]

let dotlottiePlayer: Element | null = null

function App() {
  const [background, setBackground] = useState('transparent')
  const colorInputRef = useRef<HTMLInputElement | null>(null)
  const [speed, setSpeed] = useState(1)
  const [direction, setDirection] = useState<Direction>(Direction.Forward)
  const [showControls, setShowControls] = useState(true)
  const [isLoop, setIsLoop] = useState(true)

  useEffect(() => {
    dotlottiePlayer = document.querySelector('.dotlottie-player')
  }, [])

  function handleBackgroundFocus() {
    colorInputRef.current?.click()
  }

  function handleBackgroundColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBackground(e.target.value)
    if (dotlottiePlayer) {
      dotlottiePlayer.setAttribute('background', e.target.value)
    }
  }

  function handleSpeedChange(e: Event | React.FormEvent<HTMLElement>) {
    const value = parseInt((e.target as HTMLSelectElement).value, 10)
    if (!Number.isNaN(value)) {
      setSpeed(value)

      if (dotlottiePlayer) {
        ;(dotlottiePlayer as any).setSpeed(value)
      }
    }
  }

  function handleDirectionChange(e: Event | React.FormEvent<HTMLElement>) {
    const value = parseInt((e.target as HTMLSelectElement).value, 10) as Direction
    if (!Number.isNaN(value)) {
      setDirection(value)

      if (dotlottiePlayer) {
        ;(dotlottiePlayer as any).setDirection(value)
      }
    }
  }

  function handleLoopChange(e: Event | React.FormEvent<HTMLElement>) {
    const checked = (e.target as HTMLInputElement).checked
    setIsLoop(checked)

    if (dotlottiePlayer) {
      ;(dotlottiePlayer as any).toggleLooping()
    }
  }

  function handleControlsChange(e: Event | React.FormEvent<HTMLElement>) {
    const checked = (e.target as HTMLInputElement).checked
    setShowControls(checked)

    if (dotlottiePlayer) {
      if (checked) {
        dotlottiePlayer.setAttribute('controls', 'true')
      } else {
        dotlottiePlayer.removeAttribute('controls')
      }
    }
  }

  return (
    <div className="max-w-screen-lg mx-auto flex flex-col justify-center px-6 py-12 gap-4">
      <h2 className="text-2xl font-bold leading-9 tracking-tight">Lottie viewer</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="w-full">
          <VSCodeTextField
            value={background}
            onFocus={handleBackgroundFocus}
          >
            <input
              slot="start"
              ref={colorInputRef}
              className="w-0 -z-10"
              type="color"
              onChange={handleBackgroundColorChange}
            />
            Background Color
          </VSCodeTextField>
        </div>
        <div className="w-full">
          <label
            className="block text-sm font-medium leading-6"
            htmlFor="speed"
          >
            Speed
          </label>
          <VSCodeDropdown
            id="speed"
            onChange={handleSpeedChange}
          >
            {SPEED_OPTIONS.map((option) => (
              <VSCodeOption
                key={option.value}
                value={option.value}
                selected={option.value === speed.toString()}
              >
                {option.label}
              </VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>
        <div className="w-full">
          <label
            className="block text-sm font-medium leading-6"
            htmlFor="direction"
          >
            Direction
          </label>
          <VSCodeDropdown
            id="direction"
            onChange={handleDirectionChange}
          >
            {DIRECTION_OPTIONS.map((option) => (
              <VSCodeOption
                key={option.value}
                value={option.value}
                selected={option.value === direction.toString()}
              >
                {option.label}
              </VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>
        <div className="w-full">
          <VSCodeCheckbox
            checked={isLoop}
            onChange={handleLoopChange}
          >
            Loop
          </VSCodeCheckbox>
          <p className="text-sm">Set to repeat animation</p>
        </div>
        <div className="w-full">
          <VSCodeCheckbox
            checked={showControls}
            onChange={handleControlsChange}
          >
            Controls
          </VSCodeCheckbox>
          <p className="text-sm">Display animation controls: Play, Pause & Slider</p>
        </div>
      </div>
    </div>
  )
}

export default App
