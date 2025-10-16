(function () {
  if (!location.pathname.match(/\/(\d{4}\/\d{2}\/|p\/)/)) return; 

  const ratingSection = document.querySelector(".ghRating-section");
  if (!ratingSection || typeof ghRatings === "undefined") return;

  const firebaseUrl = (ghRatings.firebaseUrl || "").replace(/\/$/, "");
  const avgScoreEl = ratingSection.querySelector("#avgScore");
  const starsAverageEl = ratingSection.querySelector("#starsAverage");
  const totalRatingEl = ratingSection.querySelector(".total-rating .total");
  const ratedCaption = ratingSection.querySelector(".rated-caption");
  const progressBars = ratingSection.querySelectorAll(".rating-progress");

  let fingerprint = '';
  let alreadyRated = false;
  let blogId = '';
  let postId = '';

  function getFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText(navigator.userAgent, 2, 2);
      return btoa(canvas.toDataURL()).slice(0, 32);
    } catch {
      return "anonymous";
    }
  }

  function getBloggerPostInfo(callback) {
    const interval = setInterval(() => {
      if (window._WidgetManager && typeof _WidgetManager._GetAllData === "function") {
        clearInterval(interval);
        try {
          const data = _WidgetManager._GetAllData();
          const blogKey = "BlogID_" + data.blog.blogId;
          const postKey = "PostID_" + data.blog.postId;
          callback(blogKey, postKey);
        } catch (err) {
          console.error("Không thể lấy BlogID/PostID:", err);
        }
      }
    }, 100);
  }

  function renderStars(average) {
    starsAverageEl.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      let percent = Math.min(100, Math.max(0, (average - i + 1) * 100));
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.innerHTML = `
        <defs>
          <linearGradient id="grad${i}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="${percent}%" stop-color="#e0ac33"/>
            <stop offset="${percent}%" stop-color="#ccc"/>
          </linearGradient>
        </defs>
        <path fill="url(#grad${i})" d="M12 .587l3.668 7.431L24 9.423l-6 5.849
        1.417 8.268L12 18.897 4.583 23.54 6 15.272 0 9.423l8.332-1.405z"/>
      `;
      starsAverageEl.appendChild(svg);

      svg.addEventListener("click", () => {
        if (!alreadyRated) {
          submitRating(i);
        }
      });
    }

    avgScoreEl.textContent = average.toFixed(1);
  }

  function updateUI(data) {
    const count = data?.count || 0;
    const sum = data?.sum || 0;
    const fingerprints = data?.fingerprints || {};
    const average = count ? sum / count : 0;

    renderStars(average);
    totalRatingEl.textContent = count;

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (let fp in fingerprints) {
      const rate = parseInt(fingerprints[fp]);
      if (rate >= 1 && rate <= 5) {
        ratingCounts[rate]++;
      }
    }

    progressBars.forEach(bar => {
      const rate = parseInt(bar.getAttribute("data-rate"));
      const countPerRate = ratingCounts[rate] || 0;
      const percentage = count ? ((countPerRate / count) * 100).toFixed(1) : 0;

      const barEl = bar.querySelector(".progress-bar");
      const votesEl = bar.querySelector(".votes");

      if (barEl) barEl.style.width = `${percentage}%`;
      if (votesEl) votesEl.textContent = countPerRate;
    });

    if (fingerprints[fingerprint]) {
      alreadyRated = true;
      ratedCaption.classList.remove("hidden");
    }
  }

  function fetchRating() {
    fetch(`${firebaseUrl}/ghRatings/${blogId}/${postId}.json`)
      .then(res => res.json())
      .then(updateUI);
  }

  function submitRating(value) {
    fetch(`${firebaseUrl}/ghRatings/${blogId}/${postId}.json`)
      .then(res => res.json())
      .then(data => {
        const count = data?.count || 0;
        const sum = data?.sum || 0;
        const fingerprints = data?.fingerprints || {};

        if (fingerprints[fingerprint]) return;

        const newData = {
          sum: sum + value,
          count: count + 1,
          fingerprints: {
            ...fingerprints,
            [fingerprint]: value
          }
        };

        return fetch(`${firebaseUrl}/ghRatings/${blogId}/${postId}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newData)
        });
      })
      .then(() => {
        alreadyRated = true;
        ratedCaption.classList.remove("hidden");
        fetchRating();
      });
  }

  // Bắt đầu
  fingerprint = getFingerprint();
  getBloggerPostInfo((blogKey, postKey) => {
    blogId = blogKey;
    postId = postKey;
    fetchRating();
  });
})();
