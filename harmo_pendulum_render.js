autowatch = 1;
inlets = 1;
outlets = 1;

var pendulums = [];
var width, height;
var noteSymbols = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function setup() {
    width = box.rect[2] - box.rect[0];
    height = box.rect[3] - box.rect[1];
}

function paint() {
    with (mgraphics) {
        // Clear the background
        set_source_rgba(0, 0, 0, 0);
        paint();
        
        // Draw rounded corner black background
        drawBackground();
        
        // Draw white line in the middle
        drawCenterLine();
        
        // Render pendulums
        for (var i = 0; i < pendulums.length; i++) {
            renderPendulum(pendulums[i]);
        }
    }
}

function drawBackground() {
    with (mgraphics) {
        var cornerRadius = 3;
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
    }
}

function drawCenterLine() {
    with (mgraphics) {
        set_source_rgba(1, 1, 1, 1);
        set_line_width(1);
        move_to(width/2, height);
        line_to(width/2, height/2);
        stroke();
    }
}

function renderPendulum(p) {
    with (mgraphics) {
        // Draw the pendulum arm (line)
        set_source_rgba(0.5, 0.8, 1, 1);
        set_line_width(0.5);
        move_to(width/2, 0);
        line_to(p[1], p[2]);
        stroke();

        // Draw the pendulum bob (circle)
        var ballr = p[4] / 2;
        set_source_rgba(0.5, 0.8, 1, 1);
        ellipse(p[1] - ballr, p[2] - ballr, ballr * 2, ballr * 2);
        fill();

        // Draw note letter
        set_source_rgba(1, 1, 1, 1);
        select_font_face("Arial", "normal");
        set_font_size(12);
        var noteLetterText = noteSymbols[p[7]];
        var letterWidth = text_measure(noteLetterText)[0];
        move_to(p[1] - ballr - letterWidth - 5, p[2] - 10);
        show_text(noteLetterText);

        // Draw cents deviation
        set_source_rgba(0.7, 0.7, 0.7, 1);
        set_font_size(10);
        var centsText = p[8] + " ct";
        var centsWidth = text_measure(centsText)[0];
        move_to(p[1] - ballr - centsWidth - 5, p[2] + 5);
        show_text(centsText);

        // Draw pendulum index
        set_source_rgba(1, 1, 1, 0.8);
        set_font_size(12);
        var indexText = "" + p[0];
        var indexWidth = text_measure(indexText)[0];
        move_to(p[1] + ballr + 5, p[2]);
        show_text(indexText);
    }
}

function msg_int(v) {
    if (v === 1) {
        outlet(0, "get_state");
    }
}

function list() {
    var args = arrayfromargs(arguments);
    pendulums = [];
    for (var i = 0; i < args.length; i += 9) {
        pendulums.push(args.slice(i, i + 9));
    }
    mgraphics.redraw();
}

function onclick(x, y, but, mod1, shift, caps, opt, mod2) {
    outlet(0, "click", x, y, shift);
}

function ondrag(x, y, but, mod1, shift, caps, opt, mod2) {
    outlet(0, "drag", x, y, but, shift);
}

function onresize(w, h) {
    width = w;
    height = h;
    outlet(0, "resize", width, height);
    mgraphics.redraw();
}

setup();