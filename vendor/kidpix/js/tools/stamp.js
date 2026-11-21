KiddoPaint.Tools.Toolbox.Stamp = function() {
    var tool = this;
    this.isDown = false;
    this.stamp = '🚂';
    this.size = 64;
    this.useColor = false;
    this.seed = 1;
    this.texture = function() {
        var altSize = KiddoPaint.Cache.getStampSettings(tool.stamp).altSize;
        if (KiddoPaint.Current.modifiedRange !== 0) {
            var modifiedSize = KiddoPaint.Current.modifiedRange + 112;
            KiddoPaint.Cache.setStampSetting(tool.stamp, 'altSize', modifiedSize);
            altSize = modifiedSize;
        }
        var scale = KiddoPaint.Current.stampScale || 1;
        tool.size = Math.round((KiddoPaint.Current.modified ? altSize : 64) * scale);

        var hueShift = KiddoPaint.Cache.getStampSettings(tool.stamp).hueShift;
        if (KiddoPaint.Current.modifiedCtrlRange !== 0) {
            var modifiedHue = KiddoPaint.Current.modifiedCtrlRange / 100;
            KiddoPaint.Cache.setStampSetting(tool.stamp, 'hueShift', modifiedHue);
            hueShift = modifiedHue;
        }

        return KiddoPaint.Stamps.stamp(tool.stamp, KiddoPaint.Current.modifiedAlt, KiddoPaint.Current.modifiedMeta, tool.size, hueShift, tool.useColor ? KiddoPaint.Current.color : null);
    };

    this.downAt = 0;
    this.lastSpot = null;

    this.mousedown = function(ev) {
        // A trigger tap can fire twice. A second hit this soon is the same tap.
        if (Date.now() - tool.downAt < 90) {
            return;
        }
        var rng = srng(tool.seed);
        tool.isDown = true;
        tool.downAt = Date.now();
        tool.lastSpot = ev;
        KiddoPaint.Sounds.stamp();

        KiddoPaint.Display.context.fillStyle = tool.useColor ? KiddoPaint.Current.color : null;
        var brushFill = tool.texture();
        KiddoPaint.Display.context.drawImage(brushFill, Math.round(ev._x), Math.round(ev._y - tool.size));
        if (KiddoPaint.Current.multiplier > 1) {
            for (var i = 0; i < 2 * KiddoPaint.Current.multiplier; i++) {
                var x = Math.round(ev._x + (1000 * rng.next() - 500));
                var y = Math.round(ev._y + (20 * rng.next() - 10) - tool.size);
                KiddoPaint.Display.context.drawImage(brushFill, x, y);
            }
        }
    };

    this.mousemove = function(ev) {
        if (tool.isDown) {
            // A click places the one stamp from mousedown. Holding past a trigger
            // click and moving draws a trail of that stamp.
            if (Date.now() - tool.downAt < 320) {
                return;
            }
            var gap = Math.max(36, tool.size * 0.85);
            if (tool.lastSpot && distanceBetween(tool.lastSpot, ev) < gap) {
                return;
            }
            var trail = tool.texture();
            KiddoPaint.Display.context.drawImage(trail, Math.round(ev._x), Math.round(ev._y - tool.size));
            tool.lastSpot = ev;
            return;
        }
        var rng = srng(tool.seed);
        if (!tool.isDown) {
            KiddoPaint.Display.previewContext.fillStyle = tool.useColor ? KiddoPaint.Current.color : null;
            var brushFill = tool.texture();
            KiddoPaint.Display.previewContext.drawImage(brushFill, Math.round(ev._x), Math.round(ev._y - tool.size));
            if (KiddoPaint.Current.multiplier > 1) {
                for (var i = 0; i < 2 * KiddoPaint.Current.multiplier; i++) {
                    var x = Math.round(ev._x + (1000 * rng.next() - 500));
                    var y = Math.round(ev._y + (20 * rng.next() - 10) - tool.size);
                    KiddoPaint.Display.previewContext.drawImage(brushFill, x, y);
                }
            }
        }
    };

    this.mouseup = function(ev) {
        tool.isDown = false;
        tool.seed += 1;
        KiddoPaint.Display.saveMain();
    };
};
KiddoPaint.Tools.Stamp = new KiddoPaint.Tools.Toolbox.Stamp();