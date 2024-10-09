/*

simple example of drawing random 3d spheres

*/

sketch.default3d();
vslices=60;

function bang()
{
	with (Math) {
		with (sketch) {
			shapeslice(vslices);
			moveto((random()-0.5)*2,(random()-0.5)*2,(random()-0.5)*2);
			glcolor(random(),random(),random(),1);
			sphere(random()*0.4);
		}
	}
	refresh();
}

function erase()
{
	sketch.glclear();
	refresh();
}

function fsaa(v)
{
	sketch.fsaa = v;
	refresh();
}

function polymode(f,b)
{
	sketch.glpolygonmode("front",f);
	sketch.glpolygonmode("back",b);
}

function ortho(v)
{
	if (v) {
		sketch.glmatrixmode("projection");
		sketch.glortho(-1,1,-1,1,0.01,1000.);
	}
}

function slices(v)
{
	vslices = v;
}