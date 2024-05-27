class FolderLister {
    constructor(root, filenameClickHandler) {
        this.listerDiv = document.createElement("div");
        root.appendChild(this.listerDiv);
        root.addEventListener("focus", _ => this.listerDiv.focus());
        this.filenameClickHandler = filenameClickHandler;

        this.list = [];
        this.sortKey = "type";
        this.sortOrder = "asc";
        this.selectedIndex = 0;

        let objLink = document.createElement("link");
        objLink.rel = "stylesheet";
        objLink.type = "text/css";
        objLink.href = "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css";
        document.head.appendChild(objLink);

        this.listerDiv.tabIndex = 0;
        this.listerDiv.addEventListener("keydown", (event) => {
            switch (event.keyCode) {
                case 13:
                    event.preventDefault();
                    this.table.querySelector(`.folderLister_item:nth-of-type(${this.selectedIndex + 1}) .folderLister_filename`).dispatchEvent(new MouseEvent("click"));
                    break;
                case 38: event.preventDefault(); this._navigateItem(-1); break;
                case 40: event.preventDefault(); this._navigateItem(1); break;
            }
        });

        window.addEventListener("resize", this._resize.bind(this), false);

        this.listerDiv.classList.add("folderLister_lister");

        this.upperDiv = document.createElement("div");
        this.upperDiv.classList.add("folderLister_upperDiv");
        this.listerDiv.appendChild(this.upperDiv);

        this.pathDiv = document.createElement("span");
        this.pathDiv.classList.add("folderLister_pathDiv");
        this.upperDiv.appendChild(this.pathDiv);
        this.buttonDiv = document.createElement("span");
        this.buttonDiv.classList.add("folderLister_buttonDiv");
        this.upperDiv.appendChild(this.buttonDiv);

        this.table = document.createElement("div");
        this.listerDiv.appendChild(this.table);
        this.table.classList.add("folderLister_table");

        this._sessionStorage('Downloads', { sortKey: 'mtime', sortOrder: 'desc' });
        this.listerDiv.addEventListener("scroll", () => this._sessionStorage(this.path, { scrollTop: this.listerDiv.scrollTop }), { passive: true });

        //polyfill
        if (!Element.prototype.scrollIntoViewIfNeeded) {
            Element.prototype.scrollIntoViewIfNeeded = function (centerIfNeeded) {
                "use strict";

                function makeRange(start, length) {
                    return { "start": start, "length": length, "end": start + length };
                }

                function coverRange(inner, outer) {
                    if (
                        false === centerIfNeeded ||
                        (outer.start < inner.end && inner.start < outer.end)
                    ) {
                        return Math.max(
                            inner.end - outer.length,
                            Math.min(outer.start, inner.start)
                        );
                    }
                    return (inner.start + inner.end - outer.length) / 2;
                }

                function makePoint(x, y) {
                    return {
                        "x": x,
                        "y": y,
                        "translate": function translate(dX, dY) {
                            return makePoint(x + dX, y + dY);
                        }
                    };
                }

                function absolute(elem, pt) {
                    while (elem) {
                        pt = pt.translate(elem.offsetLeft, elem.offsetTop);
                        elem = elem.offsetParent;
                    }
                    return pt;
                }

                var target = absolute(this, makePoint(0, 0)),
                    extent = makePoint(this.offsetWidth, this.offsetHeight),
                    elem = this.parentNode,
                    origin;

                while (elem instanceof HTMLElement) {
                    // Apply desired scroll amount.
                    origin = absolute(elem, makePoint(elem.clientLeft, elem.clientTop));
                    elem.scrollLeft = coverRange(
                        makeRange(target.x - origin.x, extent.x),
                        makeRange(elem.scrollLeft, elem.clientWidth)
                    );
                    elem.scrollTop = coverRange(
                        makeRange(target.y - origin.y, extent.y),
                        makeRange(elem.scrollTop, elem.clientHeight)
                    );

                    // Determine actual scroll amount by reading back scroll properties.
                    target = target.translate(-elem.scrollLeft, -elem.scrollTop);
                    elem = elem.parentNode;
                }
            };
        }

        if (!String.prototype.padStart) {
            String.prototype.padStart = function padStart(targetLength, padString) {
              targetLength = targetLength >> 0; //truncate if number or convert non-number to 0;
              padString = String(typeof padString !== "undefined" ? padString : " ");
              if (this.length > targetLength) {
                return String(this);
              } else {
                targetLength = targetLength - this.length;
                if (targetLength > padString.length) {
                  padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
                }
                return padString.slice(0, targetLength) + String(this);
              }
            };
          }

        (function (self) {
            "use strict";
        
            // create a test element
            var testElem = document.createElement('test'),
                docElement = document.documentElement,
                defaultView = document.defaultView,
                getComputedStyle = defaultView && defaultView.getComputedStyle,
                computedValueBug,
                runit = /^(-?[\d+\.\-]+)([a-z]+|%)$/i,
                convert = {},
                conversions = [1 / 25.4, 1 / 2.54, 1 / 72, 1 / 6],
                units = ['mm', 'cm', 'pt', 'pc', 'in', 'mozmm'],
                i = 6; // units.length
        
            // add the test element to the dom
            docElement.appendChild(testElem);
        
            // test for the WebKit getComputedStyle bug
            // @see http://bugs.jquery.com/ticket/10639
            if (getComputedStyle) {
                // add a percentage margin and measure it
                testElem.style.marginTop = '1%';
                computedValueBug = getComputedStyle(testElem).marginTop === '1%';
            }
        
            // pre-calculate absolute unit conversions
            while (i--) {
                convert[units[i] + "toPx"] = conversions[i] ? conversions[i] * convert.inToPx : toPx(testElem, '1' + units[i]);
            }
        
            // remove the test element from the DOM and delete it
            docElement.removeChild(testElem);
            testElem = undefined;
        
            // convert a value to pixels
            function toPx(elem, value, prop, force) {
                // use width as the default property, or specify your own
                prop = prop || 'width';
                if (typeof value == 'number' || value == parseFloat(value)) return parseFloat(value); // 단위 없을때 처리
                var style,
                    inlineValue,
                    ret,
                    unit = (value.match(runit) || [])[2],
                    conversion = unit === 'px' ? 1 : convert[unit + 'toPx'],
                    rem = /r?em/i;
        
                if (conversion || rem.test(unit) && !force) {
                    // calculate known conversions immediately
                    // find the correct element for absolute units or rem or fontSize + em or em
                    elem = conversion ? elem : unit === 'rem' ? docElement : prop === 'fontSize' ? elem.parentNode || elem : elem;
        
                    // use the pre-calculated conversion or fontSize of the element for rem and em
                    conversion = conversion || parseFloat(curCSS(elem, 'fontSize'));
        
                    // multiply the value by the conversion
                    ret = parseFloat(value) * conversion;
                } else {
                    // begin "the awesome hack by Dean Edwards"
                    // @see http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291
        
                    // remember the current style
                    style = elem.style;
                    inlineValue = style[prop];
        
                    // set the style on the target element
                    try {
                        style[prop] = value;
                    } catch (e) {
                        // IE 8 and below throw an exception when setting unsupported units
                        return 0;
                    }
        
                    // read the computed value
                    // if style is nothing we probably set an unsupported unit
                    ret = !style[prop] ? 0 : parseFloat(curCSS(elem, prop));
        
                    // reset the style back to what it was or blank it out
                    style[prop] = inlineValue !== undefined ? inlineValue : null;
                }
        
                // return a number
                return ret;
            }
        
            // return the computed value of a CSS property
            function curCSS(elem, prop) {
                var value,
                    pixel,
                    unit,
                    rvpos = /^top|bottom/,
                    outerProp = ["paddingTop", "paddingBottom", "borderTop", "borderBottom"],
                    innerHeight,
                    parent,
                    i = 4; // outerProp.length
        
                if (getComputedStyle) {
                    // FireFox, Chrome/Safari, Opera and IE9+
                    value = getComputedStyle(elem)[prop];
                } else if (pixel = elem.style['pixel' + prop.charAt(0).toUpperCase() + prop.slice(1)]) {
                    // IE and Opera support pixel shortcuts for top, bottom, left, right, height, width
                    // WebKit supports pixel shortcuts only when an absolute unit is used
                    value = pixel + 'px';
                } else if (prop === 'fontSize') {
                    // correct IE issues with font-size
                    // @see http://bugs.jquery.com/ticket/760
                    value = toPx(elem, '1em', 'left', 1) + 'px';
                } else {
                    // IE 8 and below return the specified style
                    value = elem.currentStyle[prop];
                }
        
                // check the unit
                unit = (value.match(runit) || [])[2];
                if (unit === '%' && computedValueBug) {
                    // WebKit won't convert percentages for top, bottom, left, right, margin and text-indent
                    if (rvpos.test(prop)) {
                        // Top and bottom require measuring the innerHeight of the parent.
                        innerHeight = (parent = elem.parentNode || elem).offsetHeight;
                        while (i--) {
                            innerHeight -= parseFloat(curCSS(parent, outerProp[i]));
                        }
                        value = parseFloat(value) / 100 * innerHeight + 'px';
                    } else {
                        // This fixes margin, left, right and text-indent
                        // @see https://bugs.webkit.org/show_bug.cgi?id=29084
                        // @see http://bugs.jquery.com/ticket/10639
                        value = toPx(elem, value);
                    }
                } else if ((value === 'auto' || (unit && unit !== 'px')) && getComputedStyle) {
                    // WebKit and Opera will return auto in some cases
                    // Firefox will pass back an unaltered value when it can't be set, like top on a static element
                    value = 0;
                } else if (unit && unit !== 'px' && !getComputedStyle) {
                    // IE 8 and below won't convert units for us
                    // try to convert using a prop that will return pixels
                    // this will be accurate for everything (except font-size and some percentages)
                    value = toPx(elem, value) + 'px';
                }
                return value;
            }
        
            // expose the conversion function to the window object
            //window.Length = {
            //    toPx: toPx
            //};
            self.toPx = toPx;
        }(this));
    }

    init(path, data) {
        this.path = path;
        this.list = [];

        let option = this._sessionStorage(this.path);
        this.sortKey = option.sortKey ? option.sortKey : "type";
        this.sortOrder = option.sortOrder ? option.sortOrder : "asc";
        this.selectedIndex = option.selectedIndex ? option.selectedIndex : 0;

        this.list = data;

        this._sort();
        this._resize();
        this.listerDiv.scrollTop = option.scrollTop;
    }

    _sort(key, order) {
        if (key) {
            if (key == this.sortKey && order == undefined)
                this.sortOrder = (this.sortOrder == "asc") ? "desc" : "asc";
            else {
                this.sortKey = key;
                if (order != undefined) this.sortOrder = order;
                else this.sortOrder = "asc";
            }
            this._sessionStorage(this.path, { sortKey: this.sortKey, sortOrder: this.sortOrder });
        }
        let selectedItem = this.list[this.selectedIndex];

        this.list.sort((a, b) => {
            if (a.name == "..") return -1;
            if (b.name == "..") return 1;
            if (this.sortKey == "type" || this.sortKey == "size") {
                if (a.type == "directory" && b.type != "directory") return -1;
                if (a.type != "directory" && b.type == "directory") return 1;
                //if (a.type == "directory" && b.type == "directory")
                //    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            }

            let result = 0;
            if (this.sortKey == "name") result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            else result = a[this.sortKey] < b[this.sortKey] ? -1 : a[this.sortKey] > b[this.sortKey] ? 1 : a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            if (this.sortOrder == "desc") result = -result;
            return result;
        });
        if (key) this.selectedIndex = this.list.indexOf(selectedItem);

        this._show();
    }

    _show() {
        this.pathDiv.innerHTML = ((this.path.substring(0, 1) == "/") ? "" : "/") + this.path;
        this.table.innerHTML = "";

        this.list.forEach((value, index) => {
            let tr = document.createElement("div");
            tr.classList.add("folderLister_item");

            let mtime = this._formatDate(value.mtime);
            let iconclass = 'fa-file-o';
            if (value.name == '..') iconclass = 'fa-level-up';
            else if (value.type == 'directory') iconclass = 'fa-folder';
            else if (value.type == 'image') iconclass = 'fa-file-image-o';
            else if (value.type == 'video') iconclass = 'fa-file-video-o';
            else if (value.type == 'audio') iconclass = 'fa-file-audio-o';
            else if (value.type == 'archive') iconclass = 'fa-file-archive-o';
            else if (value.type == 'text') iconclass = 'fa-file-text-o';
            else if (value.type == 'pdf') iconclass = 'fa-file-pdf-o';

            let iconclass_td = document.createElement("div");
            iconclass_td.classList.add("folderLister_iconclass");
            tr.appendChild(iconclass_td);
            let filename_td = document.createElement("div");
            filename_td.classList.add("folderLister_filename");
            tr.appendChild(filename_td);
            let filemtime_td = document.createElement("div");
            filemtime_td.classList.add("folderLister_filemtime");
            tr.appendChild(filemtime_td);
            let filesize_td = document.createElement("div");
            filesize_td.classList.add("folderLister_filesize");
            tr.appendChild(filesize_td);

            iconclass_td.innerHTML = `<i class="fa ${iconclass}"></i>`;
            filename_td.innerHTML = value.name;
            filemtime_td.innerHTML = `<span>${mtime.date}</span> <span>${mtime.time}</span>`;
            filesize_td.innerHTML = this._getReadableFileSizeString(value.size);

            tr.addEventListener("click", (event) => {
                this.selectedIndex = index;
                this._navigateItem(0);
            });
            tr.addEventListener("auxclick", (event) => {
                this.selectedIndex = index;
                this._navigateItem(0);
            });
            filename_td.addEventListener("click", (event) => {
                this.filenameClickHandler(event, value.name);
            });
            filename_td.addEventListener("auxclick", (event) => {
                this.filenameClickHandler(event, value.name);
            });

            var touchstartTimeoutID, touchstartEvent;
            filename_td.addEventListener("touchstart", (event) => {
                touchstartEvent = event;
                touchstartTimeoutID = setTimeout(() => {
                    if (document.body.contains(event.target)) {
                        event.target.dispatchEvent(new MouseEvent("click", {button : 1}));
                    }
                }, 500);
            });
            filename_td.addEventListener("touchmove", (event) => {
                if (Math.abs(event.changedTouches[0].screenX - touchstartEvent.changedTouches[0].screenX) > 10 || Math.abs(event.changedTouches[0].screenY - touchstartEvent.changedTouches[0].screenY) > 10) {
                    clearTimeout(touchstartTimeoutID);
                }
            });
            filename_td.addEventListener("touchend", (event) => {
                clearTimeout(touchstartTimeoutID);
            });
            filename_td.addEventListener("touchcancel", (event) => {
                clearTimeout(touchstartTimeoutID);
            });

            this.table.appendChild(tr);
        });
        
        this._navigateItem(0);
    }

    _resize() {
        var lister_em = parseFloat(getComputedStyle(this.listerDiv).fontSize);
        var lister_width = this.table.offsetWidth;
        if (lister_width < lister_em * 50) {
            this.listerDiv.classList.add('folderLister_lister_alt');
        }
        else {
            this.listerDiv.classList.remove('folderLister_lister_alt');
        }
    }

    _navigateItem(direc) {
        var currentTr = this.table.querySelector(`.folderLister_selectedItem`);
        if (currentTr) currentTr.classList.remove('folderLister_selectedItem');

        this.selectedIndex = (this.selectedIndex + direc + this.list.length) % this.list.length;
        var currentTr = this.table.querySelector(`.folderLister_item:nth-of-type(${this.selectedIndex + 1})`);
        currentTr.classList.add('folderLister_selectedItem');
        //currentTr.scrollIntoViewIfNeeded(false);
        
        let currentTr_offsetTop = currentTr.offsetTop;
        let currentTr_offsetBottom = currentTr_offsetTop + currentTr.offsetHeight;
        let lister_scrollTop = this.listerDiv.scrollTop;
        let lister_offsetHeight = this.listerDiv.offsetHeight;
        let upperDiv_offsetHeight = this.upperDiv.offsetHeight;

        if (currentTr_offsetTop < lister_scrollTop + upperDiv_offsetHeight) this.listerDiv.scrollTop = currentTr_offsetTop - upperDiv_offsetHeight;
        else if (currentTr_offsetBottom > lister_scrollTop + lister_offsetHeight) this.listerDiv.scrollTop = currentTr_offsetBottom - lister_offsetHeight;

        this._sessionStorage(this.path, { selectedIndex: this.selectedIndex })
    }

    _getReadableFileSizeString(fileSizeInBytes) {
        if (fileSizeInBytes == "" || fileSizeInBytes == "-" || Number.isNaN(fileSizeInBytes)) return fileSizeInBytes;
        var i = -1;
        var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
        do {
            fileSizeInBytes = fileSizeInBytes / 1024;
            i++;
        } while (fileSizeInBytes > 1024);

        return Math.max(fileSizeInBytes, 0).toFixed(1) + byteUnits[i];
    };

    _formatDate(timestamp) {
        timestamp = typeof timestamp == "number" ? timestamp * 1000 : timestamp; //python
        var d = new Date(timestamp);
        /*var n = d.toJSON();
        if (!n) return { date: '', time: '' };
        var m = n.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}).\d{3}Z/)
        if (!m) return { date: '', time: '' };
        return { date: m[1], time: m[2] };*/
        if (isNaN(d.getTime())) return { date: '', time: '' };
        var fullyear = d.getFullYear().toString();
        var year = fullyear.substring(2);
        var month = (d.getMonth() + 1).toString().padStart(2, '0');
        var date = d.getDate().toString().padStart(2, '0');
        var hours = d.getHours().toString().padStart(2, '0');
        var minutes = d.getMinutes().toString().padStart(2, '0');
        var seconds = d.getSeconds().toString().padStart(2, '0');
        return { date: `${fullyear}-${month}-${date}`, time: `${hours}:${minutes}:${seconds}`};

    }

    _copyNodeStyle(sourceNode, targetNode) {
        const computedStyle = window.getComputedStyle(sourceNode);
        Array.from(computedStyle).forEach(key => {
            targetNode.style.setProperty(key, computedStyle.getPropertyValue(key), computedStyle.getPropertyPriority(key))
        })
        targetNode.style.fontSize = "" //알 수 없는 버그 때문에..
    }

    _sessionStorage(key, value) {
        var oldValue = Object.assign({}, JSON.parse(sessionStorage.getItem(key)));
        if (value) return sessionStorage.setItem(key, JSON.stringify(Object.assign(oldValue, value)));
        else return oldValue;
    }
}
