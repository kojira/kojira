// コード出典
// HTMLの暴走 (meltdown3)
// http://d.hatena.ne.jp/KAZUMiX/20090421/meltdown3

/**
 * meltdown3.js
 * Copyright (c) 2009 KAZUMiX
 * http://d.hatena.ne.jp/KAZUMiX/20090421/meltdown3
 * 
 * 更新履歴
 * 2009/05/01 noCacheQueryのとこ、IEだとつねにキャッシュされないようにしないと挙動不審になるようなので修正
 * 2009/04/29 Flash(AS3)側で読み込む画像のタイムアウトを設定
 * 2009/04/26 コメント追加
 * 2009/04/21 公開
 */

(function(){
   var noCacheQuery = '?ver=1.0.' + (new Date).getTime();
   //var noCacheQuery = '?ver=1.0.1';
   
   // 初期設定
   var thisScriptName = 'meltdown3.js';
   var meltdownFlashName = 'meltdown3.swf' + noCacheQuery;
   var meltdownFlashName2 = 'meltdown3end.swf' + noCacheQuery;
   var flashId = 'externalMeltdown3';
   
   var d = document;
   
   // テキストを1文字ずつ囲うために使うタグ
   // span とか div ではなく、オリジナルなオレオレタグにしておく
   // CSSの影響を受けないため都合がよい
   // document.createElementで任意のタグも問題無く生成可能
   var tag = 'KZM'; // オレオレタグ
   
   // 表示位置を保存
   var initScrollX = d.documentElement.scrollLeft||d.body.scrollLeft;
   var initScrollY = d.documentElement.scrollTop||d.body.scrollTop;

   // HTML要素の座標を取得するための関数
   var getPoint = function(elm){
     var x=0,y=0;
     while(elm){
       x += elm.offsetLeft;
       y += elm.offsetTop;
       elm = elm.offsetParent;
     }
     return {x:x, y:y};
   };
   
   // 要素のスタイルを取得するための関数
   // IEだけは特殊なのでここで判別しておく
   var isIE = false;
   var computedStyle = function(){
     if(window.getComputedStyle){ //モダンブラウザ
       return function(elm,prop){return window.getComputedStyle(elm,null)[prop];};
     }else if(d.body.currentStyle){ //IE
       isIE = true;
       return function(elm,prop){if(!elm.currentStyle){return '';};return elm.currentStyle[prop];};
     }
     return null;
   }();

   // スクリプトのパスを取得する関数（適当）
   var getScriptPath = function(scriptName){
     var re = new RegExp('/'+scriptName + '\\b');
     var scripts = d.getElementsByTagName('script');
     for (var i = 0, len = scripts.length; i < len; i++) {
       var script = scripts[i];
       if (re.test(script.src)) {
         var splitPath = script.src.split(scriptName);
         return splitPath[0];
       }
     }
     return '';
   };

   // 現在のウィンドウサイズでのHTMLの文章のサイズを得る関数
   var getDocumentSize = function(){
     return {width:Math.max(d.body.scrollWidth, d.documentElement.scrollWidth), height:Math.max(d.body.scrollHeight, d.documentElement.scrollHeight)};
   };

   // コンテンツを表示するウィンドウサイズを得る関数
   var getWindowSize = function(){
     var result = {};
     if(window.innerWidth){
       var box = d.createElement('div');
       with(box.style){
         position = 'absolute';
         top = '0px';
         left = '0px';
         width = '100%';
         height = '100%';
         margin = '0px';
         padding = '0px';
         border = 'none';
         visibility = 'hidden';
       }
       d.body.appendChild(box);
       var width = box.offsetWidth;
       var height = box.offsetHeight;
       d.body.removeChild(box);
       result = {width:width, height:height};
     }else{
       result = {width:d.documentElement.clientWidth || d.body.clientWidth, height:d.documentElement.clientHeight || d.body.clientHeight};
     }
     return result;
   };
   
   // Flashに制御を移すときに呼ぶ
   var addFlash = function(){
     var url = meltdown3.path + meltdownFlashName;
     var overlayBox = d.createElement('div');
     overlayBox.id = flashId + 'Container';
     with(overlayBox.style){
       position = 'absolute';
       top = initScrollY + 'px';
       left = initScrollX + 'px';
       width = windowSize.width + 'px';
       height = windowSize.height + 'px';
       overflow = 'hidden';
       zIndex = '2001';
     }
     overlayBox.innerHTML = '<object width="100%" height="100%" id="' + flashId + '" align="middle" data="' + url + '" type="application/x-shockwave-flash"><param name="allowScriptAccess" value="always" /><param name="movie" value="' + url + '" /><param name="quality" value="low" /><param name="wmode" value="transparent" /><param name="scale" value="noscale" /><param name="salign" value="lt" /><param name="menu" value="false" /></object>';
     d.body.appendChild(overlayBox);
   };

   //
   // ここら辺から本番
   //
   
   // AS3のExternalInterface.call()で呼び出すためにグローバル変数を用意しておく
   window.KAZUMiXmeltdown3 = {};
   var meltdown3 = window.KAZUMiXmeltdown3;
   meltdown3.path = getScriptPath(thisScriptName);
   meltdown3.endSwf = meltdown3.path + meltdownFlashName2;
   meltdown3.isIE = isIE;
   
   // AS3から呼び出し用
   // 上の方で保存されたスクロール位置移動させるための関数
   // setTimeoutでやったほうがいいようなそうでないのなという迷いがあった
   // 結局setTimeoutはやめた
   meltdown3.setScrollPosition = function(){
     var currentScrollPosition = function(){
       scrollTo(initScrollX, initScrollY);
     };
     return function(){
       //setTimeout(currentScrollPosition, 0);
       currentScrollPosition();
     };
   }();
   
   // 最後の演出でタグの統計情報を表示するための配列
   meltdown3.tagInfos = function(){
     var result = [];
     var elms = d.getElementsByTagName('*');
     for(var i=0,len=elms.length; i<len; i++){
       var elm = elms[i];
       if(elm.id=='KM3' || (elm.tagName.indexOf('!') != -1)){
         continue;
       }
       // なぜかタグのidに別ノードの参照が入っていることがあるため文字列かどうかチェック
       var elmId = elm.id;
       if(typeof(elm.id) != 'string'){
         elmId = '';
       }
       result.push({tagName:elm.tagName, id:elmId});
     }
     return result;
   }();
   
   // 上記配列をAS3にそのまま渡せれば問題無かったのだけど、
   // 配列が大きいと失敗することがあるために作った一つずつ渡す関数
   meltdown3.getTagInfo = function(){
     var tagInfos = meltdown3.tagInfos;
     var counter = 0;
     var maxCounter = tagInfos.length;
     return function(){
       if(counter >= maxCounter){
         return null;
       }
       return tagInfos[counter++];
     };
   }();
   
   // 最後の演出時に隠す対象の要素
   // Flashの裏に色々あるとFirefoxの描画が怪しくなるので隠す
   var allHideTargets = function(){
     var result = [];
     for(var i=0,len=d.body.childNodes.length; i<len; i++){
       var node = d.body.childNodes[i];
       if(node.nodeType == 1){
         result.push(node);
       }
     }
     return result;
   }();
   
   // ↑を隠すために呼ぶ
   meltdown3.hideAll = function(){
     for(var i=0,len=allHideTargets.length; i<len; i++){
       allHideTargets[i].style.visibility = 'hidden';
     }
   };
   
   var windowSize = getWindowSize();
   
   // ウィンドウ内に表示されている要素かチェックするための関数
   var isTargetInViewPort = function(elm){
     var point = getPoint(elm);
     elm._point = point;
     if(point.y > windowSize.height+initScrollY || point.y+elm.offsetHeight < initScrollY){
       return false;
     }
     return true;
   };

   // 対象のテキストノード、画像などを配列に保存する
   var targetTextNodes = [];
   //var notTargetTextNodes = [];
   var targetImages = [];
   var embedObjects = [];
   var setTargetTextNodes  = function(){
     var windowSize = getWindowSize();
     var exceptionTag = /^(?:script|noscript|param|link|select|input)$/i;
     var exceptionText = /^\s+$/;
     var visible = function(elm){
       if(computedStyle(elm, 'display') == 'none'){
         return false;
       }
       if(computedStyle(elm, 'visibility') == 'hidden'){
         return false;
       }
       if( (elm.offsetWidth == 0 || elm.offsetHeight == 0) && computedStyle(elm, 'overflow') == 'hidden'){
         return false;
       }
       if(parseInt(computedStyle(elm, 'textIndent'),10) < -100){
         return false;
       }
       return true;
     };
     var getTextNodes = function(node){
       node._textNodeScaned = true;
       // ↑HTMLがエラーだらけだとIEで無限ループすることがあるのでチェックしたかどうか保存
       for (var i = 0, len = node.childNodes.length; i < len; i++) {
         var childNode = node.childNodes[i];
         if (childNode.nodeType == 3 && !exceptionText.test(childNode.data)) {
           if(isTargetInViewPort(node)){
             targetTextNodes.push(childNode);
           }else{
             //notTargetTextNodes.push(childNode);
           }
           //console.log(childNode.parentNode, childNode);
         }
         else 
           if (/^img$/i.test(childNode.tagName) && visible(childNode) && isTargetInViewPort(childNode)){
             targetImages.push(childNode);
             //console.log(childNode);
           }
         else 
           if (/^(embed|object|iframe)$/i.test(childNode.tagName) && visible(childNode) && isTargetInViewPort(childNode)){
             embedObjects.push(childNode);
             //console.log(childNode);
           }
         else
           if (childNode.nodeType == 1 && !childNode._textNodeScaned && !exceptionTag.test(childNode.tagName) && visible(childNode)) {
             getTextNodes(childNode);
           }
       }
     };
     getTextNodes(d.body);
   }();
   
   // 1文字ずつタグで囲み、配列に保存する
   var targetCharas = function(){
     var result = [];
     var wrapperBase = d.createElement(tag);
     var wrappersBase = d.createElement(tag+tag);
     var breakForSafari = d.createElement(tag);
     breakForSafari.style.visibility = 'hidden';
     var isSafari = function(){
       if(navigator.userAgent.indexOf('WebKit') != -1){
         return true;
       }
       return false;
     }();
     for (var i = 0, len = targetTextNodes.length; i < len; i++) {
       var textNode = targetTextNodes[i];
       if(!textNode.parentNode){
         // 親がなかったらHTMLのエラーなので無視する（IEでありうる）
         continue;
       }
       var wrappers = wrappersBase.cloneNode(false);
       for (var j = 0, lenJ = textNode.data.length; j < lenJ; j++) {
         var chara = textNode.data.charAt(j);
         var wrapper = wrapperBase.cloneNode(false);
         var charaNode = d.createTextNode(chara);
         wrapper.appendChild(charaNode);
         wrappers.appendChild(wrapper);
         if(isSafari){
           var blank = breakForSafari.cloneNode(false);
           wrappers.appendChild(blank);
         }
         result.push(wrapper);
       }
       textNode.parentNode.insertBefore(wrappers, textNode);
       textNode.parentNode.removeChild(textNode);
     }
     return result;
   }();

   // 要素の座標を取得して保存する
   var setPositionInfo = function(){
     var reWhiteSpace = /\s/;
     var targetCharasInViewPort = [];
     for(var i=0, len=targetCharas.length; i<len; i++){
       var targetChara = targetCharas[i];
       var point = getPoint(targetChara);
       var offsetWidth = targetChara.offsetWidth;
       var offsetHeight = targetChara.offsetHeight;
       var centerX = point.x + offsetWidth / 2;
       var centerY = point.y + offsetHeight / 2;
       targetChara._point = point;
       targetChara._offsetWidth = offsetWidth;
       targetChara._offsetHeight = offsetHeight;
       targetChara._centerX = centerX;
       targetChara._centerY = centerY;
       targetChara._character = true;
       targetChara._isInViewPort = function(){
         if( ( (point.y + offsetHeight) < initScrollY ) || ( point.y > (initScrollY + windowSize.height ) ) ){
           return false;
         }
         if( reWhiteSpace.test(targetChara.childNodes[0].data) ){
           return false;
         }
         targetCharasInViewPort.push(targetChara);
         return true;
       }();
     }
     targetCharas = targetCharasInViewPort;
     
   }();
   
   // フォント情報を親に設定しておく
   var setFontInfo = function(){
     
     // ↓これが必要になるのはIEでカラーネーム使ってるページだけなので。全対応しません
     var fontColorKeys = {
       black : 0,
       silver : 0xc0c0c0,
       gray : 0x808080,
       white : 0xffffff,
       maroon : 0x800000,
       red : 0xff0000,
       purple : 0x800080,
       fuchsia : 0xff00ff,
       green : 0x008000,
       lime : 0x00ff00,
       olive : 0x808000,
       yellow : 0xffff00,
       navy : 0x000080,
       blue : 0x0000ff,
       teal : 0X008080,
       aqua : 0x00ffff
     };
     var reFontColorKeys = /^(black|silver|gray|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua)|$/;
     
     var getFontColor = function(elm){
       var colorStyle = computedStyle(elm,'color');
       if(colorStyle.indexOf('#') == 0){
         // #RRGGBBという形式の場合
         if(colorStyle.length > 4){
           return parseInt(colorStyle.substr(1),16);
         }else{
           // #RGBという形式の場合
           return parseInt(colorStyle.substr(1,1),16)*65536*16 + parseInt(colorStyle.substr(2,1),16)*256*16 + parseInt(colorStyle.substr(3,1),16)*16;
         }
       }
       if(colorStyle.indexOf('rgb') == 0){
         // rgb(r,g,b)という形式の場合
         var rgbArray = colorStyle.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)/);
         return parseInt(rgbArray[1],10)*65536 + parseInt(rgbArray[2],10)*256 + parseInt(rgbArray[3],10);
       }
       if(reFontColorKeys.test(colorStyle)){
         // カラーネームの場合
         return fontColorKeys[colorStyle];
       }
       // よく分からなかったら0
       return 0;
     };

     // font-family
     var getFontFamily = function(elm){
       // 基本はsans
       var fontFamilyStyle = computedStyle(elm,'fontFamily');
       if(fontFamilyStyle.indexOf('serif') != -1 && fontFamilyStyle.indexOf('sans-serif') == -1){
         return 'serif';
         
       }else{
         return 'sans';
       }
     };
     
     var baseParents = d.getElementsByTagName(tag+tag);
     for(var i=0,len=baseParents.length; i<len; i++){
       var elm = baseParents[i];
       elm._color = getFontColor(elm);
       elm._fontFamily = getFontFamily(elm);
     }
     
   }();
   
   // iframeや埋め込みオブジェクト関連の座標をセットする
   var setEmbedObjectInfo = function(){
     for(var i=0,len=embedObjects.length; i<len; i++){
       var elm = embedObjects[i];
       var point = getPoint(elm);
       elm._point = point;
       elm._width = elm.offsetWidth;
       elm._height = elm.offsetHeight;
     }
   }();
   
   // ↑でセットしたものを非表示にする。AS3から呼び出す
   meltdown3.removeEmbedbjects = function(){
     var result = [];
     for(var i=0,len=embedObjects.length; i<len; i++){
       var elm = embedObjects[i];
       elm.style.visibility = 'hidden';
       if(elm._width > 0 && elm._height > 0){
         result.push({x:elm._point.x - initScrollX, y:elm._point.y - initScrollY, width:elm._width, height:elm._height});
       }
     }
     return result;
   };
   
   // 画像の座標情報などをセットする
   var targetImageSrcs = [];
   meltdown3.targetImageSrcs = targetImageSrcs;
   var setImageInfo = function(){
     for(var i=0,len=targetImages.length; i<len; i++){
       var image = targetImages[i];
       image._image = true;
       image._src = image.src;
       image._width = image.width;
       image._height = image.height;
       image._centerX = image._point.x + image._width / 2;
       image._centerY = image._point.y + image._height / 2;
       image._id = i;
       targetImageSrcs.push(image._src);
     }
   }();
   
   // 全対象要素の配列を作る
   var allTargets = targetImages.concat(targetCharas);
   meltdown3.allTargets = allTargets;
   
   // ↑の配列をシャッフルする
   var shuffleAllTargets = function(){
     for(var i=0,len=allTargets.length; i<len; i++){
       var tmp = allTargets[i];
       var randomNum = Math.floor(Math.random()*len);
       allTargets[i] = allTargets[randomNum];
       allTargets[randomNum] = tmp;
     }
   }();
   
   //alert(allTargets.length);
   
   // アニメーション対象要素を一つずつ返す
   var getTargetElm = function(){
     var current = 0;
     var max = allTargets.length;
     
     return function getNext(){
       if(current >= max){
         return false;
       }
       return allTargets[current++];
     };
   }();
   
   // AS3にアニメーション要素を一つずつ返す
   meltdown3.transportElm = function(){
     var target = getTargetElm();
     if(target === false){
       return {end:true};
     }
     
     target.style.visibility = 'hidden';
     //console.log(target);

     if(target._character){
       return {chara:target.childNodes[0].data, x:target._centerX-initScrollX, y:target._centerY-initScrollY, color:target.parentNode._color, size:target._offsetHeight+1, family:target.parentNode._fontFamily};
     }
     
     if(target._image){
       return {width:target._width, height:target._height, x:target._centerX-initScrollX, y:target._centerY-initScrollY, id:target._id};
     }
     
     // ここに到達したらバグ
     return {end:true};
   };
   
   // Flash貼り付け
   addFlash();
   
 })();
