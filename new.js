(function () {
  const _0xaad755 = document.querySelector(".ghRating-section");
  if (!_0xaad755 || typeof ghRatings === "undefined" || ghRatings.sharedBy !== "prefer-ui.blogspot.com") {
    location.href = "https://prefer-ui.blogspot.com";
    return;
  } 
  const _0x460b87 = ghRatings.firebaseUrl.replace(/\/$/, '');
  const _0x3b4a0f = _0xaad755.querySelector("#avgScore");
  const _0xc2c27d = _0xaad755.querySelector("#starsAverage");
  const _0x5186a7 = _0xaad755.querySelector(".total-rating .total");
  const _0x23d87d = _0xaad755.querySelector(".rated-caption");
  const _0x408e4f = _0xaad755.querySelectorAll(".rating-progress");
  let _0x52917e = '';
  let _0x4b78f4 = false;
  let _0x4073b5 = '';
  let _0x338edf = '';
  function _0x2f1c2f() {
    try {
      const _0xc96537 = document.createElement("canvas");
      const _0x543b6a = _0xc96537.getContext("2d");
      _0x543b6a.textBaseline = "top";
      _0x543b6a.font = "14px Arial";
      _0x543b6a.fillText(navigator.userAgent, 0x2, 0x2);
      return btoa(_0xc96537.toDataURL()).slice(0x0, 0x20);
    } catch {
      return "anonymous";
    }
  }
  function _0x9a3a7f(a) {
    const _0x581212 = setInterval(() => {
      if (window._WidgetManager && typeof _WidgetManager._GetAllData === "function") {
        clearInterval(_0x581212);
        try {
          const _0x5ee171 = _WidgetManager._GetAllData();
          const _0xcbfeab = "BlogID_" + _0x5ee171.blog.blogId;
          const _0x253b28 = "PostID_" + _0x5ee171.blog.postId;
          a(_0xcbfeab, _0x253b28);
        } catch (_0x296b40) {
          console.error("Không thể lấy BlogID/PostID:", _0x296b40);
        }
      }
    }, 0x64);
  }
  function _0x326ce5(a) {
    _0xc2c27d.innerHTML = '';
    for (let _0x4e05fa = 0x1; _0x4e05fa <= 0x5; _0x4e05fa++) {
      let _0x1cfac3 = Math.min(0x64, Math.max(0x0, (a - _0x4e05fa + 0x1) * 0x64));
      const _0x5768df = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      _0x5768df.setAttribute("viewBox", "0 0 24 24");
      _0x5768df.innerHTML = "\n        <defs>\n          <linearGradient id=\"grad" + _0x4e05fa + "\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">\n            <stop offset=\"" + _0x1cfac3 + "%\" stop-color=\"#e0ac33\"/>\n            <stop offset=\"" + _0x1cfac3 + "%\" stop-color=\"#ccc\"/>\n          </linearGradient>\n        </defs>\n        <path fill=\"url(#grad" + _0x4e05fa + ")\" d=\"M12 .587l3.668 7.431L24 9.423l-6 5.849\n        1.417 8.268L12 18.897 4.583 23.54 6 15.272 0 9.423l8.332-1.405z\"/>\n      ";
      _0xc2c27d.appendChild(_0x5768df);
      _0x5768df.addEventListener("click", () => {
        if (_0x4b78f4) {
          return;
        }
        _0x426aba(_0x4e05fa);
      });
    }
    _0x3b4a0f.textContent = '' + a.toFixed(0x1);
  }
  function _0x549e43(a) {
    const _0x1a052f = a?.["count"] || 0x0;
    const _0x23971c = a?.["sum"] || 0x0;
    const _0x31b64b = a?.["fingerprints"] || {};
    const _0x3978c5 = _0x1a052f ? _0x23971c / _0x1a052f : 0x0;
    _0x326ce5(_0x3978c5);
    _0x5186a7.textContent = _0x1a052f;
    const _0x41c328 = {
      0x1: 0x0,
      0x2: 0x0,
      0x3: 0x0,
      0x4: 0x0,
      0x5: 0x0
    };
    for (let _0x2d4f6a in _0x31b64b) {
      const _0xb0671c = parseInt(_0x31b64b[_0x2d4f6a]);
      if (_0xb0671c >= 0x1 && _0xb0671c <= 0x5) {
        _0x41c328[_0xb0671c]++;
      }
    }
    _0x408e4f.forEach(_0x4f3b3d => {
      const _0x38c53b = parseInt(_0x4f3b3d.getAttribute("data-rate"));
      const _0x417734 = _0x41c328[_0x38c53b] || 0x0;
      const _0x193649 = _0x1a052f ? (_0x417734 / _0x1a052f * 0x64).toFixed(0x1) : 0x0;
      const _0x5087ed = _0x4f3b3d.querySelector(".progress-bar");
      const _0xc55d5f = _0x4f3b3d.querySelector(".votes");
      if (_0x5087ed) {
        _0x5087ed.style.width = _0x193649 + "%";
      }
      if (_0xc55d5f) {
        _0xc55d5f.textContent = _0x417734;
      }
    });
    if (_0x31b64b[_0x52917e]) {
      _0x4b78f4 = true;
      _0x23d87d.classList.remove("hidden");
    }
  }
  function _0x3ae138() {
    fetch(_0x460b87 + "/ghRatings/" + _0x4073b5 + "/" + _0x338edf + ".json").then(_0xdc9c76 => _0xdc9c76.json()).then(_0x549e43);
  }
  function _0x426aba(b) {
    fetch(_0x460b87 + "/ghRatings/" + _0x4073b5 + "/" + _0x338edf + ".json").then(_0x3ae13e => _0x3ae13e.json()).then(_0x17509f => {
      const _0x3d7946 = _0x17509f?.["count"] || 0x0;
      const _0x93aebb = _0x17509f?.["sum"] || 0x0;
      const _0x2e3428 = _0x17509f?.["fingerprints"] || {};
      if (_0x2e3428[_0x52917e]) {
        return;
      }
      const _0x1775f2 = {
        "sum": _0x93aebb + b,
        "count": _0x3d7946 + 0x1,
        "fingerprints": {
          ..._0x2e3428,
          [_0x52917e]: b
        }
      };
      return fetch(_0x460b87 + "/ghRatings/" + _0x4073b5 + "/" + _0x338edf + ".json", {
        "method": "PUT",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": JSON.stringify(_0x1775f2)
      });
    }).then(() => {
      _0x4b78f4 = true;
      _0x23d87d.classList.remove("hidden");
      _0x3ae138();
    });
  }
  _0x52917e = _0x2f1c2f();
  _0x9a3a7f((_0x3f0262, _0x184058) => {
    _0x4073b5 = _0x3f0262;
    _0x338edf = _0x184058;
    _0x3ae138();
  });
})();
