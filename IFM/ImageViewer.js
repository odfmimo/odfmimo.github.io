class ImageViewer {
    constructor(root, requestEntryHandler) {
        this.viewerDiv = document.createElement("div");
        root.appendChild(this.viewerDiv);
        root.addEventListener("focus", _ => this.viewerDiv.focus());
        this.requestEntryHandler = requestEntryHandler;
        
        this.viewOptions = {
            mode: '',
            fit: '',
            page: 0,
            side: '',
        };
        this.preloadOptions = {
            current: [null, null],
            minNum: [3, 5],
            maxNum: [5, 10],
            maxSize: [10 * 1024 * 1024, 20 * 1024 * 1024]
        }
        
        this.imageList = [];
        
        this.viewerDiv.classList.add("imageViewer_viewer");

        this.contentDiv = document.createElement("div");
        this.contentDiv.classList.add("imageViewer_contentDiv");
        this.viewerDiv.appendChild(this.contentDiv);

        this.imageDiv = document.createElement("div");
        this.imageDiv.classList.add("imageViewer_imageDiv");
        this.contentDiv.appendChild(this.imageDiv);

        this.overlayOuterDiv = document.createElement("div");
        this.overlayOuterDiv.classList.add("imageViewer_overlayOuterDiv");
        this.contentDiv.appendChild(this.overlayOuterDiv);

        this.overlayDiv = document.createElement("div");
        this.overlayDiv.classList.add("imageViewer_overlayDiv");
        this.overlayOuterDiv.appendChild(this.overlayDiv);
        
        this.upperDiv = document.createElement("div");
        this.upperDiv.classList.add("imageViewer_upperDiv");
        this.viewerDiv.appendChild(this.upperDiv);
        
        this.pageDiv = document.createElement("span");
        this.pageDiv.classList.add("imageViewer_pageDiv");
        this.upperDiv.appendChild(this.pageDiv);
        
        this.pageDiv.innerHTML = `<span></span>&#47;<span></span>`;
        this.currentPageDiv = this.pageDiv.querySelector("span:first-of-type");
        this.totalPageDiv = this.pageDiv.querySelector("span:nth-of-type(2)");
        
        this.filenameDiv = document.createElement("span");
        this.filenameDiv.classList.add("imageViewer_filenameDiv");
        this.upperDiv.appendChild(this.filenameDiv);
        this.buttonDiv = document.createElement("span");
        this.buttonDiv.classList.add("imageViewer_buttonDiv");
        this.upperDiv.appendChild(this.buttonDiv);

        this.overlayButton = document.createElement("div");
        this.overlayButton.addEventListener("click", _ => {
            if (this.overlayDiv.style.visibility == "hidden") {
                this.overlayDiv.style.visibility = "visible";
            }
            else {
                this.overlayDiv.style.visibility = "hidden";
            }
        });
        this.overlayButton.innerHTML = "T";
        this.buttonDiv.appendChild(this.overlayButton);
        
        this.viewModeButton = document.createElement("div");
        this.viewModeButton.addEventListener("click", this._changeViewMode.bind(this));
        this.buttonDiv.appendChild(this.viewModeButton);
        
        this.fitModeButton = document.createElement("div");
        this.fitModeButton.addEventListener("click", this._changeFitMode.bind(this));
        this.buttonDiv.appendChild(this.fitModeButton);
        
        this.fullscreenButton = document.createElement("div");
        this.fullscreenButton.addEventListener("click", this._changeFullscreen.bind(this));
        this.fullscreenButton.innerHTML = "F";
        this.buttonDiv.appendChild(this.fullscreenButton);
        
        this.loadingDiv = document.createElement("div");
        this.loadingDiv.classList.add("imageViewer_loadingDiv");
        this.viewerDiv.appendChild(this.loadingDiv);
        this.loadingDiv.innerHTML = `<div></div><div></div><div></div>`;
        
        //(new ResizeObserver(this._resizeCanvas.bind(this))).observe(this.viewerDiv);
        window.addEventListener("resize", this._resizeCanvas.bind(this));

        this.viewerDiv.tabIndex = 0;
        this.viewerDiv.addEventListener("keydown", (event) => {
            switch(event.keyCode) {
                case 37: event.preventDefault(); this._transitPage(-1); break;
                case 39: event.preventDefault(); this._transitPage(1); break;
                case 38: this.contentDiv.scrollTop = this.contentDiv.scrollTop - this.contentDiv.offsetHeight; break;
                case 40: this.contentDiv.scrollTop = this.contentDiv.scrollTop + this.contentDiv.offsetHeight; break;
                case 13: event.preventDefault(); this.upperDiv.style.visibility = (this.upperDiv.style.visibility=='visible')?'hidden':'visible'; break;
            }
        });
        
        //this.contentDiv.addEventListener("mousedown", (event) => event.preventDefault() );
        this.contentDiv.addEventListener("click", (event) => {
            if (event.clientX > this.contentDiv.clientWidth * 2/3) this._transitPage(1);
            else if (event.clientX < this.contentDiv.clientWidth * 1/3) this._transitPage(-1);
            else if (event.clientY > this.contentDiv.clientHeight * 2/3) this._transitPage(1);
            else if (event.clientY < this.contentDiv.clientHeight * 1/3) this._transitPage(-1);
            else {
                var visibility = this.upperDiv.style.visibility;
                this.upperDiv.style.visibility = (visibility=='visible')?'hidden':'visible';
            }
        });
        
        this.touchStart = null;
        this.touchSwipe = false;
        this.contentDiv.addEventListener('touchstart', (event) => {
            if (event.targetTouches.length == 1) {
                this.touchStart = event.changedTouches[0];
                this.touchSwipe = true;
            }
            else this.touchSwipe = false;
        }, false);
        this.contentDiv.addEventListener('touchend', (event) => {
            if (this.touchSwipe && visualViewport.scale == 1) {
                const minSwipePixels = 50;
                var movedX = event.changedTouches[0].pageX - this.touchStart.pageX;
                var movedY = event.changedTouches[0].pageY - this.touchStart.pageY;
                if (Math.abs(movedX) > Math.abs(movedY) && Math.abs(movedX) > minSwipePixels) {
                    if (movedX >= 0) this._transitPage(-1);
                    else this._transitPage(1);
                }
            }
        }, false);
    }
    
    init(imageList, page=0) {
        /*if (this.viewerDiv.offsetHeight > this.viewerDiv.offsetWidth) this.viewOptions.mode = 'RL';
        else */this.viewOptions.mode = 'B';
        this.viewOptions.fit = 'HV';
        this.viewOptions.page = page;
        this.viewOptions.side = '';
        this.preloadOptions.current = [0, -1];

        this.imageList = imageList;

        this._setItems();
    }
    
    _changeViewMode() {
        if(this.viewOptions.mode == 'RL') this.viewOptions.mode = 'B';
        else if(this.viewOptions.mode == 'B') this.viewOptions.mode = 'LR';
        else this.viewOptions.mode = 'RL';
        this.viewOptions.side = '';
        this._setItems();
    }
    
    _changeFitMode() {
        if(this.viewOptions.fit == 'HV') this.viewOptions.fit = 'H';
        else this.viewOptions.fit = 'HV';
        this._setItems();
    }
    
    _changeFullscreen() {
        checkFullscreen() ? closeFullscreen() : openFullscreen(this.viewerDiv);
        function checkFullscreen() {
            if (
                  document.fullscreenElement || /* Standard syntax */
                  document.webkitFullscreenElement || /* Chrome, Safari and Opera syntax */
                  document.mozFullScreenElement ||/* Firefox syntax */
                  document.msFullscreenElement /* IE/Edge syntax */
                )
                return true;
            else return false;
        }

        function openFullscreen(elem) {
          if (elem.requestFullscreen) {
            elem.requestFullscreen();
          } else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen();
          } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            elem.webkitRequestFullscreen();
          } else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen();
          }
        }

        function closeFullscreen() {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
          } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
          } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
          }
        } 
    }

    _transitPage(direc) {
        if (direc == -1) {
            if ((this.viewOptions.mode == 'RL' || this.viewOptions.mode == 'LR')
                && (this.viewOptions.mode.charAt(1) == this.viewOptions.side)) this.viewOptions.side = this.viewOptions.mode.charAt(0);
            else {
                this.viewOptions.page = this.viewOptions.page - 1;
                this.viewOptions.side = this.viewOptions.mode.charAt(1);
            }
        }
        else if (direc == 1){
            if ((this.viewOptions.mode == 'RL' || this.viewOptions.mode == 'LR')
                && (this.viewOptions.mode.charAt(0) == this.viewOptions.side)) this.viewOptions.side = this.viewOptions.mode.charAt(1);
            else {
                this.viewOptions.page = this.viewOptions.page + 1;
                this.viewOptions.side = '';
            }
        }
        this._setItems();
    }

    _resizeCanvas() {
        if (this.viewerDiv.parentElement == null || this.imageList.length == 0) return;

        let imageDivRect = this.imageDiv.getBoundingClientRect();
        this.overlayOuterDiv.style.height = imageDivRect.height + 'px';
        let image = this.imageList[this.viewOptions.page].image;
        let imageRect = image.getBoundingClientRect();
        this.overlayDiv.style.setProperty("--scale", imageRect.width / image.naturalWidth);
    }

    /* current가 minNum 이하로 남으면 preload 실행 / preload 할 때는 maxSize만큼 실행*/
    _preloadImage() {
        let length = this.imageList.length;
        let page = this.viewOptions.page;
        let current = this.preloadOptions.current; //current[1]이 current[0]보다 작으면 current[1]에 length만큼 더하자
        let minNum = this.preloadOptions.minNum;
        let maxNum = this.preloadOptions.maxNum;
        let maxSize = this.preloadOptions.maxSize;
        
        let entrylist = []; //entry는 끝날때 한꺼번에 처리
        let loadImage = (index) => {
            let imageDesc = this.imageList[index];
            if (imageDesc.image) {
                return;
            }
            else if (imageDesc.src) {
                imageDesc.image = new Image();
                imageDesc.image.addEventListener("load", () => {
                    if (this.viewOptions.page == index) this._setItems();
                }, {once: true});
                let ext = /(?:\.([^.]+))?$/.exec(imageDesc.src)[1];
                if (ext && ext.toLowerCase() == "psd") {
                    if (typeof this.PSDPromise == "undefined") {
                        this.PSDPromise = new Promise(function (resolve, reject) {
                            var obj = document.createElement("script");
                            obj.src = "https://cdnjs.cloudflare.com/ajax/libs/psd.js/2.0.0/psd.js";
                            obj.onload = () => {
                                resolve(require('psd'));
                            }
                            document.head.appendChild(obj);
                        });
                    }
                    this.PSDPromise.then(PSD => {
                        /*PSD.fromURL(imageDesc.src).then(function(psd) {
                            imageDesc.image.src = psd.image.toPng().src;
                        });*/
                    })
                }
                else {
                    imageDesc.image.src = imageDesc.src;
                }
            }
            /*else if (imageDesc.entry) {
                entrylist.push(imageDesc.entry);
            }*/
        }

        let minRange0 = page - minNum[0];
        let minRange1 = page + minNum[1];
        if (minRange1 - minRange0 >= length - 1 ) {
            minRange0 = 0;
            minRange1 = length - 1;
        }
        else {
            minRange0 = ((minRange0%length)+length)%length;
            minRange1 = ((minRange1%length)+length)%length;
        }
        if (minRange1 < minRange0) minRange1 += length;
        let minRange = [minRange0, minRange1];
        if (this._inRange(minRange, current)) return; //minRange가 current 안에 있으면 아무것도 할 필요 없음

        let maxRange0 = page, maxRange1 = page;
        let i, sum;
        let count = 1;
        sum = this.imageList[(page%length+length)%length].size;
        for (i = 1; i <= maxNum[1]; i++) {
            if (sum >= maxSize[1] || count >= length) break;
            maxRange1 = ((page+i)%length+length)%length;
            sum += this.imageList[maxRange1].size;
            count++;
        }
        sum = this.imageList[(page%length+length)%length].size;
        for (i = 1; i <= maxNum[0]; i++) {
            if (sum >= maxSize[0] || count >= length) break;
            maxRange0 = ((page-i)%length+length)%length;
            sum += this.imageList[maxRange0].size;
            count++;
        }
        /*let i, sum;
        sum = 0;
        for (i = 0; i < maxNum[1]; i++) {
            maxRange1 = ((maxRange1+1)%length+length)%length;
            sum += this.imageList[maxRange1].size;
            if (sum > maxSize[1] || maxRange1 == maxRange0) break;
        }
        sum = 0;
        for (i = 0; i < maxNum[0]; i++) {
            maxRange0 = ((maxRange0-1)%length+length)%length;
            sum += this.imageList[maxRange0].size;
            if (sum > maxSize[0] || maxRange0 == maxRange1) break;
        }
        if (maxRange0 == maxRange1) {
            maxRange0 = 0;
            maxRange1 = length - 1;
        }*/
        if (maxRange1 < maxRange0) maxRange1 += length;
        let maxRange = [maxRange0, maxRange1];
        
        for (i = current[0]; i <= current[1]; i++) {
            if (!this._inRange(i, maxRange)) {
                let index = i % length;
                let imageDesc = this.imageList[index];
                //imageDesc.image = null;
                delete imageDesc.image;
            }
        }
        
        if (page < maxRange0) page += length;
        let temp = Math.min(page - maxRange0, maxRange1 - page);
        let ilist = [page];
        for (i = 1; i <= temp; i++) {
            ilist.push(page + i, page - i);
        }
        for (; i <= page - maxRange0; i++) {
            ilist.push(page - i);
        }
        for (; i <= maxRange1 - page; i++) {
            ilist.push(page + i);
        }
        ilist.forEach(i => {
            if (!this._inRange(i, current)) {
                let index = i % length;
                loadImage(index);
            }
        })

        this.preloadOptions.current = maxRange;
        //if (entrylist.length > 0) this.requestEntryHandler(entrylist);
    }

    _setItems() {
        this.totalPageDiv.innerHTML = this.imageList.length;
        this.viewModeButton.innerHTML = this.viewOptions.mode;
        this.fitModeButton.innerHTML = this.viewOptions.fit;

        if (this.imageList.length == 0) {
            this.currentPageDiv.innerHTML = '';
            this.filenameDiv.innerHTML = '';
            this.imageDiv.innerHTML = '';
            this.overlayDiv.innerHTML = '';
            return
        }

        this.viewOptions.page = ((this.viewOptions.page%this.imageList.length)+this.imageList.length)%this.imageList.length;

        this.currentPageDiv.innerHTML = (this.viewOptions.page + 1);

        let imageDesc = this.imageList[this.viewOptions.page];
        this.filenameDiv.innerHTML = imageDesc.title;
        if (!imageDesc.image || imageDesc.image.complete == false) {
            this.loadingDiv.style.visibility = "visible";
            this.viewOptions.side = '';
            this.imageDiv.innerHTML = '';
            this.overlayDiv.innerHTML = '';
        }
        else {
            this.loadingDiv.style.visibility = "hidden";

            let image = imageDesc.image;

            let swidth = image.naturalWidth;
            let sheight = image.naturalHeight;
            if (swidth > sheight && swidth > this.contentDiv.offsetWidth) {
                if (this.viewOptions.mode == 'RL' && this.viewOptions.side != 'L') this.viewOptions.side = 'R';
                else if (this.viewOptions.mode == 'LR' && this.viewOptions.side != 'R') this.viewOptions.side = 'L';
                else if (this.viewOptions.mode == 'B') this.viewOptions.side = '';
            }
            else this.viewOptions.side = '';
            this.currentPageDiv.innerHTML = (this.viewOptions.page + 1) + this.viewOptions.side;

            if (this.viewOptions.fit == 'H') this.contentDiv.classList.add("imageViewer_horizontal_scroll");
            else this.contentDiv.classList.remove("imageViewer_horizontal_scroll");
    
            this.contentDiv.classList.remove("imageViewer_left_side", "imageViewer_right_side");
            if (this.viewOptions.side == 'L') this.contentDiv.classList.add("imageViewer_left_side");
            else if (this.viewOptions.side == 'R') this.contentDiv.classList.add("imageViewer_right_side");

            let page = this.viewOptions.page;
            //image.decode().then(() => {
                if (page != this.viewOptions.page) return;
                this.contentDiv.scrollTop = 0;
                this.contentDiv.scrollLeft = 0;
                this.imageDiv.innerHTML = '';
                this.imageDiv.appendChild(image);

                this.overlayDiv.style.setProperty("--scale", 1);
                this.overlayDiv.innerHTML = '';
                this.overlayDiv.style.width = image.naturalWidth + 'px';
                this.overlayDiv.style.height = image.naturalHeight + 'px';

                if (imageDesc["textboxes"]) {
                    for (let textbox of imageDesc["textboxes"]) {
                        let textboxDiv = document.createElement("div")
                        textboxDiv.classList.add("imageViewer_overlayTextBoxDiv");
                        if (textbox["font_size"]) textboxDiv.style.fontSize = textbox["font_size"] + 'px';
                        this.overlayDiv.appendChild(textboxDiv);

                        textboxDiv.style.left = textbox["xywh"][0] + 'px';
                        textboxDiv.style.top = textbox["xywh"][1] + 'px';
                        textboxDiv.style.width = textbox["xywh"][2] + 'px';
                        textboxDiv.style.height = textbox["xywh"][3] + 'px';

                        /*if (textbox["lines"]) {
                            let backDiv = document.createElement("div");
                            backDiv.classList.add("imageViewer_overlayBackDiv");
                            textboxDiv.appendChild(backDiv);
                            for (let line of textbox["lines"]) {
                                let x_min = Number.MAX_SAFE_INTEGER, x_max = -1, y_min = Number.MAX_SAFE_INTEGER, y_max = -1;
                                for (let point of line) {
                                    x_min = Math.min(x_min, point[0]);
                                    x_max = Math.max(x_max, point[0]);
                                    y_min = Math.min(y_min, point[1]);
                                    y_max = Math.max(y_max, point[1]);
                                }
                                let div = document.createElement("div");
                                div.style.left = x_min - textbox["xywh"][0] + 'px';
                                div.style.top = y_min - textbox["xywh"][1] + 'px';
                                div.style.width = x_max - x_min + 1 + 'px';
                                div.style.height = y_max - y_min + 1 + 'px';
                                backDiv.appendChild(div);
                            }
                        }*/

                        let tempDiv = document.createElement("div");
                        tempDiv.style.fontSize = textbox["font_size"] + 'px';
                        textboxDiv.appendChild(tempDiv);

                        let tempSpan = document.createElement("span");
                        tempSpan.style.whiteSpace = "pre";
                        tempSpan.innerText = textbox["result"];
                        tempDiv.appendChild(tempSpan);

                        let tempSpanRect = tempSpan.getBoundingClientRect();
                        let scale = Math.sqrt(tempSpanRect.width * tempSpanRect.height / textbox["xywh"][2] / textbox["xywh"][3]);
                        let vertical = false;

                        let tempWidth = textbox["xywh"][2] * scale;
                        if (tempWidth < textbox["font_size"] * 4) {
                            if (tempWidth < textbox["font_size"] * 2 || textbox["xywh"][3] > textbox["xywh"][2] * 2.5) {
                                vertical = true;
                                tempWidth = textbox["xywh"][2];
                            }
                            else {
                                tempWidth = textbox["font_size"] * 4;
                            }
                        }
                        else {
                            tempWidth = tempWidth + textbox["font_size"];
                        }
                        tempDiv.style.width = tempWidth + 'px';
                        tempSpan.style.whiteSpace = null;
                        tempSpan.style.overflowWrap = "anywhere";

                        tempSpanRect = tempSpan.getBoundingClientRect();
                        textboxDiv.removeChild(tempDiv);

                        let textDiv = document.createElement("div");
                        textDiv.classList.add("imageViewer_overlayTextDiv");
                        textDiv.style.fontSize = textbox["font_size"] + 'px';
                        if (textbox["font_color"]) {
                            textDiv.style.color = `rgb(${textbox["font_color"][0]}, ${textbox["font_color"][1]}, ${textbox["font_color"][2]})`;
                        }
                        textDiv.style.width = tempSpanRect.width + 'px';
                        if (vertical) {
                            textDiv.style.height = tempSpanRect.height + 'px';
                            textDiv.style.writingMode = "vertical-rl";
                        }
                        textDiv.innerText = textbox["result"];
                        
                        let backDiv = document.createElement("div");
                        backDiv.innerText = textbox["result"];
                        textDiv.appendChild(backDiv);

                        textboxDiv.appendChild(textDiv);
                    }
                }
                this._resizeCanvas();
            //})
        }
        this._preloadImage();
    }
    
    _inRange(inner, outer) {
        if (typeof inner == 'number') inner = [inner, inner];
        let length = this.imageList.length;

        if (inner[0] >= outer[0] && inner[1] <= outer[1]) return true;
        if (inner[0] + length >= outer[0] && inner[1] + length <= outer[1]) return true;
        if (inner[0] >= outer[0] + length && inner[1] <= outer[1] + length) return true;
        return false;
    }
}
