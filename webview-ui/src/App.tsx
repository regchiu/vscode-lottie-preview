import { useEffect, useRef, useState } from 'react'
import {
  VSCodeTextField,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeProgressRing,
  VSCodeCheckbox,
} from '@vscode/webview-ui-toolkit/react'
import { DotLottiePlayer, Controls, PlayMode } from '@dotlottie/react-player'
import type { AnimationDirection, DotLottieCommonPlayer } from '@dotlottie/react-player'
import '@dotlottie/react-player/dist/index.css'

type Option<L, V> = {
  label: L
  value: V
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

const PLAY_MODE_OPTIONS: Option<string, PlayMode>[] = [
  {
    label: 'Normal',
    value: PlayMode.Normal,
  },
  {
    label: 'Bounce',
    value: PlayMode.Bounce,
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

function App() {
  const lottieRef = useRef<DotLottieCommonPlayer>(null)
  const [background, setBackground] = useState('transparent')
  const colorInputRef = useRef<HTMLInputElement | null>(null)
  const [speed, setSpeed] = useState(1)
  const [direction, setDirection] = useState<AnimationDirection>(1)
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.Normal)
  const [showControls, setShowControls] = useState(true)
  const [isLoop, setIsLoop] = useState(true)
  const [src, setSrc] = useState('')

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const message = e.data
      setSrc(`${message.scheme}://${message.authority}${message.path}`)
    }
    window.addEventListener('message', onMessage)

    return () => window.removeEventListener('message', onMessage)
  }, [])

  function handleBackgroundFocus() {
    colorInputRef.current?.click()
  }

  function handleBackgroundColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBackground(e.target.value)
  }

  function handleSpeedChange(e: Event | React.FormEvent<HTMLElement>) {
    const value = parseInt((e.target as HTMLSelectElement).value, 10)
    if (!Number.isNaN(value)) {
      setSpeed(value)
    }
  }

  function handleDirectionChange(e: Event | React.FormEvent<HTMLElement>) {
    const value = parseInt((e.target as HTMLSelectElement).value, 10) as AnimationDirection
    if (!Number.isNaN(value)) {
      setDirection(value)
    }
  }

  function handlePlayModeChange(e: Event | React.FormEvent<HTMLElement>) {
    const value = (e.target as HTMLSelectElement).value as PlayMode
    setPlayMode(value)
  }

  function handleLoopChange(e: Event | React.FormEvent<HTMLElement>) {
    const checked = (e.target as HTMLInputElement).checked
    setIsLoop(checked)
  }

  function handleControlsChange(e: Event | React.FormEvent<HTMLElement>) {
    const checked = (e.target as HTMLInputElement).checked
    setShowControls(checked)
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
          <label
            className="block text-sm font-medium leading-6"
            htmlFor="play-mode"
          >
            Play mode
          </label>
          <VSCodeDropdown
            id="play-mode"
            onChange={handlePlayModeChange}
          >
            {PLAY_MODE_OPTIONS.map((option) => (
              <VSCodeOption
                key={option.value}
                value={option.value}
                selected={option.value === playMode}
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
      <div className="w-full">
        {src ? (
          <DotLottiePlayer
            ref={lottieRef}
            autoplay
            loop={isLoop}
            background={background}
            speed={speed}
            direction={direction}
            playMode={playMode}
            src={src}
            style={{
              width: '300px',
              height: '300px',
            }}
          >
            {showControls ? <Controls /> : null}
          </DotLottiePlayer>
        ) : (
          <VSCodeProgressRing />
        )}
      </div>
    </div>
  )
}

export default App
