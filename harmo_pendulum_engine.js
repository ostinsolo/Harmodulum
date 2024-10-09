autowatch = 1;
outlets = 7;  // 6 original outlets + 1 for state updates

// Constants
var BASE_FREQUENCY = 261.6256; // C4 frequency in Hz
var SEMITONE_RATIO = Math.pow(2, 1/12);
var CENTS_RANGE = 50; // Maximum cents deviation from the base note (half a semitone)
var BASE_MIN_LENGTH = 80;
var BASE_MAX_LENGTH = 580;
var BASE_WINDOW_SIZE = 800;
var VISIBLE_LENGTH_RATIO = 0.92;

// Global variables
var pendulums = [];
var numPendulums = 1;
var width = 800;
var height = 600;
var g = 9.82;
var noteSymbols = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function bang() {
    for (var i = 0; i < pendulums.length; i++) {
        pendulums[i].startOscillation();
    }
    notifyStateChanged();
}

function setup() {
    add_Bob(1);
}

function Pendulum(origin, r, m, size) {
    this.origin = origin;
    this.physicalR = r;
    this.physicalMass = m;
    this.physicalSize = size;
    this.angle = Math.PI / 4;
    this.aVelocity = 0;
    this.aAcceleration = 0;
    this.damping = 0.995;
    this.ballr = size / 2;
    this.dragging = false;
    this.isStill = false;
    this.id = pendulums.length + 1;
    this.lastSide = 0;
    this.noteIndex = Math.floor(Math.random() * noteSymbols.length);
    this.cents = 0;
    this.frequency = 0;
    this.physicalPosition = {x: 0, y: 0};

    this.go = function() {
        if (!this.isStill) {
            this.update();
            this.checkStillness();
        }
    };

    this.update = function() {
        if (!this.dragging) {
            this.aAcceleration = (-1 * g / this.physicalR) * Math.sin(this.angle);
            this.aVelocity += this.aAcceleration;
            this.aVelocity *= this.damping;
            this.angle += this.aVelocity;
            
            this.physicalPosition = {
                x: this.origin.x + this.physicalR * Math.sin(this.angle),
                y: this.origin.y + this.physicalR * Math.cos(this.angle)
            };
        }
    };

    this.clicked = function(mx, my, shift) {
        var d = dist(mx, my, this.physicalPosition.x, this.physicalPosition.y);
        if (d < this.ballr) {
            this.dragging = true;
            this.isStill = false;
            return true;
        }
        return false;
    };

    this.drag = function(mx, my) {
        if (this.dragging) {
            var dx = mx - this.origin.x;
            var dy = my - this.origin.y;
            this.angle = Math.atan2(dx, dy);
            this.physicalPosition = {
                x: this.origin.x + this.physicalR * Math.sin(this.angle),
                y: this.origin.y + this.physicalR * Math.cos(this.angle)
            };
        }
    };

    this.stopDragging = function() {
        if (this.dragging) {
            this.dragging = false;
            this.aVelocity = 0;
        }
    };

    this.checkStillness = function() {
        if (Math.abs(this.aVelocity) < 0.0001 && Math.abs(this.angle) < 0.0001) {
            this.isStill = true;
        }
    };

    this.startOscillation = function() {
        this.angle = Math.PI / 4;
        this.aVelocity = 0;
        this.isStill = false;
    };

    this.updateNote = function() {
        var position = (this.physicalR - BASE_MIN_LENGTH) / (BASE_MAX_LENGTH - BASE_MIN_LENGTH);
        position = Math.max(0, Math.min(1, position));
        
        var totalCents = position * (noteSymbols.length * 100);
        var noteIndex = Math.floor(totalCents / 100);
        var cents = Math.round(totalCents % 100);
        
        if (cents > 50) {
            cents -= 100;
            noteIndex++;
        }
        
        this.noteIndex = noteIndex % noteSymbols.length;
        this.cents = cents;

        var octave = Math.floor(noteIndex / noteSymbols.length);
        var baseFrequency = BASE_FREQUENCY * Math.pow(2, octave) * Math.pow(SEMITONE_RATIO, this.noteIndex);
        this.frequency = baseFrequency * Math.pow(2, this.cents / 1200);
    };

    this.updateNote();
}

function add_Bob(num) {
    numPendulums = Math.max(1, Math.min(16, num));
    pendulums = [];
    
    var lengthRange = BASE_MAX_LENGTH - BASE_MIN_LENGTH;
    
    for (var i = 0; i < numPendulums; i++) {
        var origin = {x: width/2, y: 0};
        var length = BASE_MIN_LENGTH + (lengthRange * i / (numPendulums - 1));
        if (numPendulums === 1) length = BASE_MIN_LENGTH + lengthRange / 2;
        var size = 50;
        var mass = Math.pow(size / 50, 3) * 40;
        var newPendulum = new Pendulum(origin, length, mass, size);
        pendulums.push(newPendulum);
    }
    
    notifyStateChanged();
}

function updatePendulums() {
    var anyPendulumMoving = false;
    for (var i = 0; i < pendulums.length; i++) {
        if (!pendulums[i].isStill) {
            pendulums[i].go();
            anyPendulumMoving = true;
            
            var currentSide = pendulums[i].physicalPosition.x > width/2 ? 1 : -1;
            if (currentSide != pendulums[i].lastSide) {
                outputPendulumData(i);
            }
            pendulums[i].lastSide = currentSide;
        }
    }
    
    if (anyPendulumMoving) {
        notifyStateChanged();
    }
}

function outputPendulumData(index) {
    var p = pendulums[index];
    var noteLabel = noteSymbols[p.noteIndex];
    var sizeOutput = Math.round(mapRange(p.ballr * 2, 10, 100, 1, 127));
    sizeOutput = Math.max(1, Math.min(127, sizeOutput));
    
    outlet(0, p.id);
    outlet(1, noteLabel);
    outlet(2, sizeOutput);
    outlet(3, "Pendulum " + p.id + " Note: " + noteLabel + 
            " Size: " + sizeOutput + 
            " Frequency: " + p.frequency.toFixed(2) + " Hz" +
            " Cents: " + p.cents + "\n");
    outlet(4, p.frequency.toFixed(2));
    outlet(5, p.cents);
}

function notifyStateChanged() {
    var state = getState();
    outlet(6, state);
}

function onclick(x, y, shift) {
    for (var i = 0; i < pendulums.length; i++) {
        if (pendulums[i].clicked(x, y, shift)) {
            notifyStateChanged();
            break;
        }
    }
}

function ondrag(x, y) {
    for (var i = 0; i < pendulums.length; i++) {
        pendulums[i].drag(x, y);
    }
    notifyStateChanged();
}

function onidleup() {
    for (var i = 0; i < pendulums.length; i++) {
        pendulums[i].stopDragging();
    }
    notifyStateChanged();
}

function getState() {
    var state = [];
    for (var i = 0; i < pendulums.length; i++) {
        var p = pendulums[i];
        state.push([p.id, p.physicalPosition.x, p.physicalPosition.y, p.physicalR, p.physicalSize, p.angle, p.isStill, p.noteIndex, p.cents]);
    }
    return state;
}

function setG(newG) {
    g = Math.max(0, Math.min(20, newG));
}

function mapRange(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
}

function R() {
    updatePendulums();
    notifyStateChanged();
}

setup();