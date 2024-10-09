# Harmodulum

<p align="center">
  <img src="harmodulum_screenshot.png" alt="Harmodulum Screenshot" width="500"/>
</p>

Harmodulum is an interactive harmonic pendulum simulation project implemented in JavaScript for Max/MSP and Ableton Live. It provides a visual and potentially auditory experience of pendulum motion with adjustable physics parameters.

## Features

- Simulate multiple pendulums simultaneously
- Adjust various pendulum properties:
  - Size
  - Arm length
  - Air resistance
  - Velocity
  - Acceleration
  - Damping
- Visual representation of pendulum motion
- Note generation based on pendulum properties
- Physics-based simulation including gravity, angular velocity, and energy calculations

## Files

- `code/harmo_pendulum.js`: Main implementation of the harmonic pendulum simulation

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/ostinsolo/Harmodulum.git
   ```
2. Place the entire Harmodulum folder in your Max for Live devices folder:
   ```
   Documents/Max 9/Max for Live Devices/
   ```
   Note: The device is not freeze-compatible, so all files must be in this location.

## Usage

1. In Ableton Live, load the Harmodulum device onto a MIDI track.
2. Alternatively, open the device in Max/MSP.
3. Click and drag the pendulums to interact with them.
4. Adjust parameters as needed using the device controls.

For detailed information on available functions and parameters, refer to the `harmo_pendulum.js` file.

## Contributing

Contributions to Harmodulum are welcome. Please feel free to submit a Pull Request.

## License

This project is licensed under the Creative Commons Attribution 4.0 International License.

## Contact

For any inquiries or support, please contact:
contact@ostinsolo.co.uk