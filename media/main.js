const dotlottiePlayer = document.querySelector('.dotlottie-player')
let dotlottiePlayerWidth = '300px'
let dotlottiePlayerHeight = '300px'

const widthInput = document.querySelector('#width')
widthInput.addEventListener('input', (e) => {
  dotlottiePlayerWidth = e.target.value
  dotlottiePlayer.style = `width: ${dotlottiePlayerWidth}; height: ${dotlottiePlayerHeight}`
})

const heightInput = document.querySelector('#height')
heightInput.addEventListener('input', (e) => {
  dotlottiePlayerHeight = e.target.value
  dotlottiePlayer.style = `width: ${dotlottiePlayerWidth}; height: ${dotlottiePlayerHeight}`
})

const backgroundColorInput = document.querySelector('#background-color')
backgroundColorInput.addEventListener('input', (e) => {
  dotlottiePlayer.stop()
  dotlottiePlayer.setAttribute('background', e.target.value)
  dotlottiePlayer.play()
})

const animationSpeedSelect = document.querySelector('#animation-speed')
animationSpeedSelect.addEventListener('change', (e) => {
  const speed = parseInt(e.target.value, 10)
  if (!Number.isNaN(speed)) {
    dotlottiePlayer.stop()
    dotlottiePlayer.setSpeed(speed)
  }
})

function onDirectionChange(e) {
  const direction = parseInt(e.target.value, 10)
  if (!Number.isNaN(direction)) {
    dotlottiePlayer.setDirection(direction)
  }
}
const forwardRadio = document.querySelector('#forward')
forwardRadio.addEventListener('change', onDirectionChange)
const backwardRadio = document.querySelector('#backward')
backwardRadio.addEventListener('change', onDirectionChange)

const loopCheckbox = document.querySelector('#loop')
loopCheckbox.addEventListener('change', () => {
  dotlottiePlayer.stop()
  dotlottiePlayer.toggleLooping()
  dotlottiePlayer.play()
})

const controlsCheckbox = document.querySelector('#controls')
controlsCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    dotlottiePlayer.setAttribute('controls', true)
  } else {
    dotlottiePlayer.removeAttribute('controls')
  }
})
