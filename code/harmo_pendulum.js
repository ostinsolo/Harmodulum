autowatch = 1;
outlets = 6;  // We still need 4 outlets

function mapRange(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
} 
  
var width, height;
var g = 9.82;    // gravity 
var m = 40.0;    // mass of the ball
var l;           // length of the arm (will be set based on window size)

var Bob_size = []; // Default size for each bob
var Bob_armL = []; // Default arm length for each pendulum

for (var i = 0; i < 16; i++) {
    Bob_size[i] = 50;
    Bob_armL[i] = 200; 
}

var pendulums = [];  // Array to store all pendulums
var numPendulums = 1;  // Default to 1 pendulum

var p;           // pendulum instance
var lastSide = 0; // To track which side of the line the pendulum was on last frame

var isMouseDown = false;
var lastClickTime = 0;
var doubleClickThreshold = 300; // milliseconds

var needsRedraw = true; // Flag to indicate if redraw is needed

// Add these near the top of your file, after other variable declarations
var noteSymbols = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Add these constants at the top of your file
var BASE_FREQUENCY = 261.6256; // C4 frequency in Hz
var SEMITONE_RATIO = Math.pow(2, 1/12);
var CENTS_RANGE = 50; // Maximum cents deviation from the base note (half a semitone)

// Add these constants for base physical properties
var BASE_MIN_LENGTH = 80;
var BASE_MAX_LENGTH = 580; // Keep this as is, it's for physical calculations
var BASE_WINDOW_SIZE = 800; // Reference window size

// Add this constant near the top of your file, with other constants
var VISIBLE_LENGTH_RATIO = 0.92; // 92% of the window height

// Add these global variables at the top of your file
var globalDefaultAirResistance = 0.001; // Default value
var globalAirResistanceSet = false;
var globalDefaultVelocity = 0;
var globalVelocitySet = false;
var globalDefaultAcceleration = 0.1;
var globalAccelerationSet = false;
var globalDefaultDamping = 0.01;
var globalDampingSet = false;
var globalDefaultSmallAngleThreshold = 0.1;
var globalSmallAngleThresholdSet = false;
var globalDefaultMaxFrequencyMultiplier = 10;
var globalDefaultMaxEnergy = 100;
var globalFastMovementMultiplierSet = false;

function bang() {
    for (var i = 0; i < pendulums.length; i++) {
        pendulums[i].startOscillation();
    }
    needsRedraw = true;
}

function setup() {
    mgraphics.init();
    mgraphics.relative_coords = 0;
    mgraphics.autofill = 0;
    
    width = box.rect[2] - box.rect[0];
    height = box.rect[3] - box.rect[1];
    
    l = Bob_armL[0]; // Use the first pendulum's length as default
    
    add_Bob(1);  // Start with one pendulum
    
    var fps = 60;
    // Remove or comment out this part:
    // drawTask = new Task(function() {
    //     if (needsRedraw) {
    //         mgraphics.redraw();
    //         needsRedraw = false;
    //     }
    // }, this);
    // drawTask.interval = 10 / fps;
    // drawTask.repeat();
    
    post("Setup completed. Window size: " + width + "x" + height + ", Pendulum length: " + l + "\n");
}

function paint() {
    width = box.rect[2] - box.rect[0];
    height = box.rect[3] - box.rect[1];
    
    with (mgraphics) {
        // Clear the background
        set_source_rgba(0, 0, 0, 0); // Transparent background
        paint();
        
        // Draw rounded corner black background
        var cornerRadius = 3; // Adjust this value to change the roundness of corners
        set_source_rgba(0, 0, 0, 1);
        new_path();
        move_to(cornerRadius, 0);
        line_to(width - cornerRadius, 0);
        arc(width - cornerRadius, cornerRadius, cornerRadius, -Math.PI/2, 0);
        line_to(width, height - cornerRadius);
        arc(width - cornerRadius, height - cornerRadius, cornerRadius, 0, Math.PI/2);
        line_to(cornerRadius, height);
        arc(cornerRadius, height - cornerRadius, cornerRadius, Math.PI/2, Math.PI);
        line_to(0, cornerRadius);
        arc(cornerRadius, cornerRadius, cornerRadius, Math.PI, 3*Math.PI/2);
        close_path();
        fill();
        
        // Draw white line in the middle
        set_source_rgba(1, 1, 1, 1);
        set_line_width(1);
        move_to(width/2, height);
        line_to(width/2, height/2);
        stroke();
        
        var anyPendulumMoving = false;
        for (var i = 0; i < pendulums.length; i++) {
            if (!pendulums[i].isStill) {
                pendulums[i].go();
                pendulums[i].display();  // Only display if not still
                anyPendulumMoving = true;
            }
            
            // Check if pendulum crossed the middle line
            var currentSide = pendulums[i].physicalPosition.x > width/2 ? 1 : -1;
            if (currentSide != pendulums[i].lastSide) {
                var noteLabel = noteSymbols[pendulums[i].noteIndex];
                var sizeOutput = Math.round(mapRange(pendulums[i].ballr * 2, 10, 100, 1, 127));
                sizeOutput = clamp(sizeOutput, 1, 127);
                
                // Output the values
                outlet(0, pendulums[i].id);
                outlet(1, noteLabel);
                outlet(2, sizeOutput);
                
                // Output frequency and cents deviation
                outlet(3, "Pendulum " + pendulums[i].id + " Note: " + noteLabel + 
                        " Size: " + sizeOutput + 
                        " Frequency: " + pendulums[i].frequency.toFixed(2) + " Hz" +
                        " Cents: " + pendulums[i].cents + "\n");
                outlet(4, pendulums[i].frequency.toFixed(2));
                outlet(5, pendulums[i].cents);

                // Set the crossedCenterLine flag
                pendulums[i].crossedCenterLine = true;
            } else {
                pendulums[i].crossedCenterLine = false;
            }
            pendulums[i].lastSide = currentSide;
        }
        
        if (anyPendulumMoving) {
            needsRedraw = true;
        }
    }
}

function Pendulum(origin, r, m, size) {
    // Physical properties (must not been changed by resizing)
    this.physicalR = r;
    this.physicalMass = m;
    this.physicalSize = size;

    // Display properties (will change with resizing)
    this.displayR = r;
    this.ballr = size / 2;

    this.origin = origin;
    this.position = {x: 0, y: 0};
    this.angle = Math.PI / 4;
    this.aVelocity = globalVelocitySet ? globalDefaultVelocity : 0;
    this.aAcceleration = globalAccelerationSet ? globalDefaultAcceleration : 0;
    this.dragging = false;
    this.resizeMode = false;
    this.id = 0;
    this.lastSide = 0;
    this.lastPosition = {x: 0, y: 0};
    this.lastMoveTime = Date.now();
    this.isStill = false;
    this.noteIndex = Math.floor(Math.random() * noteSymbols.length);
    this.crossedCenterLine = false;

    this.airResistance = globalAirResistanceSet ? globalDefaultAirResistance : 0.001;
    this.dampingCoeff = globalDampingSet ? globalDefaultDamping : 0.01;
    this.smallAngleThreshold = globalSmallAngleThresholdSet ? globalDefaultSmallAngleThreshold : 0.1;
    this.maxFrequencyMultiplier = globalFastMovementMultiplierSet ? globalDefaultMaxFrequencyMultiplier : 10;
    this.maxEnergy = globalFastMovementMultiplierSet ? globalDefaultMaxEnergy : 100;

    this.clickableSize = 40; // Fixed size for the clickable area

    this.physicalPosition = {x: 0, y: 0};

    // Add these flags to the Pendulum constructor
    this.useGlobalSmallAngleThreshold = true;
    this.useGlobalFastMovementMultiplier = true;

    this.updateDisplayProperties = function(windowHeight) {
        var maxVisibleLength = windowHeight * VISIBLE_LENGTH_RATIO;
        var scaleFactor = maxVisibleLength / BASE_MAX_LENGTH;
        this.displayR = this.physicalR * scaleFactor;
        this.ballr = (this.physicalSize / 2) * scaleFactor;
    };

    this.updateNote = function() {
        post("Debug - updateNote called. physicalR: " + this.physicalR + "\n");
        
        var noteRange = noteSymbols.length;
        var lengthRange = BASE_MAX_LENGTH - BASE_MIN_LENGTH;
        
        var position = (this.physicalR - BASE_MIN_LENGTH) / lengthRange;
        position = clamp(position, 0, 1);
        
        var totalCents = position * (noteRange * 100);
        
        var noteIndex = Math.floor(totalCents / 100);
        var cents = Math.round(totalCents % 100);
        
        // Adjust cents to be between -50 and 50
        if (cents > 50) {
            cents -= 100;
            noteIndex++;
        }
        
        this.noteIndex = noteIndex % noteRange;
        this.cents = cents;

        var octave = Math.floor(noteIndex / noteRange);
        var baseFrequency = BASE_FREQUENCY * Math.pow(2, octave) * Math.pow(SEMITONE_RATIO, this.noteIndex);
        this.frequency = baseFrequency * Math.pow(2, this.cents / 1200);

        post("Debug - updateNote results: noteIndex=" + this.noteIndex + ", cents=" + this.cents + ", frequency=" + this.frequency + "\n");
    };

    // Call updateNote initially
    this.updateNote();

    this.go = function() {
        if (!this.isStill) {
            this.update();
            this.drag();
            this.checkStillness();
        }
    };

    this.update = function() {
        if (!this.dragging) {
            var gravity = 0.4 * g;
            
            // Calculate gravitational force
            var gravityForce = (-1 * gravity / this.physicalR) * Math.sin(this.angle);
            
            // Calculate damping force
            var dampingForce = -this.dampingCoeff * this.aVelocity;
            
            var angleAbs = Math.abs(this.angle);
            
            // Calculate multiplier based on angle
            var multiplier = 1;
            if (angleAbs < this.smallAngleThreshold) {
                var ratio = (this.smallAngleThreshold - angleAbs) / this.smallAngleThreshold;
                multiplier = 1 + (this.maxFrequencyMultiplier - 1) * ratio;
            }
            
            // Apply multiplier to gravitational force
            gravityForce *= multiplier;
            
            // Reduce damping as multiplier increases
            dampingForce /= multiplier;
            
            // Calculate total acceleration
            this.aAcceleration = gravityForce + dampingForce;
            
            // Apply air resistance separately
            if (this.airResistance > 0) {
                var airResistanceForce = -this.airResistance * this.aVelocity * this.physicalR / this.physicalMass;
                this.aAcceleration += airResistanceForce;
            }
            
            // Update angular velocity and angle
            this.aVelocity += this.aAcceleration;
            this.angle += this.aVelocity;
            
            // Update physical position
            this.physicalPosition = {
                x: this.origin.x + this.physicalR * Math.sin(this.angle),
                y: this.origin.y + this.physicalR * Math.cos(this.angle)
            };
        }
    };

    this.display = function() {
        var maxVisibleLength = height * VISIBLE_LENGTH_RATIO;
        var scaleFactor = maxVisibleLength / BASE_MAX_LENGTH;
        
        // Calculate physical position
        this.physicalPosition = {
            x: this.origin.x + this.physicalR * Math.sin(this.angle),
            y: this.origin.y + this.physicalR * Math.cos(this.angle)
        };
        
        // Calculate display position
        this.position = {
            x: this.origin.x + this.displayR * Math.sin(this.angle),
            y: this.origin.y + this.displayR * Math.cos(this.angle)
        };

        with (mgraphics) {
            // Draw the pendulum arm (line)
            if (this.dragging) {
                set_source_rgba(0.78, 0.42, 0.05, 1); // Red color when dragging
            } else {
                set_source_rgba(0.5, 0.8, 1, 1); // Default color
            }
            set_line_width(0.5);
            move_to(this.origin.x, this.origin.y);
            line_to(this.position.x, this.position.y);
            stroke();

            // Draw the pendulum bob (circle)
            if (this.dragging) {
                set_source_rgba(0.78, 0.42, 0.05, 1); // Red color when dragging
            } else if (this.crossedCenterLine) {
                set_source_rgba(0.7, 0.9, 1, 1); // Lighter blue when crossing the line
            } else {
                set_source_rgba(0.5, 0.8, 1, 1); // Default color
            }
            ellipse(this.position.x - this.ballr, this.position.y - this.ballr, this.ballr * 2, this.ballr * 2);
            fill();

            // Draw note letter above the cents text
            set_source_rgba(1, 1, 1, 1); 
            select_font_face("Ableton Sans Bold");
            set_font_size(12);
            var noteLetterText = noteSymbols[this.noteIndex]; 
            var letterWidth = text_measure(noteLetterText)[0];
            move_to(this.position.x - this.ballr - letterWidth - 5, this.position.y - 10); 
            show_text(noteLetterText);

            // Draw cents deviation to the left of the bob
            set_source_rgba(0.7, 0.7, 0.7, 1);
            set_font_size(10);
            var centsText = this.cents + " ct";
            var centsWidth = text_measure(centsText)[0];
            move_to(this.position.x - this.ballr - centsWidth - 5, this.position.y + 5); 
            show_text(centsText);

            // Draw pendulum index
            set_source_rgba(1, 1, 1, 0.8); // White color with slight transparency
            set_font_size(12); // Medium font size
            var indexText = "" + this.id;
            var indexWidth = text_measure(indexText)[0];
            move_to(this.position.x + this.ballr + 5, this.position.y); // Position to the right of the bob
            show_text(indexText);


            set_source_rgba(1, 1, 1, 0); // Transparent clickable area
            rectangle(this.position.x - this.clickableSize/2, 
                      this.position.y - this.clickableSize/2, 
                      this.clickableSize, this.clickableSize);
            fill();
        }
    };

    this.clicked = function(mx, my, shift) {
        var maxVisibleLength = height * VISIBLE_LENGTH_RATIO;
        var scaleFactor = maxVisibleLength / BASE_MAX_LENGTH;
        var physicalX = (mx - this.origin.x) / scaleFactor;
        var physicalY = (my - this.origin.y) / scaleFactor;
        
        // Calculate the position of the bob
        var bobX = this.origin.x + this.displayR * Math.sin(this.angle);
        var bobY = this.origin.y + this.displayR * Math.cos(this.angle);
        
        // Check if the click is within the clickable area
        if (Math.abs(mx - bobX) <= this.clickableSize / 2 && 
            Math.abs(my - bobY) <= this.clickableSize / 2) {
            this.dragging = true;
            this.isStill = false;  // Reset isStill when starting to drag
            this.resizeMode = shift;  // Enable resize mode only if shift is pressed
            
            if (this.resizeMode) {
                var distance = Math.sqrt(physicalX*physicalX + physicalY*physicalY);
                var newLength = Math.max(BASE_MIN_LENGTH, Math.min(BASE_MAX_LENGTH, distance));
                var lengthDiff = newLength - this.physicalR;
                this.physicalR += lengthDiff * 0.1; // Adjust the 0.1 factor for desired precision
                
                this.updateDisplayProperties(height);
                this.updateNote();
            }
            
            this.angle = Math.atan2(physicalX, physicalY);
            
            needsRedraw = true;
            return true;
        }
        return false;
    };

    this.stopDragging = function() {
        if (this.dragging) {
            this.dragging = false;
            this.isStill = false;  // Ensure the pendulum starts moving when released
            
            // Calculate final velocity based on the change in angle
            var dx = sketch.mouseX - this.origin.x;
            var dy = sketch.mouseY - this.origin.y;
            var newAngle = Math.atan2(dx, dy);
            this.aVelocity = (newAngle - this.angle) / 0.1; // Assume 0.1 seconds between frames
            this.angle = newAngle;
            
            needsRedraw = true;  // Ensure we redraw after stopping dragging
        }
    };

    this.drag = function() {
        if (this.dragging) {
            var maxVisibleLength = height * VISIBLE_LENGTH_RATIO;
            var scaleFactor = maxVisibleLength / BASE_MAX_LENGTH;
            var physicalX = (sketch.mouseX - this.origin.x) / scaleFactor;
            var physicalY = (sketch.mouseY - this.origin.y) / scaleFactor;
            
            if (this.resizeMode) {
                var newLength = Math.sqrt(physicalX*physicalX + physicalY*physicalY);
                var lengthDiff = newLength - this.physicalR;
                this.physicalR += lengthDiff * 0.1; // Adjust by 10% of the difference for finer control
                this.physicalR = Math.max(BASE_MIN_LENGTH, Math.min(BASE_MAX_LENGTH, this.physicalR));
                
                this.updateDisplayProperties(height);
                this.updateNote();
            }
            
            this.angle = Math.atan2(physicalX, physicalY);
            this.aVelocity = 0;
            
            needsRedraw = true;
        }
    };

    this.checkStillness = function() {
        var currentTime = Date.now();
        var dx = Math.abs(this.position.x - this.lastPosition.x);
        var dy = Math.abs(this.position.y - this.lastPosition.y);
        var distanceMoved = Math.sqrt(dx*dx + dy*dy);

        if (distanceMoved < 0.01) { // Threshold for considering it "still"
            if (currentTime - this.lastMoveTime > 4000) {
                this.isStill = true;
             //   post("Pendulum " + this.id + " stopped moving and rendering.\n");
            }
        } else {
            this.lastMoveTime = currentTime;
            this.isStill = false;
        }

        this.lastPosition.x = this.position.x;
        this.lastPosition.y = this.position.y;
    };

    this.applyGlobalSettings = function() {
        if (globalAirResistanceSet) this.airResistance = globalDefaultAirResistance;
        if (globalVelocitySet) this.aVelocity = globalDefaultVelocity;
        if (globalAccelerationSet) this.aAcceleration = globalDefaultAcceleration;
        if (globalDampingSet) this.dampingCoeff = globalDefaultDamping;
        if (globalSmallAngleThresholdSet && this.useGlobalSmallAngleThreshold) 
            this.smallAngleThreshold = globalDefaultSmallAngleThreshold;
        if (globalFastMovementMultiplierSet && this.useGlobalFastMovementMultiplier) {
            this.maxFrequencyMultiplier = globalDefaultMaxFrequencyMultiplier;
            this.maxEnergy = globalDefaultMaxEnergy;
        }
    };

    this.startOscillation = function() {
        this.angle = Math.PI / 2;  // Start at 90 degrees
        this.applyGlobalSettings();
        this.dragging = false;
        this.isStill = false;
        this.lastMoveTime = Date.now();
        needsRedraw = true;
    };

    // In the Pendulum constructor, add these properties
    this.verySmallAngleThreshold = 0.01; // Threshold for very small angle behavior
    this.maxFrequencyMultiplier = 20; // Maximum multiplier for frequency at very small angles
}

function onclick(x, y, but, mod1, shift, caps, opt, mod2) {
    var currentTime = new Date().getTime();
    
    
    if (currentTime - lastClickTime < doubleClickThreshold) {
        // Double-click detected (left button only)
        for (var i = 0; i < pendulums.length; i++) {
            pendulums[i].startOscillation();
        }
    } else {
        // Single click
        var clickedAny = false;
        for (var i = 0; i < pendulums.length; i++) {
            if (pendulums[i].clicked(x, y, shift)) {
                clickedAny = true;
                post("Clicked pendulum " + pendulums[i].id + " with shift: " + shift + "\n");
                break;
            }
        }
    }
    
    lastClickTime = currentTime;
    sketch.mouseX = x;
    sketch.mouseY = y;
    needsRedraw = true;
}

function ondrag(x, y, but, mod1, shift, caps, opt, mod2) {
    sketch.mouseX = x;
    sketch.mouseY = y;
    
    if (!but) {
        // Mouse button released
        for (var i = 0; i < pendulums.length; i++) {
            pendulums[i].stopDragging();
        }
    }
    needsRedraw = true;
}

function onidleup() {
    for (var i = 0; i < pendulums.length; i++) {
        pendulums[i].stopDragging();
    }
}

function onresize(w, h) {
    width = w;
    height = h;
    The 
    // Update only display properties, not physical properties
    for (var i = 0; i < pendulums.length; i++) {
        pendulums[i].origin.x = width / 2;
        pendulums[i].origin.y = 0;
        pendulums[i].updateDisplayProperties(height);
    }
    
    mgraphics.redraw();
    needsRedraw = true;
}

function add_Bob(num) {
    numPendulums = Math.max(1, Math.min(16, num));
    pendulums = [];
    
    var lengthRange = BASE_MAX_LENGTH - BASE_MIN_LENGTH;
    
    for (var i = 0; i < numPendulums; i++) {
        var origin = {x: width/2, y: 0};
        // Use the index to determine the length, ensuring consistent order
        var length = BASE_MIN_LENGTH + (lengthRange * i / (numPendulums - 1));
        if (numPendulums === 1) length = BASE_MIN_LENGTH + lengthRange / 2; // Middle length for single pendulum
        Bob_armL[i] = length;
        var size = Bob_size[i];
        var mass = Math.pow(size / 50, 3) * 40; // Calculate mass based on size
        var newPendulum = new Pendulum(origin, length, mass, size);
        newPendulum.id = i + 1;
        newPendulum.applyGlobalSettings(); // Apply global settings to new pendulums
        newPendulum.updateDisplayProperties(height);
        pendulums.push(newPendulum);
    }
    
   // post("Created " + numPendulums + " pendulums with current global settings (including gravity: " + g + ").\n");
    needsRedraw = true;
}

function setBobSize(index, size) {
    index = Math.max(1, Math.min(16, index)) - 1;
    size = Math.max(10, Math.min(100, size));
    Bob_size[index] = size;
    if (index < numPendulums && pendulums[index]) {
        pendulums[index].physicalSize = size;
        // Update mass based on size (density remains constant)
        pendulums[index].physicalMass = Math.pow(size / 50, 3) * 40; // 50 is the default size, 40 is the default mass
        pendulums[index].updateDisplayProperties(height);
    }
 //   post("Set bob size for pendulum " + (index + 1) + " to " + size + " (Mass: " + pendulums[index].physicalMass.toFixed(2) + ")\n");
    needsRedraw = true;
}

function setBobArmL(index, length) {
    index = Math.max(1, Math.min(16, index)) - 1;
    length = Math.max(BASE_MIN_LENGTH, Math.min(BASE_MAX_LENGTH, length));
    Bob_armL[index] = length;
    if (index < numPendulums && pendulums[index]) {
        pendulums[index].physicalR = length;
        pendulums[index].updateDisplayProperties(height);
        pendulums[index].updateNote();
    }
    needsRedraw = true;
}

function setG(newG) {
    g = Math.max(0, Math.min(20, newG)); // Clamp between 0 and 20
    needsRedraw = true;
}

function setAr(index, value) {
    value = Math.max(0, Math.min(0.01, value)); // Clamp value between 0 and 0.01
    
    if (index === 0) {
        globalDefaultAirResistance = value;
        globalAirResistanceSet = true;
        for (var i = 0; i < pendulums.length; i++) {
            pendulums[i].applyGlobalSettings();
        }
    } else {
        // Set air resistance for a specific pendulum
        index = Math.max(1, Math.min(16, index)) - 1; // Convert to 0-indexed and clamp
        if (index < pendulums.length) {
            pendulums[index].airResistance = value;
        } 
    }
    
    needsRedraw = true;
}

function setVel(index, value) {
    if (index === 0) {
        globalDefaultVelocity = value;
        globalVelocitySet = true;
        for (var i = 0; i < pendulums.length; i++) {
            pendulums[i].applyGlobalSettings();
    //        pendulums[i].isStill = false; // Ensure the pendulum starts moving
        }
    } else {
        // Set velocity for a specific pendulum
        index = Math.max(1, Math.min(16, index)) - 1; // Convert to 0-indexed and clamp
        if (index < pendulums.length) {
            pendulums[index].aVelocity = value;
            pendulums[index].isStill = false; // Ensure the pendulum starts moving
        } 
    }
    
    needsRedraw = true;
}

function setAcc(index, value) {
    if (index === 0) {
        globalDefaultAcceleration = value;
        globalAccelerationSet = true;
        for (var i = 0; i < pendulums.length; i++) {
            pendulums[i].applyGlobalSettings();
   //         pendulums[i].isStill = false; // Ensure the pendulum starts moving
        }
    } else {
        // Set acceleration for a specific pendulum
        index = Math.max(1, Math.min(16, index)) - 1; // Convert to 0-indexed and clamp
        if (index < pendulums.length) {
            pendulums[index].aAcceleration = value;
    //        pendulums[index].isStill = false; // Ensure the pendulum starts moving
        } 
    }
    
    needsRedraw = true;
}

function setDamping(index, value) {
    value = Math.max(0, Math.min(0.1, value)); // Clamp value between 0 and 0.1
    
    if (index === 0) {
        globalDefaultDamping = value;
        globalDampingSet = true;
        for (var i = 0; i < pendulums.length; i++) {
            pendulums[i].applyGlobalSettings();
        }
    } else {
        // Set damping for a specific pendulum
        index = Math.max(1, Math.min(16, index)) - 1; // Convert to 0-indexed and clamp
        if (index < pendulums.length) {
            pendulums[index].dampingCoeff = value;
        } 
    }
    
    needsRedraw = true;
}

function setSmallAngleThreshold(index, value) {
    value = Math.max(0, Math.min(Math.PI/2, value)); // Clamp value between 0 and π/2 radians
    
    if (index === 0) {
        globalDefaultSmallAngleThreshold = value;
        globalSmallAngleThresholdSet = true;
        for (var i = 0; i < pendulums.length; i++) {
            pendulums[i].useGlobalSmallAngleThreshold = true;
            pendulums[i].applyGlobalSettings();
        }
    } else {
        // Set small angle threshold for a specific pendulum
        index = Math.max(1, Math.min(16, index)) - 1; // Convert to 0-indexed and clamp
        if (index < pendulums.length) {
            pendulums[index].smallAngleThreshold = value;
            pendulums[index].useGlobalSmallAngleThreshold = false;
            post("Set small angle threshold for pendulum " + (index + 1) + " to " + value.toFixed(4) + " radians\n");
        } 
    }
    
    needsRedraw = true;
}

function setFastMovementMultiplier(index, maxMultiplier, maxEnergy) {
    maxMultiplier = Math.max(1, maxMultiplier); // Ensure multiplier is at least 1
    maxEnergy = Math.max(1, maxEnergy); // Ensure maxEnergy is at least 1
    
    if (index === 0) {
        globalDefaultMaxFrequencyMultiplier = maxMultiplier;
        globalDefaultMaxEnergy = maxEnergy;
        globalFastMovementMultiplierSet = true;
        for (var i = 0; i < pendulums.length; i++) {
            pendulums[i].useGlobalFastMovementMultiplier = true;
            pendulums[i].applyGlobalSettings();
        }
    } else {
        // Set multiplier and maxEnergy for a specific pendulum
        index = Math.max(1, Math.min(16, index)) - 1; // Convert to 0-indexed and clamp
        if (index < pendulums.length) {
            pendulums[index].maxFrequencyMultiplier = maxMultiplier;
            pendulums[index].maxEnergy = maxEnergy;
            pendulums[index].useGlobalFastMovementMultiplier = false;
        } 
    }
    
    needsRedraw = true;
}

// Add this new function to handle rendering
function R() {
    if (needsRedraw) {
        mgraphics.redraw();
        needsRedraw = false;
    }
}

setup();